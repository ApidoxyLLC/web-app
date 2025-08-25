import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { couponDTOSchema } from './couponDTOSchema';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { dbConnect } from '@/lib/mongodb/db';
import { shopModel } from '@/models/auth/Shop';
import { userModel } from '@/models/auth/User';
import { decrypt } from '@/lib/encryption/cryptoEncryption'; 
import { headers } from 'next/headers';
import { couponModel } from '@/models/shop/product/Coupon';
// import { productModel } from '@/models/shop/product/Product';


// Rate limiter configuration


export async function POST(request) {
  // Get client IP for rate limiting
  const headerList = headers();
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             headerList.get('x-real-ip') || 'unknown_ip';

/**
 * 
 * Activate later on production
 * Rate limiting
 * try { await limiter.check(ip, 10) } 
 * catch {  return NextResponse.json( { error: "Too many requests" }, { status: 429, headers: {   'Retry-After': '60' }});}
 * 
 */             


  // Parse and validate request body
  let body;
  try { body = await request.json();}
  catch (err) { return NextResponse.json( { error: "Invalid JSON body" }, { status: 400  })}

  // Zod validation
  const parsed = couponDTOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed",details: parsed.error.flatten() },{ status: 422  })}

  const { vendorId, code, storeScope, ...couponData } = parsed.data;

  // Authentication check
  const token = await getToken({ req: request, 
                              secret: process.env.NEXTAUTH_SECRET });
  if (!token?.session) 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401  } )

  // Database connections
  const   auth_db = await authDbConnect();
  const      User = userModel(auth_db);
  const ShopModel = shopModel(auth_db);

  try {
    // Verify user exists and has permission
    const user = await User.findOne({ activeSessions: new mongoose.Types.ObjectId(token.session), 
                                           isDeleted: false })
                           .select('+_id +shops')
                           .lean();

    if (!user) {
      return NextResponse.json( { error: "User not found or session invalid" }, { status: 403  })}

    // Get shop information
    const shop = await ShopModel.findOne({ vendorId })
                                .select('+dbInfo.uri +dbInfo.prefix').lean();

    if (!shop) {
      return NextResponse.json( { error: "Shop not found or access denied" }, { status: 404  }) }

    // Verify coupon code uniqueness
    const            shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    
    if (!DB_URI_ENCRYPTION_KEY) 
      return NextResponse.json({ error: "Server configuration error" }, { status: 500  } );

    const          dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                              options: { secret: DB_URI_ENCRYPTION_KEY } });
    const      vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const    CouponModel = couponModel(vendor_db)
    // const ProductModel = productModel(vendor_db)

    // Check if coupon code already exists
    const existingCoupon = await CouponModel.findOne({ code }).lean();
    if (existingCoupon) 
        return NextResponse.json( { error: "Coupon code already exists" },{ status: 409  })

    /**
    // Pending Task 
    // Target Validation
    // ****************************************
    if (couponData.target) {
        const { products, categories } = couponData.target;

        // Validate product IDs
        if (Array.isArray(products) && products.length > 0) {
            const existingProducts = await ProductModel.countDocuments({ _id: { $in: products } });
            if (existingProducts !== products.length) {
            return NextResponse.json(
                { error: "One or more target products not found" },
                { status: 400  }
            );
            }
        }

        // Validate category IDs
        if (Array.isArray(categories) && categories.length > 0) {
            const CategoryModel = vendor_db.model('Category'); // Assuming category model is registered
            const existingCategories = await CategoryModel.countDocuments({ _id: { $in: categories } });
            if (existingCategories !== categories.length) {
            return NextResponse.json(
                { error: "One or more target categories not found" },
                { status: 400  }
            );
            }
        }
        }

    if (couponData.exclude) {
        const { products: exProducts, categories: exCategories, customers } = couponData.exclude;

        if (Array.isArray(exProducts) && exProducts.length > 0) {
            const excludedCount = await ProductModel.countDocuments({ _id: { $in: exProducts } });
            if (excludedCount !== exProducts.length) {
            return NextResponse.json(
                { error: "One or more excluded products not found" },
                { status: 400  }
            );
            }
        }

        if (Array.isArray(exCategories) && exCategories.length > 0) {
            const CategoryModel = vendor_db.model('Category');
            const exCatCount = await CategoryModel.countDocuments({ _id: { $in: exCategories } });
            if (exCatCount !== exCategories.length) {
            return NextResponse.json(
                { error: "One or more excluded categories not found" },
                { status: 400  }
            );
            }
        }

        if (Array.isArray(customers) && customers.length > 0) {
            const UserModel = vendor_db.model('User');
            const userCount = await UserModel.countDocuments({ _id: { $in: customers } });
            if (userCount !== customers.length) {
            return NextResponse.json(
                { error: "One or more excluded customers not found" },
                { status: 400  }
            );
            }
        }
        }
     */
    

    // Create coupon in transaction
    const session = await vendor_db.startSession();
    session.startTransaction();

    try {
      // Create new coupon
      const newCoupon = new CouponModel({
        ...couponData,
        code,
        createdBy: user._id,
        storeScope: shop._id
      });

      const savedCoupon = await newCoupon.save({ session });

      // Update shop's coupon references
      await ShopModel.updateOne( {       _id: shop._id }, 
                                 { $addToSet: { coupons: savedCoupon._id } }, 
                                 { session } );
      await session.commitTransaction();
    
      return NextResponse.json({ success: true, data: savedCoupon.toObject(), message: "Coupon created successfully" }, { status: 201  });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    }finally{
        session.endSession();        
    }

  } catch (error) {
    console.error('Coupon creation error:', error);
    const errorMessage = error.code === 11000 
      ? "Duplicate coupon code" 
      : "Failed to create coupon";

    return NextResponse.json({ error: errorMessage }, { status: 400  });
  }
}