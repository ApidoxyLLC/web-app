import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { cartModel } from "@/models/shop/product/Cart";
import { orderModel } from "@/models/shop/product/Order";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { authenticationStatus } from "../middleware/auth";
import { inventoryReservationModel } from "@/models/shop/product/InventoryReservation";
import { inventoryHistoryModel } from "@/models/shop/product/InventorHistory";
import orderDTOSchema from "./orderDTOSchema";
import securityHeaders from "../utils/securityHeaders";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";

export const dynamic = 'force-dynamic';
const TRANSACTION_OPTIONS = {       readConcern: { level: 'majority' },
                                   writeConcern: { w: 'majority', j: true },
                                maxCommitTimeMS: 10000                      };
const MAX_TRANSACTION_RETRIES = 3;
const RETRY_DELAY_MS = 100;


export async function POST(request) {
    let body;
    try { body = await request.json() }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json( { error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

    const parsed = orderDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json( { error: "Validation failed", details: parsed.error.flatten() }, { status: 422 } )
    const { shippingMethod, shippingAddress, paymentMethod } = parsed.data;

    const { success: authenticated, shop, data, isTokenRefreshed, token, db } = await authenticationStatus(request);
    const user = data || null;
    if (!authenticated || !user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {

        const                 CartModel = cartModel(db);
        const                OrderModel = orderModel(db);
        const              ProductModel = productModel(db);
        const     InventoryHistoryModel = inventoryHistoryModel(db);
        const InventoryReservationModel = inventoryReservationModel(db);        

        let savedOrder;
        let retryCount = 0;
        let lastError;

        while (retryCount < MAX_TRANSACTION_RETRIES) {
            const   session = await shop_db.startSession();
            try {
                await session.withTransaction(async () => {
                    // Step 1: Fetch cart with enriched product data
                    const [cart] = await CartModel.aggregate([
                                    { $match: { userId: user._id } },
                                    { $unwind: '$items' },
                                    { $lookup: {         from: 'products',
                                                   localField: 'items.productId',
                                                 foreignField: '_id',
                                                           as: 'product'            }
                                    },
                                    { $unwind: '$product' },
                                    { $addFields: {
                                        matchedVariant: {
                                            $first: {
                                                $filter: {
                                                    input: '$product.variants',
                                                    as: 'variant',
                                                    cond: { $eq: ['$$variant._id', '$items.variantId'] }
                                                    }
                                                }
                                            },
                                        effectivePrice: {
                                            $cond: [
                                                { $ifNull: ['$items.variantId', false] },
                                                '$matchedVariant.price.base',
                                                '$product.price.base'   ]
                                            },
                                        effectiveInventory: {
                                            $cond: [
                                                { $ifNull: ['$items.variantId', false] },
                                                '$matchedVariant.inventory',
                                                '$product.inventory'    ]
                                            }
                                        }
                                    },
                                    {   $addFields: {
                                                    'items.product': '$product',
                                                    'items.variant': '$matchedVariant',
                                            'items.price.basePrice': '$effectivePrice',
                                                  'items.inventory': '$effectiveInventory'
                                            }
                                    },
                                    { $project: { product: 0, matchedVariant: 0, effectivePrice: 0, effectiveInventory: 0 } },
                                    { $group: {
                                                    _id: '$_id',
                                                 cartId: { $first: '$cartId' },
                                                 userId: { $first: '$userId' },
                                                isGuest: { $first: '$isGuest' },
                                            fingerprint: { $first: '$fingerprint' },
                                                     ip: { $first: '$ip' },
                                              userAgent: { $first: '$userAgent' },
                                               currency: { $first: '$currency' },
                                              expiresAt: { $first: '$expiresAt' },
                                            lastUpdated: { $first: '$lastUpdated' },
                                                 totals: { $first: '$totals' },
                                                  items: { $push: '$items' }
                                        }
                                    },
                                    { $limit: 1 }
                                ]).session(session);

                    if (!cart) throw new Error("Cart not found");
                    if (!cart.items?.length) throw new Error("Cart is empty");

                    const inventoryUpdates = [];
                    const    inventoryLogs = [];
                    const              now = new Date();
                    const          orderId = new mongoose.Types.ObjectId();
                                
                    // Step 2: Process each item with enriched data
                    for (const item of cart.items) {
                        if (!item.inventory) 
                            throw new Error(`Inventory not configured for product ${item.productId}`);                    

                        const available = item.inventory.quantity - (item.inventory.reserved || 0);
                        if (available < item.quantity) 
                            throw new Error(`Insufficient stock for ${item.product.title}. Available: ${available}, Requested: ${item.quantity}` );

                        const reserved = item.inventory?.reserved || 0;
                        const availableQuantity = item.inventory.quantity - reserved;

                        if (availableQuantity < item.quantity) 
                            throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableQuantity}, Requested: ${item.quantity}`);

                        // Prepare updates
                        inventoryUpdates.push({ updateOne: {
                                                    filter: {
                                                        _id: item.productId,
                                                        ...(item.variantId && { 'variants._id': item.variantId })
                                                    },
                                                    update: {
                                                        $inc: {
                                                            [item.variantId 
                                                                ? 'variants.$[elem].inventory.quantity' 
                                                                : 'inventory.quantity']: -item.quantity
                                                        },
                                                        $set: {
                                                            [item.variantId
                                                                ? 'variants.$[elem].inventory.lastStockChange'
                                                                : 'inventory.lastStockChange']: {
                                                                actionType: 'OUT',
                                                                quantityDelta: item.quantity,
                                                                timestamp: now
                                                            }
                                                        }
                                                    },
                                                    ...(item.variantId && {
                                                        arrayFilters: [{ 'elem._id': item.variantId }]
                                                    })
                                                }
                                            });

                        inventoryLogs.push({       productId: item.productId,
                                                   variantId: item.variantId || undefined,
                                                     orderId,
                                                  actionType: 'OUT',
                                              quantityChange: item.quantity,
                                            previousQuantity: item.inventory.quantity,
                                                 newQuantity: item.inventory.quantity - item.quantity,
                                                   reference: cart.cartId,
                                                 performedBy: user._id,
                                                      reason: 'Order placed',
                                                        note: 'Stock deducted due to successful order'
                                        });
                    }

                    // 3. Execute updates
                    if (inventoryUpdates.length) 
                        await ProductModel.bulkWrite(inventoryUpdates, { session });
                    
                    if (inventoryLogs.length) 
                        await InventoryHistoryModel.insertMany(inventoryLogs, { session });

                    savedOrder = await OrderModel.create([{ userId: user._id,
                                                            cartId: cart._id,
                                                             items: cart.items.map(item => ({
                                                                    productId: item.productId,
                                                                    variantId: item.variantId,
                                                                     quantity: item.quantity,
                                                                        price: { basePrice: item.price.basePrice,
                                                                                 currency: item.price.currency || cart.currency },
                                                                     subtotal: item.subtotal,
                                                                        title: item.product.title,
                                                                        image: item.product.thumbnail,
                                                                 variantTitle: item.variant?.title
                                                            })),
                                                            totals: cart.totals,
                                                          shipping: { address: shippingAddress,
                                                                        method: shippingMethod,
                                                                        cost: cart.totals.deliveryCharge || 0},
                                                            payment: {
                                                                method: paymentMethod,
                                                                status: paymentMethod === 'cod' ? 'pending' : 'processing'
                                                            },
                                                            discounts: cart.discounts || [],
                                                            fingerprint: cart.fingerprint,
                                                            ip: cart.ip,
                                                            userAgent: cart.userAgent,
                                                            placedAt: now
                                                        }], { session });


                    await Promise.all([   CartModel.bulkWrite([
                                            { updateOne: {
                                                filter: { _id: cart._id },
                                                update: {
                                                    $set: {
                                                    items: [],
                                                    totals: {
                                                    subtotal: 0,
                                                    discount: 0,
                                                    tax: 0,
                                                    deliveryCharge: 0,
                                                    grandTotal: 0,
                                                    },
                                                    lastUpdated: now,
                                                        }
                                                    }
                                                }
                                            },
                                        ], { session }),
                                    InventoryReservationModel.bulkWrite([ { deleteMany: { filter: { cartId: cart._id } }}], { session }),
                                ]);
                }, TRANSACTION_OPTIONS);
                break; 
            } catch (error) {
                lastError = error;
                retryCount++;                
                if (retryCount >= MAX_TRANSACTION_RETRIES || !error.hasErrorLabel('TransientTransactionError')) 
                    throw error;                                
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retryCount));
            } finally { await session.endSession() }
        }

        const response = NextResponse.json( {   data: savedOrder, 
                                        message: 'Order placed successfully' },
                                    {   status: 201, 
                                        headers: securityHeaders  } );

        if (authenticated && isTokenRefreshed && token) {
            const ACCESS_TOKEN_EXPIRY = Number(shop.timeLimitations?.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
            const REFRESH_TOKEN_EXPIRY = Number(shop.timeLimitations?.REFRESH_TOKEN_EXPIRE_MINUTES) || 1440;
            const accessTokenExpiry = minutesToExpiryTimestamp(ACCESS_TOKEN_EXPIRY);
            const refreshTokenExpiry = minutesToExpiryTimestamp(REFRESH_TOKEN_EXPIRY);

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
        
    } catch (error) {
        console.error('Order processing error:', error);

        if (error.message.includes('Insufficient stock')) 
            return NextResponse.json( { error: error.message }, { status: 409 });
        
        if (error instanceof mongoose.Error.ValidationError) 
            return NextResponse.json( { error: "Data validation failed" }, { status: 400 } );

        return NextResponse.json( { error: "Order processing failed. Please try again." }, { status: 500 });
    }
}




    // older version 0 
    // try {
    //     await session.withTransaction(async () => {
    //         // Step 1: Fetch cart
    //         const cart = await CartModel.findOne({ userId: user._id }).session(session);
    //         if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    //         const              orderId = new mongoose.Types.ObjectId();
    //         const      updatedProducts = [];
    //         const inventoryHistoryLogs = [];

    //         for (const item of cart.items) {
    //             const product = await ProductModel.findOne({ _id: item.productId }).session(session);
    //             if (!product) throw new Error(`Product not found`);

    //             const variant = item.variantId
    //                                 ? product.variants.find(v => v._id.toString() === item.variantId.toString())
    //                                 : null;

    //             const inventory = variant?.inventory || product.inventory;
    //             if (!inventory || inventory.quantity - (inventory.reserved || 0) < item.quantity) 
    //                 throw new Error(`Insufficient stock`);                

    //             const previousQuantity = inventory.quantity;
    //             inventory.quantity -= item.quantity;

    //             inventory.lastStockChange = {
    //                    actionType: 'OUT',
    //                 quantityDelta: item.quantity,
    //                     timestamp: new Date()
    //             };

    //             inventoryHistoryLogs.push({
    //                      productId: item.productId,
    //                      variantId: item.variantId || undefined,
    //                        orderId,
    //                     actionType: 'OUT',
    //                 quantityChange: item.quantity,
    //               previousQuantity,
    //                    newQuantity: inventory.quantity,
    //                      reference: cart.cartId,
    //                    performedBy: user._id,
    //                         reason: 'Order placed',
    //                           note: 'Stock deducted due to successful order'
    //                 });

    //             if (variant) variant.inventory = inventory;
    //             else product.inventory = inventory;
    //             updatedProducts.push(product);
    //         }

    //         // Save updated products
    //         for (const product of updatedProducts) 
    //             await ProductModel.updateOne({ _id: product._id }, product).session(session);            

    //         // Insert inventory history
    //         if (inventoryHistoryLogs.length > 0) 
    //             await InventoryHistoryModel.insertMany(inventoryHistoryLogs, { session });            

    //         // Create order
    //         const orderItems = cart.items.map(item => ({
    //             productId: item.productId,
    //             variantId: item.variantId,
    //             quantity: item.quantity,
    //             price: item.price,
    //             subtotal: item.subtotal,
    //             title: item.title,
    //             image: item.image
    //         }));

    //         const order = new OrderModel({
    //             _id: orderId,
    //             userId: user._id,
    //             cartId: cart._id,
    //             items: orderItems,
    //             totals: cart.totals,
    //             shipping: {
    //             address: shippingAddress,
    //             method: shippingMethod,
    //             cost: cart.totals.deliveryCharge || 0
    //             },
    //             payment: {
    //             method: paymentMethod,
    //             status: 'pending'
    //             },
    //             discounts: cart.discounts || [],
    //             fingerprint: cart.fingerprint,
    //             ip: cart.ip,
    //             userAgent: cart.userAgent,
    //             placedAt: new Date()
    //         });

    //         savedOrder = await order.save({ session });

    //         // Clear cart
    //         cart.items = [];
    //         cart.totals = { subtotal: 0, discount: 0, tax: 0, deliveryCharge: 0, grandTotal: 0 };
    //         cart.lastUpdated = new Date();
    //         await cart.save({ session });

    //         // Delete reservations
    //         await InventoryReservationModel.deleteMany({ cartId: cart._id }).session(session);
    //     });    
    // }finally{
    //     await session.endSession();
    // }


    // v2 



                        // const previousQuantity = item.inventory.quantity;
                        // const newQuantity = previousQuantity - item.quantity;
                        // const lastStockChange = {
                        //                             actionType: 'OUT',
                        //                             quantityDelta: item.quantity,
                        //                             timestamp: now
                        //                         };

                        // productInventoryUpdateQueries.push({
                        //     updateOne: {
                        //         filter: {
                        //             _id: item.productId,
                        //             ...(item.variantId && { 'variants._id': item.variantId })
                        //         },
                        //         update: {
                        //             $inc: {
                        //                 ...(item.variantId
                        //                     ? { 'variants.$[elem].inventory.quantity': -item.quantity }
                        //                     : { 'inventory.quantity': -item.quantity })
                        //             },
                        //             $set: {
                        //                 ...(item.variantId
                        //                     ? { 'variants.$[elem].inventory.lastStockChange': lastStockChange }
                        //                     : { 'inventory.lastStockChange': lastStockChange })
                        //             }
                        //         },
                        //         ...(item.variantId && {
                        //             arrayFilters: [{ 'elem._id': item.variantId }]
                        //         })
                        //     }
                        // });
                        // inventoryUpdates.push({
                        //     updateOne: {
                        //         filter: {
                        //             _id: item.productId,
                        //             ...(item.variantId && { 'variants._id': item.variantId })
                        //         },
                        //         update: {
                        //             $inc: {
                        //                 [item.variantId 
                        //                     ? 'variants.$[elem].inventory.quantity' 
                        //                     : 'inventory.quantity']: -item.quantity
                        //             },
                        //             $set: {
                        //                 [item.variantId
                        //                     ? 'variants.$[elem].inventory.lastStockChange'
                        //                     : 'inventory.lastStockChange']: {
                        //                     actionType: 'OUT',
                        //                     quantityDelta: item.quantity,
                        //                     timestamp: now
                        //                 }
                        //             }
                        //         },
                        //         ...(item.variantId && {
                        //             arrayFilters: [{ 'elem._id': item.variantId }]
                        //         })
                        //     }
                        // });