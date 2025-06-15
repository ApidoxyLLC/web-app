import mongoose from "mongoose";
import { NextResponse } from "next/server";
import centralDbConnect from "@/app/lib/mongodb/authDbConnect";
import { dbConnect } from "@/app/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import rateLimit from "@/app/utils/rateLimit";
import { headers } from "next/headers";
import { getToken } from 'next-auth/jwt';
import { userModel } from '@/models/auth/User';
import slugify from 'slugify';
import securityHeaders from "../utils/securityHeaders";
import { cookies } from "next/headers";
import { authenticationStatus } from "../middleware/auth";


export const dynamic = 'force-dynamic'; // Ensure dynamic fetching

// Helper for API responses
// const apiResponse = (data, status = 200, headers = {}) => {
//   const response = NextResponse.json(data, { status });
//   Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
//   return response;
// };

// Rate limiter configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max users per minute
});






export async function POST(request) {
  
  const auth = await authenticationStatus(request);
  const isAuthenticated = auth.success
  const shop = auth.shop 
  if(!shop)
    return NextResponse.json({ success: false, error: "Unable to proceed..." }, { status: 500, headers: securityHeaders })

  






//   const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
//              request.headers.get('x-real-ip') || 'unknown_ip';
//   const fingerprint = request.headers.get('x-fingerprint') || null;

//   let body;
//   try { body = await request.json() } 
//   catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders });}

//   // Validate input with Zod
//   const parsed = productDTOSchema.safeParse(body);
//   if (!parsed.success)
//     return NextResponse.json({  success: false, error: "Validation failed", details: parsed.error.flatten()}, { status: 422, headers: securityHeaders });
  

//   const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

//   if (!token || !token.session || !mongoose.Types.ObjectId.isValid(token.session)) 
//     return NextResponse.json({ success: false, error: "Not authorized" }, { status: 401, headers: securityHeaders });
  

//   const auth_db = await authDbConnect();
//   const User = userModel(auth_db);
//   const ShopModel = shopModel(auth_db);

//   const user = await User.findOne({ activeSessions: new mongoose.Types.ObjectId(token?.session), isDeleted: false })
//                          .select('+_id +activeSessions +shops').lean();
//   if (!user) 
//     return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 400, headers: securityHeaders })

//   const shop = await ShopModel.findOne({ vendorId })
//                               .select("+_id "+
//                                       "+dbInfo +dbInfo.uri +dbInfo.prefix " +
//                                       "+keys.ACCESS_TOKEN_SECRET "+
//                                       "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES")
//                               .lean();

//   if (!shop) 
//     return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404, headers: securityHeaders });

//   if (!user?.shops.some(id => id.equals(shop._id))) 
//     return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403, headers: securityHeaders });

//   const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
//   if (!DB_URI_ENCRYPTION_KEY) 
//     return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500, headers: securityHeaders });

//   const dbUri = await decrypt({   cipherText: shop.dbInfo.uri, 
//                                      options: { secret: DB_URI_ENCRYPTION_KEY } });

//   const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
//   const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
//   const ProductModel = productModel(vendor_db);

//   const session = await vendor_db.startSession();
//   session.startTransaction();

//   try {
//     const { 
//       title, description, tags, gallery, otherMediaContents,
//       price, thumbnail, options, details,  categories,
//       hasVariants, isAvailable, warranty, status, approvalStatus, 
//       productFormat, digitalAssets, brand, shipping, variants } = parsed.data;

//     // Generate slug if not provided
//     const slugOptions = { lower: true, strict: true, trim: true };
//     const _slug = parsed.data.slug || slugify(title, slugOptions);
//     let slug = _slug;
//     let counter = 1;

//     // Ensure unique slug
//     while (await ProductModel.exists({ slug })) {
//       slug = `${_slug}-${counter++}`;
//     }

//     // Validate categories exist
//     if (categories && categories.length > 0) {
//       const categoryCount = await vendor_db.model('Category').countDocuments({ 
//         _id: { $in: categories } 
//       });
//       if (categoryCount !== categories.length) {
//         throw new Error("One or more categories not found");
//       }
//     }

//     // Validate brand exists if provided
//     // if (brand) {
//     //   const brandExists = await vendor_db.model('Brand').exists({ _id: brand });
//     //   if (!brandExists) {
//     //     throw new Error("Brand not found");
//     //   }
//     // }

//     // Create new product
//     const newProduct = new ProductModel({ title, slug, description, tags, gallery,
//                                           otherMediaContents, price, thumbnail, options,
//                                           details, categories, hasVariants, isAvailable,
//                                           warranty, status, approvalStatus, productFormat,
//                                           digitalAssets, brand, shipping, variants });

//     const savedProduct = await newProduct.save({ session });

//     // Update shop's products reference
//     await ShopModel.updateOne(
//       { _id: shop._id },
//       { $addToSet: { products: savedProduct._id } }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     const response = NextResponse.json(
//       { 
//         success: true, 
//         data: savedProduct.toObject(), 
//         message: "Product created successfully" 
//       },
//       { status: 201 }
//     );

//     // Add security headers
//     Object.entries(securityHeaders).forEach(([key, value]) => {
//       response.headers.set(key, value);
//     });

//     return response;

//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();

//     const errorMsg = err.code === 11000
//       ? "A product with similar attributes already exists"
//       : err.message || "Something went wrong";

//     return NextResponse.json(
//       { success: false, error: errorMsg },
//       { status: 400, headers: securityHeaders }
//     );
//   } finally {
//     session.endSession();
//   }
}