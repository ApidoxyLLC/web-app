import     { NextResponse }     from "next/server";
import       { dbConnect }      from "@/app/lib/mongodb/db";
import      { productModel }    from "@/models/shop/product/Product";
import       { cartModel }      from "@/models/shop/product/Cart";
import        { decrypt }       from "@/lib/encryption/cryptoEncryption";
import      securityHeaders     from "../../utils/securityHeaders";
import { authenticationStatus } from "../../middleware/auth";
import       cartDTOSchema      from "./cartDTOSchema";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import   { RateLimiterMemory }  from "rate-limiter-flexible";
export const dynamic = 'force-dynamic'; 

// Rate limiter configuration
const authLimiter = new RateLimiterMemory({
  points: 10,             // 10 operations
  duration: 60,           // per 60 seconds
  keyPrefix: 'auth',      // prefix for Redis or Memory keys
});

// Guest user limiter
const guestLimiter = new RateLimiterMemory({
  points: 5,              // 5 operations
  duration: 60,           // per 60 seconds
  keyPrefix: 'guest',
});

export async function PATCH(request) {
  let body;
  try   { body = await request.json() } 
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders }) }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;

  if (!fingerprint)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  const userAgent = request.headers.get('user-agent')
  if (!vendorId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  const parsed = cartDTOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 422, headers: securityHeaders });
  }

  const { success: authenticated, shop, data: user, isTokenRefreshed, token } = await authenticationStatus(request);

  // 🟢 RATE LIMIT CHECK
  try {
    const authKey = `auth:${ip}:${fingerprint}`;
    const guestKey = `guest:${fingerprint || ip}`;
    if (authenticated) 
      await authLimiter.consume(authKey); // Key must be unique per user/device
     else 
      await guestLimiter.consume(guestKey); // Use fingerprint or fallback to IP    
  } catch (rateLimiterRes) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429,headers: {...securityHeaders,'Retry-After': rateLimiterRes.msBeforeNext / 1000,},});
  }

  // ✅ Connect to Vendor DB
  const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
  if (!DB_URI_ENCRYPTION_KEY) {
    console.log("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
    return NextResponse.json({ success: false, error: "Missing encryption key" }, { status: 500, headers: securityHeaders });
  }

  const dbUri = await decrypt({
    cipherText: shop.dbInfo.uri,
    options: { secret: DB_URI_ENCRYPTION_KEY },
  });
  const dbKey = `${shop.dbInfo.prefix}${shop._id}`;
  const vendor_db = await dbConnect({ dbKey, dbUri });

  const ProductModel = productModel(vendor_db);
  const CartModel = cartModel(vendor_db);

  const { productId, variantId, quantity, action } = parsed.data;

  // 🔎 1. Get Product
  const product = await ProductModel.findOne({ productId })
    .select("title price variants inventory hasVariants")
    .lean();

  if (!product)
    return NextResponse.json({ error: "Product not available" }, { status: 404, headers: securityHeaders });

  // 🔍 2. Handle Variant if applicable
  let variant;
  if (variantId) {
    variant = product.variants.find(item => item.variantId === variantId);
    if (!product.hasVariants || !variant) 
      return NextResponse.json({ success: false, error: "Invalid variant" }, { status: 422, headers: securityHeaders });
  }

  // 📦 3. Get Stock
  const inventory = variant?.inventory || product.inventory;
  const stock = inventory.quantity - inventory.reserved;

  // 💰 4. Price Info
  const itemPrice = variant?.price || product.price;
  const price = {
    basePrice: itemPrice.base,
    currency: itemPrice.currency || 'BDT',
  };
  const delta = ['inc', '+'].includes(action) ? quantity : -quantity;

  // 🛒 5. Find or Create Cart
  let cart;
  if (authenticated && user?._id) {
    // Authenticated: search by userId
    cart = await CartModel.findOne({ userId: user._id });
  } else if (!authenticated && fingerprint) {
    // Guest: search by fingerprint only
    cart = await CartModel.findOne({ userId: { $exists: false }, fingerprint });

  }

  if (!cart) {
    // 🆕 Create new guest cart only if none found
    cart = new CartModel({
      userId: authenticated ? user._id : undefined,
      fingerprint,
      isGuest: !authenticated,
      items: [],
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + (1 * 24 * 60 * 60 * 1000))
    });
  }



  // 🔄 6. Update/Add/Remove Item
  const itemIndex = cart.items.findIndex(item =>
    item.productId.toString() === product._id.toString() &&
    ((variant && item.variantId?.toString() === variant._id.toString()) || (!variant && !item.variantId))
  );

  if (itemIndex > -1) {
    const existingItem = cart.items[itemIndex];
    const newQty = existingItem.quantity + delta;

    if (newQty <= 0) {
      cart.items.splice(itemIndex, 1); // 🟥 Remove item
    } else {
      if (newQty > stock)
        return NextResponse.json({ error: "Not enough stock available" }, { status: 422, headers: securityHeaders });

      existingItem.quantity = newQty;
      existingItem.subtotal = newQty * price.basePrice;
    }
  } else {
    if (delta > 0) {
      if (delta > stock) {
        return NextResponse.json({ error: "Not enough stock available" }, { status: 422, headers: securityHeaders });
      }
      cart.items.push({
        productId: product._id,
        variantId: variant?._id,
        quantity: delta,
        price,
        subtotal: delta * price.basePrice,
      });
    } else {
      return NextResponse.json({ error: "Item not found in cart" }, { status: 404, headers: securityHeaders });
    }
  }

  // 💾 7. Save Cart
  cart.lastUpdated = new Date();
  cart.totals.subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  // cart.totals.grandTotal = cart.totals.subtotal - (cart.totals.discount        || 0)      +
  //                                                 (cart.totals.tax             || 0)      +
  //                                                 (cart.totals.deliveryCharge  || 0);
  const savedCart = await cart.save();

  // ✅ 8. Return Updated Cart Summary
  const response = NextResponse.json( { success: true,
                                           cartId: savedCart.cartId,
                                          message: "Cart updated",
                                        itemCount: savedCart.items.length,
                                      }, { status: 200, headers: securityHeaders } );

  if (authenticated && isTokenRefreshed && token) {
      const  ACCESS_TOKEN_EXPIRY = Number(shop.timeLimitations?.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
      const REFRESH_TOKEN_EXPIRY = Number(shop.timeLimitations?.REFRESH_TOKEN_EXPIRE_MINUTES) || 1440;
      const    accessTokenExpiry = minutesToExpiryTimestamp(ACCESS_TOKEN_EXPIRY)
      const   refreshTokenExpiry = minutesToExpiryTimestamp(REFRESH_TOKEN_EXPIRY)

      response.cookies.set('access_token', token.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          maxAge: Math.floor((accessTokenExpiry - Date.now()) / 1000),
      });
      response.cookies.set('refresh_token', token.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          path: '/',
          maxAge: Math.floor((refreshTokenExpiry - Date.now()) / 1000),
      });
  }
  return response
}