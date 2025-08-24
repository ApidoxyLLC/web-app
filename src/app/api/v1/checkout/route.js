import { NextResponse } from "next/server";
import { productModel } from "@/models/shop/product/Product";
import { cartModel } from "@/models/shop/product/Cart";
import securityHeaders from "../../utils/securityHeaders";
import { authenticationStatus } from "../middleware/auth";
import mongoose from "mongoose";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";

const MAX_TRANSACTION_RETRIES = 3;
const RETRY_DELAY_MS = 200;

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             request.socket?.remoteAddress || '';

  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed)  return NextResponse.json({ error: 'Too many requests. Try later.' },  { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

  const parsed = orderDTOSchema.safeParse(body);
  if (!parsed.success) 
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { shippingMethod, shippingAddress, paymentMethod } = parsed.data;

  const { success: authenticated, shop, data, isTokenRefreshed, token, db } = await authenticationStatus(request);
  const user = data || null;
  if (!authenticated || !user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const CartModel = cartModel(db);
    const OrderModel = orderModel(db);
    const ProductModel = productModel(db);

    let savedOrder;
    let retryCount = 0;
    let lastError;

    const [cart] = await CartModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(user._id) } },
            { $unwind: "$items" },
            { $match: { "items.isSelected": true } },
            {
              $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product"
              }
            },
            { $unwind: "$product" },
            {
              $addFields: {
                matchedVariant: {
                  $first: {
                    $filter: {
                      input: "$product.variants",
                      as: "variant",
                      cond: { $eq: ["$$variant._id", "$items.variantId"] }
                    }
                  }
                },
                "items.price.basePrice": {
                  $cond: [
                    { $ifNull: ["$items.variantId", false] },
                    "$matchedVariant.price.base",
                    "$product.price.base"
                  ]
                }
              }
            },
            {
              $addFields: {
                "items.product": "$product",
                "items.variant": "$matchedVariant"
              }
            },
            { $project: { product: 0, matchedVariant: 0 } },
            {
              $group: {
                _id: "$_id",
                userId: { $first: "$userId" },
                currency: { $first: "$currency" },
                totals: { $first: "$totals" },
                items: { $push: "$items" }
              }
            },
            { $limit: 1 }
          ]);

    while (retryCount < MAX_TRANSACTION_RETRIES) {
      const session = await db.startSession();
      try {
        await session.withTransaction(async () => {
          if (!cart) throw new Error("Cart not found");
          if (!cart.items?.length) throw new Error("Cart is empty");

          // Step 2: Calculate totals
          const subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
          const discount = cart.totals?.discount || 0;
          const tax = cart.totals?.tax || 0;
          const deliveryCharge = cart.totals?.deliveryCharge || 0;
          const grandTotal = subtotal - discount + tax + deliveryCharge;

          // Step 3: Map cart items to order items
          const orderItems = cart.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.product.title,
            variantName: item.variant?.options?.join(",") || null,
            quantity: item.quantity,
            price: {
              basePrice: item.price.basePrice,
              currency: item.price.currency || cart.currency,
              final: item.price.basePrice
            },
            total: item.total,
            isSelected: item.isSelected
          }));

          // Step 4: Create Order document
          savedOrder = await OrderModel.create([{
            userId: user._id,
            cartId: cart._id,
            items: orderItems,
            totals: { subtotal, discount, tax, deliveryCharge, grandTotal, currency: cart.currency },
            shipping: { address: shippingAddress, method: shippingMethod, cost: deliveryCharge },
            payment: { method: paymentMethod, status: paymentMethod === 'cod' ? 'pending' : 'processing' },
            discounts: cart.discounts || [],
            fingerprint: cart.fingerprint,
            ip: cart.ip || ip,
            userAgent: request.headers.get('user-agent'),
            placedAt: new Date(),
            orderStatus: "pending_payment"
          }], { session });

          // Step 5: Clear cart
          await CartModel.updateOne(
            { _id: cart._id },
            {
              $set: {
                items: [],
                totals: { subtotal: 0, discount: 0, tax: 0, deliveryCharge: 0, grandTotal: 0 },
                lastUpdated: new Date()
              }
            },
            { session }
          );

        }, { readConcern: { level: 'local' }, writeConcern: { w: 'majority' } });

        break; // success, exit retry loop

      } catch (error) {
        lastError = error;
        retryCount++;
        if (retryCount >= MAX_TRANSACTION_RETRIES) throw error;
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS * retryCount));
      } finally {
        await session.endSession();
      }
    }

    return NextResponse.json({ success: true, data: savedOrder, message: "Order placed successfully" }, { status: 201, headers: securityHeaders });

  } catch (error) {
    console.error("Order processing error:", error);
    if (error.message.includes("Cart")) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error.message.includes("empty")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Order processing failed. Please try again." }, { status: 500 });
  }
}
