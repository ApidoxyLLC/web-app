import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { dbConnect } from '@/lib/mongodb/db';
import { vendorModel } from '@/models/vendor/Vendor';
import { categoryModel } from '@/models/shop/product/Category';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';

export async function GET(request) {
  try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
      const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'checkSlug' });
      if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});

      const { authenticated, error, data } = await getAuthenticatedUser(request);
      if(!authenticated) 
           return NextResponse.json({ error: "...not authorized" }, { status: 401 });

       /** 
       * fake Authentication for test purpose only 
       * ***************************************** *
       * *****REMOVE THIS BLOCK IN PRODUCTION***** *
       * ***************************************** *
       * *              ***
       * *              ***
       * *            *******
       * *             *****
       * *              *** 
       * *               *           
       * */

      // const authDb = await authDbConnect()
      // const User = userModel(authDb);
      // const user = await User.findOne({ referenceId: "cmcr5pq4r0000h4llwx91hmje" })
      //                        .select('referenceId _id name email phone role isEmailVerified')
      // const data = { sessionId: "686f81d0f3fc7099705e44d7",
      //          userReferenceId: user.referenceId,
      //                   userId: user._id,
      //                     name: user.name,
      //                    email: user.email,
      //                    phone: user.phone,
      //                     role: user.role,
      //               isVerified: user.isEmailVerified || user.isPhoneVerified,
      //               }
      
      /** 
       * fake Authentication for test purpose only 
       * *******************************************
       * *********FAKE AUTHENTICATION END********* *
       * *******************************************
      **/

    // Parse and validate parameters
      const { searchParams } = new URL(request.url);
      const params = {      shop: searchParams.get('shop'),
                           title: searchParams.get('title') };

    if (!params.title || !params.shop)
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400  });
    const vendor_db = await vendorDbConnect();
    const vendor = await vendorModel(vendor_db).findOne({ referenceId: params.shop })
                                         .select("+_id +ownerId +dbInfo")
                                         .lean()

    // Validate access
    if ( !vendor || vendor.ownerId.toString() != data.userId.toString()) 
      return NextResponse.json( { success: false, error: "Not authorized" }, { status: 401  });

    if (!vendor.dbInfo?.dbUri || !vendor.dbInfo?.dbName) 
      return NextResponse.json({ success: false, error: "Vendor DB info missing" }, { status: 500  });
    
    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                     options: { secret: config.vendorDbUriEncryptionKey } });

    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const CategoryModel = categoryModel(shop_db)

    const isExist = await CategoryModel.exists({ title: params.title })

    // Build response
    return NextResponse.json({ requested: params.title , isAvailable: !isExist });

  } catch (error) {
    console.error('Slug check error:', error);
    return NextResponse.json( { success: false, error: "Internal server error" }, { status: 500  } );
  }
}