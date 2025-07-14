import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
// import { connectVendorDb } from '../utils/connectVendorDb';
import { categoryModel } from '@/models/shop/product/_Category';
import { categoryDTOSchema } from './categoryDTOSchema';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { shopModel } from '@/models/auth/Shop';
import { vendorModel } from '@/models/vendor/Vendor';
import { userModel } from '@/models/auth/User';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';
import securityHeaders from '../utils/securityHeaders';
import getAuthenticatedUser from '../auth/utils/getAuthenticatedUser';
import config from '../../../../../config';

const MAX_CATEGORY_DEPTH = parseInt(process.env.MAX_CATEGORY_DEPTH || '5', 10);

export async function POST(request) {
  let body;
  try { body = await request.json();} 
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: securityHeaders });}

  // const fingerprint = request.headers.get('x-fingerprint') || null;
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getShop' });
  if (!allowed) return null;

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if(!authenticated) 
      return NextResponse.json({ error: "...not authorized" }, { status: 401 });

  const parsed = categoryDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

  const { shopId, slug: inputSlug } = parsed.data;
  // const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  // if (!token || !token.session || !mongoose.Types.ObjectId.isValid(token.session)) 
  //   return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401, headers: securityHeaders });
  
  const   auth_db = await authDbConnect();
  const vendor_db = await vendorDbConnect();
  const      User = userModel(auth_db);
  // const ShopModel = shopModel(auth_db);
  const VendorModel = vendorModel(vendor_db);


  // Find user with active session and not deleted
  const user = await User.findOne({ referenceId: data.userReferenceId,
                                      isDeleted: false       })
                         .select('+_id +activeSessions +shops')
                         .lean();
  if (!user) 
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400, headers: securityHeaders });
  
  const vendorData = await VendorModel.findOne({ referenceId: shopId })
                                      .select( "+_id +dbInfo +secrets +expirations")
                                      .lean();

  if (!vendorData) 
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400, headers: securityHeaders });
  
  // Verify user owns the shop
  if (!user.shops.some(id => id.equals(vendorData._id))) 
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401, headers: securityHeaders });

  // Decrypt vendor DB URI
  // const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
  // if (!DB_URI_ENCRYPTION_KEY)
  //   return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500, headers: securityHeaders } );
  

  const dbUri = await decrypt({ cipherText: vendorData.dbInfo.uri,
                                   options: { secret: config.vendorDbUriEncryptionKey } });

  const shop_db = await dbConnect({ dbKey: vendorData.dbInfo.dbName, dbUri });
  const CategoryModel = categoryModel(shop_db);

  const slugExist = await CategoryModel.exists({ slug: inputSlug });
  if (slugExist)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

  // Start mongoose session & transaction
  const session = await shop_db.startSession();
  session.startTransaction();

  try {
    const        stack = [{ node: parsed.data, parentId: null, level: 0 }];
    const        idMap = new Map();
    const slugsToCheck = new Set();
    const      rawDocs = [];

    // First pass: collect slugs and assign _id
    // while (stack.length > 0) {
    //   const { node, parentId, level } = stack.pop();

    //   if (level > MAX_CATEGORY_DEPTH)
    //     throw new Error(`Maximum Step is Exceeded...`);

    //   if (!node.title || !node.slug)
    //     throw new Error(`Missing required fields (title or slug) for category`);

    //   if (slugsToCheck.has(node.slug))
    //     throw new Error(`Validation Error...`);

    //   slugsToCheck.add(node.slug);
    //   const _id = new mongoose.Types.ObjectId();
    //   idMap.set(node, _id);

    //   const children = node.children || [];
    //   [...children].reverse().forEach(child => {
    //     stack.push({ node: child, parentId: _id, level: level + 1 });
    //   });

    //   rawDocs.push({ node, _id, parentId, level });
    // }

    const existingSlugs = await CategoryModel.find({ slug: { $in: [...slugsToCheck] } }, { slug: 1 } )
                                             .select("+slug")
                                             .lean();

    if (existingSlugs.length > 0)
      throw new Error(`Duplicate slugs: ${existingSlugs.map(s => s.slug).join(', ')}`);

    const categoryDocs = await Promise.all(rawDocs.map(async ({ node, _id, parentId, level }) => {
    const     children = node.children || [];
    const  childrenIds = children.map(child => { const id = idMap.get(child);
                                                  if (!id) throw new Error(`Missing reference for child category`);
                                                  return id;
                                                });

    return {   _id,
             title: node.title,
       description: node.description || '',
              slug: node.slug,
            parent: parentId,
         ancestors: parentId 
                        ? [...(await CategoryModel.findById(parentId).select('ancestors').session(session)).ancestors, parentId]
                        : [],
             image: node.image || { url: '', alt: '' },
         metaTitle: node.metaTitle || '',
   metaDescription: node.metaDescription || '',
          keywords: node.keywords || [],
             level,
          children: childrenIds,
         createdBy: user._id   };
    }));

    const createdCategories = await CategoryModel.create(categoryDocs, { session });
    await session.commitTransaction();    
    const res = NextResponse.json({ success: true, data: createdCategories.map(c => c.toObject()), message: 'Category created successfully' }, { status: 201 } );    
    Object.entries(securityHeaders).forEach(([key, value]) => res.headers.set(key, value));
    return res;
  } catch (err) {
    await session.abortTransaction();
    const errorMsg = err.code === 11000 
      ? 'A category with this slug already exists' 
      : err.message || 'Something went wrong';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400, headers: securityHeaders }
    );
  } finally {
    session.endSession();
  }
}
