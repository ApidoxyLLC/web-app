import { NextResponse } from "next/server";
import { productModel } from "@/models/shop/product/Product";
import { cartModel } from "@/models/shop/product/Cart";
import securityHeaders from "../../../utils/securityHeaders";
import { authenticationStatus } from "../../../middleware/auth";
import cartDTOSchema from "./cartDTOSchema";
import mongoose from "mongoose";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";

// import { authenticationStatus } from "../../middleware/auth";
// import config from "../../../../../../config";

export async function PATCH(request, { params }) {
  const { productId } = await params;
  let body;
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders }) }

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400, headers: securityHeaders });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  // const userAgent = request.headers.get('user-agent')

  const parsed = cartDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, { status: 422, headers: securityHeaders });

  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": retryAfter.toString() } });

  try {
    const { success: authenticated, vendor, data: user, db } = await authenticationStatus(request);
    if (!authenticated || (authenticated && !user?.userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const Product = productModel(db);
    const Cart = cartModel(db);

    const { variantId, quantity, action } = parsed.data;
    // console.log(productId, variantId, quantity, action)

    const cart = await Cart.findOne({ userId: user?.userId })
    if (!cart) return NextResponse.json({ error: "Not found " }, { status: 404, headers: securityHeaders });

    const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId) })
      .select("title price variants inventory hasVariants otherMediaContents hasFreeShipment sellWithOutStock digitalAssets")
      .lean();
    if (!product) return NextResponse.json({ error: "Product not available" }, { status: 404, headers: securityHeaders });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId.toString() &&
      ((variantId && item.variantId?.toString() === variantId.toString()) ||
        (!variantId && !item.variantId))
    );
    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found in cart" }, { status: 404, headers: securityHeaders });
    }
    const item = cart.items[itemIndex];

    let newUpdatedQuantity = item.quantity
    if (action == '+' || action === 'inc') { newUpdatedQuantity = item.quantity + quantity }
    if (action === '-' || action === 'dec') newUpdatedQuantity = Math.max(0, item.quantity - quantity);


    let productBasePrice = product.price.base; 
    if (product.hasVariants && variantId) {
      const variant = product.variants.find(v => v._id.toString() === variantId.toString());
      if (variant) {
        if (variant.price?.base && variant.price.base > 0) {
          productBasePrice = variant.price.base;
        }
      }
    }


    const otherCartItems = cart.items.filter(it => {
      if (!it.isSelected) return false;
      if (it.productId.toString() === productId) {
        if (variantId) return it.variantId?.toString() !== variantId.toString();
        return !!it.variantId;
      }
      return true;
    });


    const updatedIsSelected = (action === 'checked'
      ? true
      : action === 'unchecked'
        ? false
        : item.isSelected);

    const updatedItemTotal = (action === 'checked' || action === 'unchecked')
      ? item.total
      : productBasePrice * newUpdatedQuantity

    const otherProductsTotal = otherCartItems.reduce((sum, item) => sum + item.total, 0);

    const subtotal = otherProductsTotal + (updatedIsSelected ? updatedItemTotal : 0);
    const grandTotal = ((subtotal - cart.totals.discount) + cart.totals.tax + cart.totals.deliveryCharge);

    const isQuantityAction = ['+', '-', 'inc', 'dec'].includes(action);

    const updatedCart = await Cart.findOneAndUpdate({
      _id: cart._id,
      'items.productId': new mongoose.Types.ObjectId(productId),
      ...(variantId ? {
        'items.variantId': new mongoose.Types.ObjectId(variantId)
      }
        : { 'items.variantId': { $exists: false } })
    },
      {
        $set: {
          'items.$[elem].quantity': isQuantityAction ? newUpdatedQuantity : item.quantity,
          'items.$[elem].total': isQuantityAction ? productBasePrice * newUpdatedQuantity : item.total,
          'totals.subtotal': subtotal,
          'totals.grandTotal': grandTotal,
          'items.$[elem].isSelected': (action === 'checked'
            ? true
            : action === 'unchecked'
              ? false
              : newUpdatedQuantity > 0),

          lastUpdated: new Date()
        }
      },
      {
        arrayFilters: [
          {
            'elem.productId': new mongoose.Types.ObjectId(productId),
            ...(variantId
              ? { 'elem.variantId': new mongoose.Types.ObjectId(variantId) }
              : { 'elem.variantId': { $exists: false } })
          }
        ],
        new: true
      }
    );

    const response = NextResponse.json({
      success: true,
      cartId: updatedCart._id,
      message: "Cart updated",
      itemCount: updatedCart.items.length
    }, { status: 200, headers: securityHeaders });
    return response
  } catch (error) {
    console.log("PATCH /cart error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function DELETE(request, { params }) {
  const { productId } = await params;
  let body;
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders }) }

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400, headers: securityHeaders });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown_ip";
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": retryAfter.toString() } } );
  try {
    const { success: authenticated, vendor, data: user, db } = await authenticationStatus(request);
    if (!authenticated || (authenticated && !user?.userId))  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const Cart = cartModel(db);
    const Product = productModel(db);
    const { variantId } = body;

    // find cart
    const cart = await Cart.findOne({ userId: user?.userId });
    if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404, headers: securityHeaders });


    // find product (to make sure it's valid)
    const product = await Product.findOne({ _id: new mongoose.Types.ObjectId(productId) })
      .select("_id")
      .lean();
    if (!product) {
      return NextResponse.json({ error: "Product not available" }, { status: 404, headers: securityHeaders });
    }

    // locate item to delete
    const itemIndex = cart.items.findIndex(
      item =>
        item.productId.toString() === productId.toString() &&
        ((variantId && item.variantId?.toString() === variantId.toString()) ||
          (!variantId && !item.variantId))
    );

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found in cart" }, { status: 404, headers: securityHeaders });
    }

    // const otherCartItems = cart.items.filter(it => { if (!it.isSelected) return false;
    //                                                     if (it.productId.toString() === productId) {
    //                                                       if (variantId) return it.variantId?.toString() !== variantId.toString();
    //                                                       return !!it.variantId;
    //                                                     }
    //                                                     return true;
    //                                                   });

    // const subtotal = otherCartItems.reduce((sum, item) => sum + item.total, 0);   
    // const grandTotal = ((subtotal - cart.totals.discount) + cart.totals.tax + cart.totals.deliveryCharge);

    const updatedCart = await Cart.findOneAndUpdate({
      _id: cart._id,
      'items.productId': new mongoose.Types.ObjectId(productId),
      ...(variantId ? { 'items.variantId': new mongoose.Types.ObjectId(variantId) }
        : { 'items.variantId': { $exists: false } })
    },
      [{
        $set: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              cond: {
                $not: {
                  $and: [
                    { $eq: ["$$item.productId", new mongoose.Types.ObjectId(productId)] },
                    variantId
                      ? { $eq: ["$$item.variantId", new mongoose.Types.ObjectId(variantId)] }
                      : { $eq: ["$$item.variantId", null] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        // recalc subtotal using only selected items
        $set: {
          "totals.subtotal": {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$items",
                    as: "i",
                    cond: "$$i.isSelected"
                  }
                },
                as: "i",
                in: "$$i.total"
              }
            }
          }
        }
      },
      {
        // recalc grandTotal
        $set: {
          "totals.grandTotal": {
            $add: [
              {
                $subtract: [
                  "$totals.subtotal",
                  "$totals.discount"
                ]
              },
              "$totals.tax",
              "$totals.deliveryCharge"
            ]
          },
          lastUpdated: new Date()
        }
      }
      ],
      { new: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Item removed from cart",
        cartId: cart._id,
        itemCount: updatedCart.items.length
      },
      { status: 200, headers: securityHeaders }
    );
  } catch (error) {
    console.error("DELETE /cart error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: securityHeaders });
  }
}