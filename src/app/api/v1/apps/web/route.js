import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import webAppDTOSchema from "./webAppDTOSchema";
import { deleteImageFile } from "@/services/image/blackblaze";
import { imageModel } from "@/models/vendor/Image";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import config from "../../../../../../config";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ip =  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.socket?.remoteAddress || "";
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createShop' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });

  const parsed = webAppDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "...not authorized" }, { status: 401 });

    try {
      const vendor_db = await vendorDbConnect();
      const    Vendor = vendorModel(vendor_db);


      // Find vendor with user check
      const vendor = await Vendor.findOne({ referenceId: parsed.data.shop })
                                 .select("_id ownerId dbInfo bucketInfo secrets expirations primaryDomain domains userId")
                                 .lean();

      if(!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

      // Verify user owns the vendor
      if (vendor.ownerId.toString() !== data.userId.toString())
          return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });

      let image = null;
      if(parsed.data.logo){
          // if (!parsed.data.imageId) 
          //     return NextResponse.json({ error: "imageId is required when providing an image" }, { status: 400 });
          const ImageModel = imageModel(vendor_db);
          const imageData = await ImageModel.findOne({ fileName: parsed.data.logo });
          if (!imageData) 
              return NextResponse.json({ error: "Image not found" }, { status: 404 });

          const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                           options: { secret: config.vendorDbUriEncryptionKey }  });
      
          const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });

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


            //   Promise.all([...fileToDelete.map(item => deleteImageFile({fileName: item.fileName, fileId: item.fileId})), 
            //                     ImageModel.deleteMany({ bucketName: imageData.bucketName, folder: imageData.folder})]);
          } catch (error) {
              return NextResponse.json({ error: "Image transfer error" }, { status: 400 });
          }
      }

      const payload = { 
               web: { ...(image && {  logo: image.fileName }),
                                     title: parsed.data.title                  },
          metadata: { description: parsed.data.metaDescription,
                         keywords: parsed.data.metaTags.split(',').map(word => word.trim()).filter(word => word.length > 0)  }      
      };

      // Parallel updates without transaction
    //   const [updatedVendor, 
    //            updatedShop] = await Promise.all([ Vendor.findByIdAndUpdate( vendor._id,
    //                                                                         { $set: payload },
    //                                                                         { new: true } ).select('metadata web'),
    //                                               Shop.findByIdAndUpdate( vendor._id,
    //                                                                       { $set: payload },
    //                                                                       { new: true } ).select('metadata web')      ]);


        const updatedVendor  = await Vendor.findByIdAndUpdate( vendor._id,
                                                                            { $set: payload },
                                                                            { new: true } ).select('metadata web');
      if (!updatedVendor) 
          throw new Error('Failed to update one or both resources');

      return NextResponse.json({ success: true, data: updatedVendor }, { status: 200 });
      
  } catch (error) {
      console.error('WebApp Creation Error:', error);
      return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
