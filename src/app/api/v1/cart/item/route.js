import { NextResponse } from "next/server";
import { productModel } from "@/models/shop/product/Product";
import { cartModel } from "@/models/shop/product/Cart";
import { authenticationStatus } from "../../middleware/auth";
import cartDTOSchema from "./cartDTOSchema";
import mongoose from "mongoose";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400  }); }

  const parsed = cartDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 422  });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": retryAfter.toString() } });

  try {
    const { success: authenticated, vendor, data: user, db } = await authenticationStatus(request);
    if (!authenticated || !user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const Product = productModel(db);
    const Cart = cartModel(db);

    const { productId, variantId, quantity } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400  });

    const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId) })
      .select("title price variants hasVariants sellWithOutStock inventory otherMediaContents")
      .lean();

    if (!product) return NextResponse.json({ error: "Product not available" }, { status: 404  });

    let productBasePrice = product.price.base;
    if (product.hasVariants && variantId) {
      const variant = product.variants.find(v => v._id.toString() === variantId.toString());
      if (variant?.price?.base && variant.price.base > 0) productBasePrice = variant.price.base;
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId: user.userId });
    if (!cart) {
      cart = await Cart.create({ userId: user.userId, items: [], totals: { subtotal: 0, grandTotal: 0, discount: 0, tax: 0, deliveryCharge: 0 } });
    }

    // Check if item already exists in cart
    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId.toString() &&
      ((variantId && item.variantId?.toString() === variantId.toString()) || (!variantId && !item.variantId))
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].total = cart.items[itemIndex].quantity * productBasePrice;
    } else {
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        variantId: variantId ? new mongoose.Types.ObjectId(variantId) : undefined,
        quantity,
        total: quantity * productBasePrice,
        isSelected: true
      });
    }

    const selectedItems = cart.items.filter(i => i.isSelected);
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
    const grandTotal = subtotal - cart.totals.discount + cart.totals.tax + cart.totals.deliveryCharge;

    cart.totals.subtotal = subtotal;
    cart.totals.grandTotal = grandTotal;
    cart.lastUpdated = new Date();

    await cart.save();

    return NextResponse.json({
      success: true,
      cartId: cart._id,
      message: "Item added to cart",
      itemCount: cart.items.length
    }, { status: 200  });

  } catch (error) {
    console.error("POST /cart error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500  });
  }
}




















// import { NextResponse } from "next/server";
// import { dbConnect } from "@/lib/mongodb/db";
// import { productModel } from "@/models/shop/product/Product";
// import { cartModel } from "@/models/shop/product/Cart";
// import { decrypt } from "@/lib/encryption/cryptoEncryption";
// import securityHeaders from "../../utils/securityHeaders";
// import { authenticationStatus } from "../../middleware/auth";
// import cartDTOSchema from "./cartDTOSchema";
// import { inventoryReservationModel } from "@/models/shop/product/InventoryReservation";
// import cuid from "@bugsnag/cuid";
// import mongoose from "mongoose";
// import config from "../../../../../../config";
// import { userModel } from "@/models/shop/shop-user/ShopUser"

// export async function PATCH(request) {
//   let body;
//   try { body = await request.json() }
//   catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400  }) }

//   const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
//   // const fingerprint = request.headers.get('x-fingerprint') || null;

//   // if (!fingerprint)
//   //   return NextResponse.json({ error: "Invalid request" }, { status: 400 });

//   const vendorId = request.headers.get('x-vendor-identifier');
//   const host = request.headers.get('host');
//   const userAgent = request.headers.get('user-agent')
//   if (!vendorId && !host)
//     return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

//   const parsed = cartDTOSchema.safeParse(body);
//   if (!parsed.success) {
//     return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 422  });
//   }

