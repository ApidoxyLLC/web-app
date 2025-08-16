import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { cartModel } from "@/models/shop/product/Cart";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import securityHeaders from "../utils/securityHeaders";
import { authenticationStatus } from "../middleware/auth";

export const dynamic = 'force-dynamic';


export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;

  if (!fingerprint) 
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: securityHeaders });

  const vendorId = request.headers.get('x-vendor-identifier');
  const     host = request.headers.get('host');
  
  if (!vendorId && !host) 
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400, headers: securityHeaders });


  const { success: authenticated, shop, data: user, isTokenRefreshed, token } = await authenticationStatus(request);

  // Connect to Vendor DB
  const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
  if (!DB_URI_ENCRYPTION_KEY) {
    console.log("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
    return NextResponse.json({ success: false, error: "Missing encryption key" }, { status: 500, headers: securityHeaders });
  }

  const     dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                       options: { secret: DB_URI_ENCRYPTION_KEY } });
  const     dbKey = `${shop.dbInfo.prefix}${shop._id}`;
  const vendor_db = await dbConnect({ dbKey, dbUri });
  const CartModel = cartModel(vendor_db);

  let cart;
  if (authenticated && user?._id) {
    // Search by userId for authenticated users
    cart = await CartModel.findOne({ userId: user._id })
                          .select(  "+cartId "                  +
                                    "+userId"                   +
                                    "+items"                    +
                                    "+isGuest"                  +
                                    "+fingerprint"              +
                                    "+ip"                       +
                                    "+userAgent"                +
                                    "+expiresAt"                +
                                    "+totals"                   +  
                                    "+totals.subtotal"          +
                                    "+totals.discount"          +
                                    "+totals.tax"               +
                                    "+totals.deliveryCharge"    +
                                    "+totals.grandTotal" 
                                )
                          .lean()
  } else if (fingerprint) {
    // Search by fingerprint for guest users
    cart = await CartModel.findOne({ userId: { $exists: false }, fingerprint })
                          .select(  "+cartId "                  +
                                    "+userId"                   +
                                    "+items"                    +
                                    "+isGuest"                  +
                                    "+fingerprint"              +
                                    "+ip"                       +
                                    "+userAgent"                +
                                    "+expiresAt"                +
                                    "+totals"                   +  
                                    "+totals.subtotal"          +
                                    "+totals.discount"          +
                                    "+totals.tax"               +
                                    "+totals.deliveryCharge"    +
                                    "+totals.grandTotal" 
                                )
                          .lean()
  }

  if (!cart) 
    return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404, headers: securityHeaders } );
  

const productIdsInCart = cart.items.map(item => item.productId).filter(Boolean);

// 🟡 2. Fetch productId from Product collection
const ProductModel = productModel(vendor_db); // Ensure this exists if not already
const products = await ProductModel.find({ _id: { $in: productIdsInCart } })
                                   .select('_id productId')
                                   .lean();
const productIdMap = new Map(products.map(p => [p._id.toString(), p.productId]));
  // Prepare response data
  const responseData = {
    success: true,
    data: {    cartId: cart.cartId,
              isGuest: cart.isGuest,
            itemCount: cart.items.length,
               totals: cart.totals,
            expiresAt: cart.expiresAt,
                items: cart.items.map(item => {
                                    const           rawId = rawId = item.productId?.toString?.(); // Mongo _id
                                    const publicProductId = productIdMap.get(rawId) || null;
                                        return {
                                              productId: publicProductId,
                                           productTitle: item.productId?.title,
                                              variantId: item.variantId?._id,
                                            variantName: item.variantId?.name,
                                               quantity: item.quantity,
                                                  price: item.price,
                                               subtotal: item.subtotal,
                                                  image: item.productId?.images?.[0] || null,
                                                  stock: item.variantId
                                                            ? item.variantId.inventory.quantity - item.variantId.inventory.reserved
                                                            : item.productId.inventory.quantity - item.productId.inventory.reserved,
                                            };
                                    }),
        }
  };

  return NextResponse.json(responseData, { status: 200, headers: securityHeaders });

}