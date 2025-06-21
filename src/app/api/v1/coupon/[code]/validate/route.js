import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '../../../lib/dbConnect';
import couponDTOSchema from './couponDTOSchema';
import { authenticationStatus } from '../../../middleware/auth';
import { couponModel } from '@/models/shop/product/Coupon';
import { productModel } from '@/models/shop/product/Product';
import { couponUsageHistoryModel } from '@/models/shop/product/CouponUsageHistory';
import securityHeaders from '../../../utils/securityHeaders';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';


export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const params = {          code: searchParams.get('code'),
                            userId: searchParams.get('userId'),
                        productIds: searchParams.getAll('productIds'),
                        cartAmount: parseFloat(searchParams.get('cartAmount')  || '0'),
                           country: searchParams.get('country'),
                            region: searchParams.get('region'),
                        postalCode: searchParams.get('postalCode'),
                    paymentMethod: searchParams.getAll('paymentMethod'),
                         platform: searchParams.get('platform') };

  try {
    const parsed = couponDTOSchema.safeParse(params);    
    if (!parsed.success) 
        return NextResponse.json({ error: "Invalid  email address..." }, { status: 422, headers: securityHeaders });    

    const { code, productIds, 
            cartAmount,
            country,    region,
            postalCode, paymentMethod, platform      } = parsed.data;

    const { success, shop, data: user, isTokenRefreshed, token } = await authenticationStatus(request);            
    
    if (!success || !shop || !user)
        return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 403, headers: securityHeaders });

    // ✅ DB Connection
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) {
        console.log("missing VENDOR_DB_URI_ENCRYPTION_KEY")
        return NextResponse.json({ success: false, error: "Missing encryption key" }, { status: 500, headers: securityHeaders }) 
    }
    const        dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                            options: { secret: DB_URI_ENCRYPTION_KEY } });
    const        dbKey = `${shop.dbInfo.prefix}${shop._id}`;
    const    vendor_db = await dbConnect({ dbKey, dbUri });
    const  CouponModel = couponModel(vendor_db);
    const ProductModel = productModel(vendor_db);
    // Find the coupon with lean and projection
    const [coupon, products] = await Promise.all([ CouponModel.findOne({ code }).select( "+isActive "               +
                                                                                         "+startDate "              +
                                                                                         "+endDate "                +
                                                                                         "+usage "                  +
                                                                                         "+customerEligibility "    +
                                                                                         "+customers "              +
                                                                                         "+exclude "                +
                                                                                         "+target "                 +
                                                                                         "+geographicRestrictions " +
                                                                                         "+minValue "               +
                                                                                         "+code "                   +
                                                                                         "+type "                   +
                                                                                         "+amount "                 +
                                                                                         "+maxDiscount "            +
                                                                                         "+currency "               +
                                                                                         "+allowStacking "          +
                                                                                         "+bogoRules "              +
                                                                                         "+platforms "              +
                                                                                         "+redeemMethod ").lean(),
                                                ProductModel.find({ productId: { $in: productIds } })
                                                    .select("+_id +productId +categories +price.base")
                                                ]);


    if (!coupon) 
      return NextResponse.json({ success: false, error: 'Invalid Coupon' },{ status: 404, headers: securityHeaders });
    
    if (!coupon.isActive) 
      return NextResponse.json({ success: false, error: 'Coupon is not active' }, { status: 400, headers: securityHeaders });

    const       now = new Date()
    const startDate = new Date(coupon.startDate);
          startDate.setHours(0, 0, 0, 0);

    if (now < startDate)
      return NextResponse.json({ success: false, error: 'Not Started yet' }, { status: 400, headers: securityHeaders })
    
    if (coupon.endDate && now > new Date(coupon.endDate)) 
      return NextResponse.json({ success: false, error: 'Coupon Expired' }, { status: 400, headers: securityHeaders });

    if (isNaN(cartAmount) || cartAmount <= 0) 
        return NextResponse.json({ success: false, error: 'Invalid cart amount' }, { status: 400, headers: securityHeaders });
    
    if (coupon.minValue && coupon.minValue > 0 && (!cartAmount || coupon.minValue > cartAmount))
      return NextResponse.json({ success: false, error: `You Have to purchese at least ${coupon.minValue}` }, { status: 400, headers: securityHeaders });

    // Validate platforms
    if (coupon.platforms && coupon.platforms.length > 0 && (!platform || !coupon.platforms.includes(platform))) 
        return NextResponse.json({ success: false, error: 'Coupon not valid for this platform' }, { status: 400, headers: securityHeaders });    

    // Validate redeem method
    if (coupon.redeemMethod === 'link' && !searchParams.get('token')) 
        return NextResponse.json({ success: false, error: 'This coupon requires a special redemption link' }, { status: 400, headers: securityHeaders });            

    // Validate customer eligibility
    if (coupon.customerEligibility === 'specific_customers' &&  (!coupon.customers || !coupon.customers.includes(user._id.toString()))) 
            return NextResponse.json({ success: false, error: 'You are not eligible for this coupon' }, { status: 400, headers: securityHeaders });

    let inapplicableProducts = new Set();
    const  foundProductIdSet = new Set(products.map(i => i._id.toString()));
    // const foundCategoriesIds = new Set(products.map(i => i.categories));
    const         productMap = products.reduce((acc, p) => {
                                        acc[p._id.toString()] = p; // use _id as key
                                        return acc;
                                        }, {});


    if (coupon.target) {
        if (coupon.target.products && coupon.target.products?.length > 0) {
            foundProductIdSet.forEach(id => {
            if (!coupon.target.products.includes(id)) inapplicableProducts.add(id);
            });
        }

        if (coupon.target.categories && coupon.target.categories?.length > 0) {
            products.forEach(product => {
            const hasMatch = product.categories.some(categoryId =>
                coupon.target.categories.includes(categoryId.toString())
            );
            if (!hasMatch) inapplicableProducts.add(product._id.toString());
            });
        }

        if (coupon.target.customers?.length > 0 &&
            !coupon.target.customers.includes(user._id.toString())) {
            return NextResponse.json({ success: false, error: 'You are not eligible for this discount...' }, { status: 400, headers: securityHeaders });
        }

        if (coupon.target.paymentMethods?.length > 0 &&
            (!paymentMethod || !paymentMethod.some(pm => coupon.target.paymentMethods.includes(pm)))) {
            return NextResponse.json({ success: false, error: 'Payment method not eligible for this coupon' }, { status: 400, headers: securityHeaders });
        }
    }

    if (coupon.exclude) {
        if (coupon.exclude.products?.length > 0) {
            foundProductIdSet.forEach(id => {
            if (coupon.exclude.products.includes(id)) inapplicableProducts.add(id);
            });
        }
        if (coupon.exclude.categories?.length > 0) {
            products.forEach(product => {
            const isExcluded = product.categories.some(categoryId =>
                coupon.exclude.categories.includes(categoryId.toString())
            );
            if (isExcluded) inapplicableProducts.add(product._id.toString());
            });
        }
        if (coupon.exclude.customers?.length > 0 &&
            coupon.exclude.customers.includes(user._id.toString())) {
            return NextResponse.json({ success: false, error: 'You are not eligible for this discount...' }, { status: 400, headers: securityHeaders });
        }
        if (coupon.exclude.paymentMethods?.length > 0 &&
            paymentMethod && paymentMethod.some(pm => coupon.exclude.paymentMethods.includes(pm))) {
            return NextResponse.json({ success: false, error: 'You are not eligible for this discount...' }, { status: 400, headers: securityHeaders });
        }
    }

    if (coupon.geographicRestrictions) {
        const { countries, regions, postalCodes } = coupon.geographicRestrictions;        
        if (countries?.length && !countries.includes(country)) 
            return NextResponse.json({ success: false, error: `Coupon not available in your country` }, { status: 400, headers: securityHeaders });    
        
        if (regions?.length && region && !regions.includes(region)) 
            return NextResponse.json({ success: false, error: `Coupon not available in your region` }, { status: 400, headers: securityHeaders });    
        
        if (postalCodes?.length && postalCode && !postalCodes.includes(postalCode)) 
            return NextResponse.json({ success: false, error: `Coupon not available for your postal code` }, { status: 400, headers: securityHeaders });    
    }

    // const customersPreviousCoupon = coupon.history.filter(item => item.customerId === user._id)
    const CouponUsageHistoryModel = couponUsageHistoryModel(vendor_db);
    const             usedCoupons = await CouponUsageHistoryModel.find({ couponId: coupon._id, customerId: user._id })
                                                   .select( "+orderId "+
                                                            "+usedAt " +
                                                            "+usageContext "+
                                                            "+usageContext.cartTotal " +
                                                            "+usageContext.discountApplied " +
                                                            "+usageContext.itemsPurchased " +
                                                            "+categories")
    if(coupon.usage.limit && coupon.usage.applyCount >= coupon.usage.limit)
        return NextResponse.json({ success: false, error: `This coupon has reached its maximum usage limit` }, { status: 400, headers: securityHeaders });

    if(coupon.usage.perCustomerLimit && usedCoupons.length >= coupon.usage.perCustomerLimit)
        return NextResponse.json({ success: false, error: `You have reached your maximum usage limit for this coupon'` }, { status: 400, headers: securityHeaders });
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysCoupon = await couponUsageHistoryModel(vendor_db).find({ usedAt: { $gte: startOfDay, $lte: endOfDay } });
    
    if(coupon.usage.dailyLimit && todaysCoupon.length >= coupon.usage.dailyLimit)
        return NextResponse.json({ success: false, error: `Today's Coupon is end, try later...` }, { status: 400, headers: securityHeaders });
    
        // Calculate discount amount
        // Special handling for different coupon types
        let discountAmount = 0;
        let discountDetails = {};

        const applicableProductIds = Array.from(foundProductIdSet).filter(id => !inapplicableProducts.has(id) && productMap[id]);

        if (applicableProductIds.length <= 0) 
            return NextResponse.json({ success: false, error: 'No products in your cart are eligible for this coupon' }, { status: 400, headers: securityHeaders });        

        // Before the BOGO calculation
        

        switch (coupon.type) {
            case 'fixed_amount':
                discountAmount = coupon.amount;
                if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                    discountAmount = coupon.maxDiscount;
                }
                discountDetails = {
                    type: 'fixed',
                    amount: discountAmount,
                    currency: coupon.currency
                };
                break;
                
            case 'percentage_off':
                discountAmount = (cartAmount * coupon.amount) / 100;
                if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                    discountAmount = coupon.maxDiscount;
                }
                discountDetails = {
                    type: 'percentage',
                    percentage: coupon.amount,
                    amount: discountAmount,
                    currency: coupon.currency,
                    maxDiscount: coupon.maxDiscount
                };
                break;
                
            case 'bogo':
                if (!coupon.bogoRules) 
                    return NextResponse.json({ success: false, error: 'BOGO rules missing' }, { status: 400, headers: securityHeaders });
                
                // Get BOGO product IDs as strings
                const bogoIds = coupon.bogoRules.productIds.map(id => id.toString());
                const missingBogoProducts = bogoIds.filter(id =>!applicableProductIds.includes(id));

                if (missingBogoProducts.length > 0) {
                    const missingProductNames = missingBogoProducts.map(id => productMap[id]?.name || 'unknown product').join(', ');
                    return NextResponse.json({ success: false, error: `Required products for BOGO not in cart: ${missingProductNames}` }, { status: 400, headers: securityHeaders });
                }



                // Find eligible products (both in BOGO rules and applicable to coupon)
                const eligibleProducts = applicableProductIds.filter(id => bogoIds.includes(id) && !inapplicableProducts.has(id));

                // Check if minimum quantity is met
                if (eligibleProducts.length < coupon.bogoRules.buyQuantity) {
                    const requiredNames = bogoIds.map(id => productMap[id]?.name || 'product')
                                                 .join(' or ');                        
                    return NextResponse.json({ success: false, error: `Need to purchase ${coupon.bogoRules.buyQuantity} of ${requiredNames} for BOGO offer` },{ status: 400, headers: securityHeaders });
                }
                
                // Calculate how many BOGO pairs we have
                const eligiblePairs = Math.floor(eligibleProducts.length / coupon.bogoRules.buyQuantity);
                const productsToDiscount = eligiblePairs * coupon.bogoRules.getQuantity;
                
                // Calculate total discount amount
                discountAmount = eligibleProducts
                    .slice(0, productsToDiscount)
                    .reduce((sum, productId) => sum + (productMap[productId]?.price?.base || 0), 0);
                
                // Prepare discount details
                discountDetails = {
                    type: 'bogo',
                    buyQuantity: coupon.bogoRules.buyQuantity,
                    getQuantity: coupon.bogoRules.getQuantity,
                    eligiblePairs,
                    discountAmount,
                    discountedProducts: eligibleProducts
                        .slice(0, productsToDiscount)
                        .map(id => ({
                            productId: productMap[id].productId,
                            name: productMap[id].name,
                            price: productMap[id].price.base
                        })),
                    remainingQualifyingProducts: eligibleProducts.slice(productsToDiscount)
                };
                break;

            case 'free_shipping':
                discountDetails = {
                    type: 'free_shipping',
                    description: 'Free shipping applied'
                };
                break;
            
            case 'free_gift':
                if (!coupon.metadata?.freeGiftProductId) 
                    return NextResponse.json({ success: false, error: 'Free gift product not specified' }, { status: 400, headers: securityHeaders });                
                
                // Verify the free gift product exists and is in stock
                const freeGiftProduct = await ProductModel.findOne({ productId: coupon.metadata.freeGiftProductId, 'inventory.stock': { $gt: 0 } }).lean();
                if (!freeGiftProduct)
                    return NextResponse.json({ success: false, error: 'Free gift product not available' }, { status: 400, headers: securityHeaders });                

                discountDetails = {
                    type: 'free_gift',
                    productId: freeGiftProduct.productId,
                    productName: freeGiftProduct.name,
                    image: freeGiftProduct.images?.[0],
                    value: freeGiftProduct.price.base
                };
                break;
            
            case 'tiered':
                if (!coupon.metadata?.tieredRules) 
                    return NextResponse.json({ success: false,error: 'Tiered discount rules not specified' }, { status: 400, headers: securityHeaders });
                
                // Sort tiers from highest to lowest threshold
                const sortedTiers = [...coupon.metadata.tieredRules].sort((a, b) => b.threshold - a.threshold);
                
                // Find the highest tier that cart qualifies for
                const applicableTier = sortedTiers.find(tier => cartAmount >= tier.threshold);

                if (!applicableTier) 
                    return NextResponse.json({ success: false, error: `Cart amount doesn't qualify for any discount tier (minimum: ${sortedTiers[sortedTiers.length-1].threshold})` }, { status: 400, headers: securityHeaders });
                

                // Calculate discount based on tier type
                if (applicableTier.type === 'percentage') {
                    discountAmount = (cartAmount * applicableTier.value) / 100;
                    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                        discountAmount = coupon.maxDiscount;
                    }
                } else { // fixed amount
                    discountAmount = applicableTier.value;
                }

                discountDetails = {
                    type: 'tiered',
                    tier: applicableTier.name || `Tier ${sortedTiers.indexOf(applicableTier) + 1}`,
                    discountType: applicableTier.type,
                    discountValue: applicableTier.value,
                    discountAmount,
                    nextTier: sortedTiers[sortedTiers.indexOf(applicableTier) - 1] || null,
                    currency: coupon.currency
                };
                break;
            
            case 'bundle':
                if (!coupon.metadata?.bundleProducts || coupon.metadata.bundleProducts.length < 2) 
                    return NextResponse.json({ success: false, error: 'Bundle products not properly specified' }, { status: 400, headers: securityHeaders });
                

                // Check if all required bundle products are in cart
                const bundleProductIds = coupon.metadata.bundleProducts.map(p => p.productId);
                const missingProducts = bundleProductIds.filter(id => !productIds.includes(id));

                if (missingProducts.length > 0) 
                    return NextResponse.json({ success: false, error: `Missing required products for bundle: ${missingProducts.join(', ')}` }, { status: 400, headers: securityHeaders });
                

                // Calculate discount
                if (coupon.metadata.bundleType === 'fixed_price') {
                    const regularPrice = products
                        .filter(p => bundleProductIds.includes(p.productId))
                        .reduce((sum, p) => sum + p.price.base, 0);
                    
                    discountAmount = regularPrice - coupon.metadata.bundlePrice;
                } 
                else { // percentage or fixed amount discount
                    const bundleItemsPrice = products
                        .filter(p => bundleProductIds.includes(p.productId))
                        .reduce((sum, p) => sum + p.price.base, 0);
                    
                    if (coupon.metadata.bundleType === 'percentage') {
                        discountAmount = (bundleItemsPrice * coupon.amount) / 100;
                    } else {
                        discountAmount = coupon.amount;
                    }
                }

                discountDetails = {
                                type: 'bundle',
                          bundleType: coupon.metadata.bundleType,
                          bundleName: coupon.metadata.bundleName || '',
                      discountAmount,
                    requiredProducts: bundleProductIds,
                         bundlePrice: coupon.metadata.bundlePrice || null,
                            currency: coupon.currency
                                };
                break;

            case 'cashback':
                if (!coupon.metadata?.cashbackMethod) 
                    return NextResponse.json({  success: false, error: 'Cashback method not specified' }, { status: 400, headers: securityHeaders });
                
                if (coupon.metadata.cashbackType === 'percentage') {
                    discountAmount = (cartAmount * coupon.amount) / 100;
                    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                        discountAmount = coupon.maxDiscount;
                    }
                } else {
                    discountAmount = coupon.amount;
                }

                discountDetails = {
                    type: 'cashback',
                    cashbackType: coupon.metadata.cashbackType,
                    cashbackAmount: discountAmount,
                    cashbackMethod: coupon.metadata.cashbackMethod,
                    currency: coupon.currency,
                    minValue: coupon.minValue,
                    terms: coupon.metadata.cashbackTerms || ''
                };
                break;
            
            // case 'first_purchase':
            //     // Check if customer has previous orders
            //     const OrderModel = orderModel(vendor_db)
            //     const hasPreviousOrders = await OrderModel.exists({ customerId: user._id });
                
            //     if (hasPreviousOrders) {
            //         return NextResponse.json({ success: false, error: 'Coupon only valid for first purchase' }, { status: 400, headers: securityHeaders })}
                    
            //     discountAmount = (cartAmount * coupon.amount) / 100;
            //     if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            //         discountAmount = coupon.maxDiscount;
            //     }

            //     discountDetails = {
            //         type: 'first_purchase',
            //         percentage: coupon.amount,
            //         amount: discountAmount,
            //         currency: coupon.currency,
            //     };

            //      break;
            
            // case 'next_purchase':
            //     // Verify this is a valid next-purchase coupon (typically issued after a previous purchase)
            //     if (!coupon.metadata?.issuedForOrder) 
            //         return NextResponse.json({ success: false, error: 'Invalid next-purchase coupon'}, { status: 400, headers: securityHeaders });

            //     // Verify the customer is the intended recipient
            //     if (coupon.metadata.issuedForCustomer !== user._id.toString()) 
            //         return NextResponse.json({ success: false, error: 'This coupon was issued to another customer' }, { status: 400, headers: securityHeaders });                
                
            //     discountAmount = (cartAmount * coupon.amount) / 100;
            //     if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) 
            //         discountAmount = coupon.maxDiscount;                

            //     discountDetails = {
            //         type: 'next_purchase',
            //         percentage: coupon.amount,
            //         amount: discountAmount,
            //         currency: coupon.currency,
            //     };

            //     break;
            
            default:
                return NextResponse.json({ success: false, error: 'Unsupported coupon type' }, { status: 400, headers: securityHeaders });
                
        }


        const applicableProductRefs = applicableProductIds.map(id => productMap[id].productId);
        const inapplicableProductRefs = [...inapplicableProducts].filter(id => productMap[id])
                                                                 .map(id => productMap[id].productId);

        const response = NextResponse.json( { success: true,
                                                 data: {                  code: coupon.code,
                                                                          type: coupon.type,
                                                                      discount: discountDetails,
                                                            applicableProducts: applicableProductRefs,
                                                          inapplicableProducts: inapplicableProductRefs,
                                                                 remainingUses: coupon.usage.limit ? coupon.usage.limit - coupon.usage.applyCount : null,
                                                         remainingCustomerUses: coupon.usage.perCustomerLimit ? coupon.usage.perCustomerLimit - usedCoupons.length : null,
                                                            remainingDailyUses: coupon.usage.dailyLimit ? coupon.usage.dailyLimit - todaysCoupon.length : null        
                                                        }
                                            }, { status: 200, headers: securityHeaders } );

        if (isTokenRefreshed && token) {
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


  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: securityHeaders });
  }
}