//   const { success: authenticated, vendor, data: user, isTokenRefreshed, token, db } = await authenticationStatus(request);
//   console.log("**************************************************************")
//   console.log(authenticated)
//   console.log(vendor)
//   console.log(user)
//   if (!authenticated || (authenticated && !user?.userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   // 🟢 RATE LIMIT CHECK
//   // try {
//   //   const authKey = `auth:${ip}:${fingerprint}`;
//   //   const guestKey = `guest:${fingerprint || ip}`;
//   //   if (authenticated) 
//   //     await authLimiter.consume(authKey); // Key must be unique per user/device
//   //   else 
//   //     await guestLimiter.consume(guestKey); // Use fingerprint or fallback to IP    
//   // } catch (rateLimiterRes) {
//   //   return NextResponse.json({ error: 'Too many requests' }, { status: 429,headers: {...securityHeaders,'Retry-After': rateLimiterRes.msBeforeNext / 1000,},});
//   // }

//   // ✅ Connect to Vendor DB
//   const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
//   if (!DB_URI_ENCRYPTION_KEY) {
//     console.log("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
//     return NextResponse.json({ success: false, error: "Missing encryption key" }, { status: 500  });
//   }

//   const dbUri = await decrypt({
//     cipherText: vendor.dbInfo.dbUri,
//     options: { secret: config.vendorDbUriEncryptionKey }
//   });

//   // const dbKey = `${vendor.dbInfo.prefix}${vendor._id}`;
//   const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });

//   const ProductModel = productModel(shop_db);
//   const CartModel = cartModel(shop_db);

//   const { productId, variantId, quantity, action } = parsed.data;
//   console.log(productId, variantId, quantity, action)
//   // 🔎 1. Get Product
//   console.log("Incoming productId:", productId);

//   const product = await ProductModel.findOne({ _id: new mongoose.Types.ObjectId(productId) })
//     .select("title price variants inventory hasVariants")
//     .lean();

//   console.log("Product found:", product);
//   if (!product)
//     return NextResponse.json({ error: "Product not available" }, { status: 404  });

//   // 🔍 2. Handle Variant if applicable
//   let variant = null;

//   if (product.hasVariants) {
//     // Product has variants: variantId is required
//     if (!variantId) {
//       return NextResponse.json({ success: false, error: "Variant ID required" }, { status: 422  });
//     }

//     variant = product.variants.find(item => item._id.toString() === variantId.toString());
//     if (!variant) {
//       return NextResponse.json({ success: false, error: "Invalid variant" }, { status: 422  });
//     }
//   } else {
//     // Product has no variants: ignore variantId if provided
//     variant = null;
//   }

//   const InventoryReservationModel = inventoryReservationModel(shop_db)
//   const reservations = await InventoryReservationModel.find({ productId: product._id, variantId: variant._id, status: 'reserved', expiry: { $gt: Date.now() } })
//     .lean();
//   const totalReservedQuentity = reservations.reduce((sum, r) => sum + (r.quantity || 0), 0)

//   // 📦 3. Get Stock
//   const inventory = variant?.inventory || product.inventory;
//   const stock = inventory.quantity - totalReservedQuentity;

//   // 💰 4. Price Info
//   const itemPrice = variant?.price || product.price;
//   const price = {
//     basePrice: itemPrice.base,
//     currency: itemPrice.currency || 'BDT',
//   };
//   const delta = ['inc', '+'].includes(action) ? quantity : -quantity;

//   // 🛒 5. Find or Create Cart
//   let cart;
//   if (authenticated && user?.userId) {
//     // Authenticated: search by userId
//     cart = await CartModel.findOne({ userId: user.userId });
//   }
//   // else if (!authenticated && fingerprint) {
//   //   // Guest: search by fingerprint only
//   //   cart = await CartModel.findOne({ userId: { $exists: false }, fingerprint });

//   // }

//   if (!cart) {
//     cart = new CartModel({
//       userId: authenticated ? user.userId : undefined,
//       // fingerprint,
//       // isGuest: !authenticated,
//       items: [],
//       ip,
//       userAgent,
//       expiresAt: new Date(Date.now() + (1 * 24 * 60 * 60 * 1000))
//     });
//   }

