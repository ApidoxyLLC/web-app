import { NextResponse } from 'next/server';
import { categoryModel } from '@/models/shop/product/Category';
import mongoose from 'mongoose';
import { categoryDTOSchema } from './categoryDTOSchema';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { shopModel } from '@/models/auth/Shop';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/option";
import { getToken } from 'next-auth/jwt';
import { getUserBySessionId } from '@/services/auth/user.service';
import { userModel } from '@/models/auth/User';
import slugify from 'slugify';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';

export async function POST(request) {
  const          ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;
  let body;
  try { body = await request.json() } 
  catch { return NextResponse.json({ success: false,  error: "Invalid JSON" }, { status: 400 }) }

  const parsed = categoryDTOSchema.safeParse(body);
  if (!parsed.success) 
    return NextResponse.json( { success: false, error: "Validation failed" }, { status: 422 });
  
  const { vendorId } = parsed.data;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const user_auth_session = await getServerSession(authOptions)

  if(!token || !token.session || !mongoose.Types.ObjectId.isValid(token.session))
      return NextResponse.json({success: false, error: "Not authorized" }, { status: 401  });

  const auth_db = await authDbConnect();
  const User = userModel(auth_db);
  const ShopModel = shopModel(auth_db);

  const user = await User.findOne({ activeSessions: new mongoose.Types.ObjectId(token?.session),
                                         isDeleted: false })
                         .select('+_id +activeSessions +shops')
                         .lean();
  if (!user)
    return NextResponse.json( { success: false, error: "Authentication failed" }, { status: 400 } );

  const shop = await ShopModel.findOne({ vendorId })
                              .select("+_id "+
                                      "+dbInfo +dbInfo.uri +dbInfo.prefix " +
                                      "+keys.ACCESS_TOKEN_SECRET " +
                                      "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES" )
                              .lean();
  if (!shop)
    return NextResponse.json( { success: false, error: "Authentication failed" }, { status: 400  } )

  if(!user || !user?.shops.some(id => id.equals(shop._id)))
      return NextResponse.json({success: false, error: "Not authorized" }, { status: 401  });

  const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
  if (!DB_URI_ENCRYPTION_KEY) 
    return NextResponse.json({success: false, error: "Server configuration error" }, { status: 500  });

  const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                   options: { secret: DB_URI_ENCRYPTION_KEY } });

  const     shopDbName = `${shop.dbInfo.prefix}${shop._id}`;

  const      vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
  const  CategoryModel = categoryModel(vendor_db);

  const session = await vendor_db.startSession(); 
  session.startTransaction()

  try {
    const { title, description, parent,
        image, metaTitle,   metaDescription, keywords,
        slug: userProvidedSlug } = parsed.data;
    if (parent) {
      const parentInfo = await CategoryModel.findOne({ _id: parent }).session(session);
      if (!parentInfo) throw new Error("Parent category not found");
    }
          const slugOptions = { lower: true, strict: true, trim: true };
      const _slug = userProvidedSlug || slugify(title, slugOptions);
      let slug = _slug;
      let counter = 1;

      while (await CategoryModel.exists({ slug })) {
        slug = `${_slug}-${counter++}`;
      }

      const newCategory = new CategoryModel({           title,
                                                  description: description      || '',
                                                         slug,
                                                       parent: parent           || null,
                                                        image: image            || { url: '', alt: '' },
                                                    metaTitle: metaTitle        || '',
                                              metaDescription: metaDescription  || '',
                                                     keywords: keywords         || [],
                                                    createdBy: user._id                       });

      const savedCategory = await newCategory.save({ session });

      if (savedCategory.parent) {
        await CategoryModel.findByIdAndUpdate(
          savedCategory.parent,
          { $push: { children: savedCategory._id } },
          { session }
        );
      }

    // 🔥 Moved outside transaction: ShopModel update
    await ShopModel.updateOne({ _id: shop._id }, 
                              { $addToSet: { categories: savedCategory._id } });

    vendor_db.commitTransaction();
    session.endSession();
    return NextResponse.json({ success: true, data: savedCategory.toObject(), message: "Category created successfully" }, { status: 201 });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    const errorMsg = err.code === 11000
      ? "A category with this slug already exists"
      : err.message || "Something went wrong";

    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  } finally {
    session.endSession();
  }
}

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}


























export async function GET() {
  try {
    const categories = await categoryModel(mongoose.connection.db)
      .find({ isActive: true })
      .sort({ level: 1, title: 1 })
      .lean();

    return NextResponse.json(
      { success: true, data: categories },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}






  // const authHeader = request.headers.get("authorization");
  // const cookieStore = cookies()

  // const cookieToken = cookieStore.get("access_token")?.value;
  // const headerToken = authHeader.split(" ")[1];

  // if(!cookieToken && !headerToken)
  //   return NextResponse.json( { error: "Refresh token required" }, { status: 400 });
  
  // const token = cookieToken ? cookieToken : headerToken

  // ******************************************************
    // const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    // if (!AT_SECRET_KEY) 
    //     return NextResponse.json( { error: "Server configuration error" }, { status: 500 })
    // const ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
    //                                                    options: { secret: AT_SECRET_KEY } });
    // let payload;
    // try { payload = jwt.verify(refreshToken, ACCESS_TOKEN_SECRET);} 
    // catch (err) {
    //     if (err.name === 'TokenExpiredError') return NextResponse.json({ error: "Refresh token expired" }, { status: 401 })
    //         return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    // }