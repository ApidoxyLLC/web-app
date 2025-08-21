import { NextResponse } from "next/server";
import { cartModel } from "@/models/shop/product/Cart";
import { productModel } from "@/models/shop/product/Product";
import securityHeaders from "../utils/securityHeaders";
import { authenticationStatus } from "../middleware/auth";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";

export async function GET(request) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.headers["x-real-ip"] || request.socket?.remoteAddress || "";

  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": retryAfter.toString() } });

  const { success: authenticated, vendor, data, isTokenRefreshed, token, db } = await authenticationStatus(request);
  if (!authenticated) return NextResponse.json({ error: "Unauthorized..." }, { status: 400 });

  // console.log(authenticated)
  // console.log(data)
  // console.log(vendor)


  //   const CartModel = cartModel(db);

  //   const cart= await CartModel.findOne({ userId: data?.userId })
  //                           .select(  "cartId "                  +
  //                                     "userId"                   +
  //                                     "items"                    +
  //                                     "isGuest"                  +
  //                                     "fingerprint"              +
  //                                     "ip"                       +
  //                                     "userAgent"                +
  //                                     "expiresAt"                +
  //                                     "totals"                   +  
  //                                     "totals.subtotal"          +
  //                                     "totals.discount"          +
  //                                     "totals.tax"               +
  //                                     "totals.deliveryCharge"    +
  //                                     "totals.grandTotal" 
  //                                 )
  //                           .lean()

  //   if (!cart) 
  //     return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404, headers: securityHeaders } );


  // const productIdsInCart = cart.items.map(item => item.productId).filter(Boolean);

  // // 🟡 2. Fetch productId from Product collection
  // const ProductModel = productModel(db); 
  // const products = await ProductModel.find({ _id: { $in: productIdsInCart } })
  //                                    .select('_id productId')
  //                                    .lean();
  // const productIdMap = new Map(products.map(p => [p._id.toString(), p.productId]));
  //   // Prepare response data
  //   const responseData = {
  //     success: true,
  //     data: {    cartId: cart.cartId,
  //               isGuest: cart.isGuest,
  //             itemCount: cart.items.length,
  //                totals: cart.totals,
  //             expiresAt: cart.expiresAt,
  //                 items: cart.items.map(item => {
  //                                     const           rawId = rawId = item.productId?.toString?.(); // Mongo _id
  //                                     const publicProductId = productIdMap.get(rawId) || null;
  //                                         return {
  //                                               productId: publicProductId,
  //                                            productTitle: item.productId?.title,
  //                                               variantId: item.variantId?._id,
  //                                             variantName: item.variantId?.name,
  //                                                quantity: item.quantity,
  //                                                   price: item.price,
  //                                                subtotal: item.subtotal,
  //                                                   image: item.productId?.images?.[0] || null,
  //                                                   stock: item.variantId
  //                                                             ? item.variantId.inventory.quantity - item.variantId.inventory.reserved
  //                                                             : item.productId.inventory.quantity - item.productId.inventory.reserved,
  //                                             };
  //                                     }),
  //         }
  //   };

  const CartModel = cartModel(db);

  const [cart] = await CartModel.aggregate([
    // 1. Match the cart
    { $match: { userId: new mongoose.Types.ObjectId(data?.userId) } },


    // 2. Lookup products
    {
      $lookup: {
        from: "products", // collection name for products
        localField: "items.productId",
        foreignField: "_id",
        as: "productDocs"
      }
    },

    // 3. Add product details inline
    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              quantity: "$$item.quantity",
              price: "$$item.price",
              subtotal: "$$item.subtotal",
              variantId: "$$item.variantId",

              // Match product
              product: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$productDocs",
                      as: "prod",
                      cond: { $eq: ["$$prod._id", "$$item.productId"] }
                    }
                  },
                  0
                ]
              }
            }
          }
        }
      }
    },

    // 4. Extract exact variant data
    {
      $addFields: {
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              productId: "$$item.product.productId",   // public productId
              productTitle: "$$item.product.title",
              variantId: "$$item.variantId",
              variant: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$$item.product.variants",
                      as: "v",
                      cond: { $eq: ["$$v._id", "$$item.variantId"] }
                    }
                  },
                  0
                ]
              },
              quantity: "$$item.quantity",
              price: "$$item.price",
              subtotal: "$$item.subtotal",
              image: { $arrayElemAt: ["$$item.product.images", 0] },
              stock: {
                $cond: [
                  { $ifNull: ["$$item.variantId", false] },
                  { $subtract: ["$$item.variant.inventory.quantity", "$$item.variant.inventory.reserved"] },
                  { $subtract: ["$$item.product.inventory.quantity", "$$item.product.inventory.reserved"] }
                ]
              }
            }
          }
        }
      }
    },

    // 5. Final shape
    {
      $project: {
        cartId: 1,
        isGuest: 1,
        expiresAt: 1,
        totals: 1,
        itemCount: { $size: "$items" },
        items: {
          productId: 1,
          productTitle: 1,
          variantId: 1,
          "variant.name": 1,
          quantity: 1,
          price: 1,
          subtotal: 1,
          image: 1,
          stock: 1
        }
      }
    }
  ]);

  if (!cart) return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404, headers: securityHeaders });
  return NextResponse.json({ success: true, data: cart }, { headers: securityHeaders });

}