//   // 🔄 6. Update/Add/Remove Item
//   const itemIndex = cart.items.findIndex(item =>
//     item.productId.toString() === product._id.toString() &&
//     ((variant && item.variantId?.toString() === variant._id.toString()) || (!variant && !item.variantId))
//   );

//   if (itemIndex > -1) {
//     const existingItem = cart.items[itemIndex];
//     const newQty = existingItem.quantity + delta;

//     if (newQty <= 0) {
//       cart.items.splice(itemIndex, 1);
//     } else {
//       if (newQty > stock)
//         return NextResponse.json({ error: "Not enough stock available" }, { status: 422  });

//       existingItem.quantity = newQty;
//       existingItem.subtotal = newQty * price.basePrice;
//     }
//   } else {
//     if (delta > 0) {
//       if (delta > stock) {
//         return NextResponse.json({ error: "Not enough stock available" }, { status: 422  });
//       }
//       cart.items.push({
//         productId: product._id,
//         variantId: variant?._id,
//         quantity: delta,
//         price,
//         subtotal: delta * price.basePrice,
//         userId: authenticated ? user.userId : undefined,
//       });
//     } else {
//       return NextResponse.json({ error: "Item not found in cart" }, { status: 404  });
//     }
//   }

//   // 💾 7. Save Cart
//   cart.lastUpdated = new Date();
//   cart.totals.subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
//   // cart.totals.grandTotal = cart.totals.subtotal - (cart.totals.discount        || 0)      +
//   //                                                 (cart.totals.tax             || 0)      +
//   //                                                 (cart.totals.deliveryCharge  || 0);
//   const savedCart = await cart.save();

//   if (authenticated && user?.userId) {
//     console.log("kjsdksjdajsds")
//     const UserModel = userModel(shop_db);
//     const updatedUser = await UserModel.updateOne(
//       { _id: user.userId },
//       { $set: { cart: savedCart._id } }
//     );
//     console.log("User updated with cart:", updatedUser);

//   }


//   const CART_RESERVATION_TTL_MINUTES = parseInt(process.env.END_USER_CART_RESERVATION_TTL_MINUTES || '15', 10)
//   const expiryTime = Date.now() + (CART_RESERVATION_TTL_MINUTES * 60 * 1000);
//   const existingReservations = await InventoryReservationModel.find({ cartId: savedCart._id }).lean();

//   const updatedReservations = [];
//   const newReservations = [];

//   for (const item of savedCart.items) {
//     const existing = existingReservations.find(
//       r => r.productId.toString() === item.productId.toString() &&
//         ((!item.variantId && !r.variantId) || (item.variantId && r.variantId?.toString() === item.variantId.toString()))
//     );

//     if (existing) {
//       updatedReservations.push({
//         filter: { _id: existing._id },
//         update: { $set: { quantity: item.quantity, expiry: expiryTime } },
//       });
//     } else {
//       newReservations.push({
//         reservationId: cuid(),
//         productId: item.productId,
//         variantId: item.variantId,
//         cartId: savedCart._id,
//         userId: savedCart.userId,
//         // fingerprint: savedCart.fingerprint,
//         quantity: item.quantity,
//         expiry: expiryTime,
//         status: 'reserved',
//         originalPrice: item.price.basePrice,
//         reservedPrice: item.price.basePrice,
//       });
//     }
//   }

//   // Apply updates
//   await Promise.all(
//     updatedReservations.map(r =>
//       InventoryReservationModel.updateOne(r.filter, r.update)
//     )
//   );

//   // Insert new ones
//   if (newReservations.length > 0) {
//     await InventoryReservationModel.insertMany(newReservations);
//   }
//   // ✅ 8. Return Updated Cart Summary
//   const response = NextResponse.json({
//     success: true,
//     cartId: savedCart.cartId,
//     message: "Cart updated",
//     itemCount: savedCart.items.length,
//   }, { status: 200  });

//   return response
// }