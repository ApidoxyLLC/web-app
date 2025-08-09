import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';
import securityHeaders from '../utils/securityHeaders';
import { imageModel } from '@/models/vendor/Image';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { deleteImageFile } from '@/services/image/blackblaze';
import logoDTOSchema from './policyDTOSchema';
import hasUpdateLogoPermission from './hasUpdateLogoPermission';
import getAuthenticatedUser from '../auth/utils/getAuthenticatedUser';
import config from '../../../../../config';

export async function PATCH(request) {
  let body;
  try   { body = await request.json(); } 
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: securityHeaders });}

//   const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') ||request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip  });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if(!authenticated) return NextResponse.json({ error: "...not authorized" }, { status: 401 });
 
  const parsed = logoDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

  try {
    const { shop, image } = parsed.data;
    const       vendor_db = await vendorDbConnect();
    const          Vendor = vendorModel(vendor_db);
    const      ImageModel = imageModel(vendor_db);

    const vendor = await Vendor.findOne({ referenceId: shop })
                               .select( "+_id +logo +dbInfo +secrets +expirations")
                               .lean();

    if (!vendor) return NextResponse.json({ success: false, error: 'Inconsistent Data...' }, { status: 400, headers: securityHeaders });

    // Put authorization
    if (!hasUpdateLogoPermission(vendor, data.userId))
      return NextResponse.json({ success: false, error: 'Authorization failed' }, { status: 400, headers: securityHeaders });



    
    const imageData = await ImageModel.findOne({ fileName: image });
    if (!imageData) return NextResponse.json({ error: "Image not found" }, { status: 404 });

    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                     options: { secret: config.vendorDbUriEncryptionKey } });
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    try {
        const ShopImage = imageModel(shop_db);
        await new ShopImage({ ...imageData.toObject() }).save();

        const update = {};
        if (imageData._id !== undefined)       update['logo._id']       = imageData._id;
        if (imageData.imageName !== undefined) update['logo.imageName'] = imageData.fileName.trim().toLowerCase();
        
        const updatedVendor = await Vendor.findByIdAndUpdate( vendor._id,
                                                                {            $set: update },

                                                                {             new: true, 
                                                                    runValidators: true }
                                                            );
        if (!updatedVendor)  throw new Error('Image data save error');
        const fileToDelete = await ImageModel.find({ bucketName: imageData.bucketName,
                                                         folder: imageData.folder,
                                                            _id: { $ne: imageData._id } // not equal
                                                });
        (async () => {
            try {
                await Promise.all([ ...fileToDelete.map(item => deleteImageFile({ fileName: item.fileName, fileId: item.fileId }) ),
                                    ImageModel.deleteMany({ bucketName: imageData.bucketName,
                                                                folder: imageData.folder       })     ]);
            } catch (err) { console.error("Background deletion failed:", err); }
        })();
        return NextResponse.json( { success: true, data: updatedVendor }, { status: 200, headers: securityHeaders });
    } catch (error) {
        return NextResponse.json({ error: "Image transfer error" }, { status: 400 });
    }

  } catch (error) {
    console.error("Unexpected error during category creation:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }) }, { status: 500, headers: securityHeaders });
  }
}
