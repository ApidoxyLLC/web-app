import { NextResponse } from 'next/server';
import { categoryModel } from '@/models/shop/product/Category';
import { categoryDTOSchema } from './categoryDTOSchema';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';
import securityHeaders from '../utils/securityHeaders';
import { imageModel } from '@/models/vendor/Image';
import getAuthenticatedUser from '../auth/utils/getAuthenticatedUser';
import config from '../../../../../config';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { deleteImageFile } from '@/services/image/blackblaze';

const MAX_CATEGORY_DEPTH = parseInt(process.env.MAX_CATEGORY_DEPTH || '5', 10);

export async function POST(request) {
  let body;
  try { body = await request.json();} 
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: securityHeaders });}

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createCategory' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if(!authenticated) 
      return NextResponse.json({ error: "...not authorized" }, { status: 401 });
 
  const parsed = categoryDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

  try {
    const { shop, slug: inputSlug } = parsed.data;
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    const vendor = await Vendor.findOne({ referenceId: shop })
                                  .select( "+_id +dbInfo +secrets +expirations")
                                  .lean();

    if (!vendor) 
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400, headers: securityHeaders });

    if (!vendor.ownerId || data.userId.toString() !== vendor.ownerId.toString())
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400, headers: securityHeaders });

    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                    options: { secret: config.vendorDbUriEncryptionKey } });
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const Category = categoryModel(shop_db);

    const slugExist = await Category.exists({ slug: inputSlug });
    if (slugExist)
      return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

      // New attach
    let image = null;
    if(parsed.data.image){
        // if (!parsed.data.imageId) 
        //     return NextResponse.json({ error: "imageId is required when providing an image" }, { status: 400 });
        const ImageModel = imageModel(vendor_db);
        const imageData = await ImageModel.findOne({ fileName: parsed.data.image });
        if (!imageData) return NextResponse.json({ error: "Image not found" }, { status: 404 });

        try {
            const ShopImage = imageModel(shop_db);
            image = await new ShopImage({ ...imageData.toObject() }).save();

            if (!image)
                return NextResponse.json({ error: "Image not found" }, { status: 404 });
            const fileToDelete = await ImageModel.find({ bucketName: imageData.bucketName,
                                                             folder: imageData.folder,
                                                                _id: { $ne: imageData._id } // not equal
                                                      });
              (async () => {
                  try {
                      await Promise.all([
                      ...fileToDelete.map(item =>
                          deleteImageFile({ fileName: item.fileName, fileId: item.fileId })
                      ),
                      ImageModel.deleteMany({
                          bucketName: imageData.bucketName,
                          folder: imageData.folder
                      })
                      ]);
                  } catch (err) {
                      console.error("Background deletion failed:", err);
                  }
              })();
        } catch (error) {
            return NextResponse.json({ error: "Image transfer error" }, { status: 400 });
        }
    }

    let parent = null 
    if(parsed?.data?.parent){
      parent = await Category.findById(parsed.data.parent).select('ancestors')
      if(!parent)
        return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );
    }
    
    if (parent && ((parent.level || 0) + 1) > MAX_CATEGORY_DEPTH) 
      return NextResponse.json({ success: false, error: `Category depth exceeds maximum allowed (${MAX_CATEGORY_DEPTH})` }, { status: 422, headers: securityHeaders });

    const payload = {                      title: parsed.data.title,
                                            slug: parsed.data.slug,
    ...(parsed.data.description && { description: parsed.data.description}),
    ...(image                   && {       image: {       _id: image._id, 
                                                    imageName: image.fileName}}),
    ...(parent                  && {      parent: parent._id, 
                                       ancestors: [...(parent.ancestors || []), parent._id],
                                           level: (parent.level || 0) + 1}),
                                       createdBy: vendor.userId }

    const session = await shop_db.startSession();
    try {
        const result = await session.withTransaction(async () => {
          const [category] = await Category.create([{ ...payload }], { session });
          if (parent ) {
            await Category.updateOne({ _id: parent._id }, { $addToSet: { children: category._id } }, { session });
          }
          const res = NextResponse.json({ success: true, data: category, message: 'Category created successfully' }, { status: 201 } );    
          Object.entries(securityHeaders).forEach(([key, value]) => res.headers.set(key, value));
          return res;
        });
        return result;
        
    } catch (error) {
        console.error("Transaction failed:", error);
  return NextResponse.json({ success: false, error: 'Category creation failed' }, { status: 500 });
    }finally{
      session.endSession();
    }
  } catch (error) {
    console.error("Unexpected error during category creation:", error);
  return NextResponse.json({
    success: false,
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  }, { status: 500, headers: securityHeaders });
  }
}
