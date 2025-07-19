import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { imageModel } from '@/models/Image';
import sharp from 'sharp';
import { bucketModel } from '@/models/auth/Bucket';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { dbConnect } from '@/lib/mongodb/db';
import { bucketModel } from '@/models/auth/Bucket';

const b2 = new B2({ applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
                      applicationKey: process.env.B2_APPLICATION_KEY      });

let lastAuth = 0;

async function authorizeB2() {
  const now = Date.now();
  if (now - lastAuth > 23 * 60 * 60 * 1000) {
    await b2.authorize();
    lastAuth = now;
  }
  return b2;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const      MAX_FILE_SIZE = parseInt(process.env.MAX_PRODUCT_IMAGE_FILE_SIZE_MB || "5", 10) * 1024 * 1024;
const           bucketId = process.env.B2_BUCKET_ID
const         bucketName = process.env.B2_BUCKET_NAME

// file, vendor, folder
export async function uploadShopImage({ file, vendor, folder, uploadBy, extraData={} }) {
    const b2 = await authorizeB2();
    const { _id, referenceId, ownerId,  dbInfo, bucketInfo } = vendor 
    
    const { dbName } = dbInfo

    let bucketName = null
    let bucketId = null

    if(bucketInfo) {
        bucketName = bucketInfo.bucketName
          bucketId = bucketInfo.bucketId
    }else {
      let newBucket;
        try {
          newBucket = await createBucketIfNotExists({
                                                      createdBy: uploadBy,
                                                      shopId: referenceId,
                                                      bucketName: referenceId,
                                                      referenceId,
                                                      bucketType: 'allPrivate',
                                                    });

          if (newBucket.error) throw new Error('Storage Bucket creation failed');

          bucketName = newBucket.bucketName;
            bucketId = newBucket.bucketId;

        } catch (error) {
          throw new Error(newBucket?.message || 'Storage Bucket creation failed');
        }
    }

    // const {  bucketName,  bucketId } = bucketInfo

    // const bucketResponse = await b2.getBucket({ bucketName })
    // if (!bucketResponse) throw new Error(`Bucket "${bucketName}" not found`);
    
    // const bucketId = bucketResponse.data.buckets[0].bucketId;

    const { data: uploadData } = await b2.getUploadUrl({ bucketId });
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(fileExtension)) 
         throw new Error(`Unsupported file type: ${file.name}`);

    if (file.size > MAX_FILE_SIZE) 
        throw new Error(`File exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);

    const         uuid = crypto.randomUUID();
    const baseFileName = `${uuid}`.replace(/[^\w.-]/g, '_');
    const     fileName = `${folder}/${baseFileName}`
    const       buffer = Buffer.from(await file.arrayBuffer());
    const     metadata = await sharp(buffer).metadata();

    const uploadResponse = await b2.uploadFile({       uploadUrl: uploadData.uploadUrl,
                                                 uploadAuthToken: uploadData.authorizationToken,
                                                        fileName,
                                                            data: buffer,
                                                            mime: file.type,
                                                   contentLength: buffer.length     });

    const backblazeUrl = `https://f000.backblazeb2.com/file/${bucketName}/${fileName}`;


    const dbUri = await decrypt({ cipherText: dbInfo.dbUri, 
                                      options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });

    // const shop_db = await dbConnect({ dbKey: dbInfo.dbName, dbUri });
    const vendor_db = await vendorDbConnect();
    const   Image = imageModel(vendor_db)
    const  result = await Image.create({ provider: 'b2',
                                         uploadBy,
                                         fileName: uploadResponse.data.fileName,
                                           fileId: uploadResponse.data.fileId,
                                         fileInfo: { ...uploadResponse.data.fileInfo, size: buffer.length, width: metadata.width, height: metadata.height, format: metadata.format, ...extraData },
                                           shopId: vendor._id,
                                    shopReference: vendor.referenceId,
                                           folder,
                                     backblazeUrl,
                                         mimeType: file.type,
                                         bucketId: uploadResponse.data.bucketId, 
                                       bucketName: bucketName                    });

  return {                  id: result._id,
                      provider: result.provider,
                      fileName: result.fileName,
                        fileId: result.fileId,
                      fileInfo: result.fileInfo,
                          shop: result.shopId,
                        folder: result.folder,
                  backblazeUrl,
                      bucketId: result.bucketId,
                    bucketName: result.bucketName,    
                }
}

async function createBucketIfNotExists({createdBy, shopId, referenceId, bucketName, bucketType = 'allPrivate'}) {
  const b2 = await authorizeB2();
  if (!bucketName) {
    bucketName = `${referenceId}`;
  }
  const exists = await checkBucketExists(bucketName);

  const vendor_db = await vendorDbConnect();
  const Bucket = bucketModel(vendor_db)
  if (!exists) {
    const response = await b2.createBucket({
      bucketName,
      bucketType, // 'allPrivate' or 'allPublic'
    });

    // Save bucket info to MongoDB
    const bucketData = response.data;
  
    const bucketDoc = new Bucket({ bucketName: bucketData.bucketName,
                                     bucketId: bucketData.bucketId,
                                   bucketType: bucketData.bucketType,
                                    createdBy,
                                       shopId             });

    
    await bucketDoc.save();

   
    const Vendor = vendorModel(vendor_db)

    await Vendor.updateOne({ referenceId }, 
                           { $set: { bucketInfo: { 
                                                  bucketName: bucketData.bucketName, 
                                                    bucketId: bucketData.bucketId  
                                                } 
                                    } 
                            })

    // Convert to object and remove _id and __v
    const { _id, __v, ...bucketInfo } = bucketDoc.toObject();
    return {
      error: false,
      message: 'Bucket created successfully',
      ...bucketInfo
    };
  } else {
    // Find and return bucket info from database, excluding _id and __v
    const bucketDoc = await Bucket.findOne({ bucketName }).lean();
    if (bucketDoc) {
      const { _id, __v, ...bucketInfo } = bucketDoc;
      return {
        error: false,
        message: 'Bucket already exists',
        ...bucketInfo
      };
    }
    return { error: true, message: 'Bucket already exists, but not found in database' };
  }
}

export async function getImageDetails(fileName, bucketId) {
  const b2 = await authorizeB2();

  const { data } = await b2.listFileNames({ bucketId,
                                              prefix: fileName,
                                        maxFileCount: 1         });
                                
  const file = data.files?.[0];
  return file?.fileName === fileName ? file : null;
}

export async function deleteImage(fileName, fileId) {
  const b2 = await authorizeB2();

  const response = await b2.deleteFileVersion({
    fileName,
    fileId,
  });

  return response.data;
}

export function buildPrivateDownloadUrl({ bucketName, fileName, authToken }) {
  return `https://f000.backblazeb2.com/file/${bucketName}/${fileName}?Authorization=${authToken}`;
}

export async function getPrivateDownloadUrl(fileName, bucketId, bucketName, validForSeconds = 300) {
  const b2 = await authorizeB2();

  const { data } = await b2.getDownloadAuthorization({  bucketId,
                                                  fileNamePrefix: fileName,
                                          validDurationInSeconds: validForSeconds  });

  return buildPrivateDownloadUrl({ fileName, bucketName, authToken: data.authorizationToken });
}

export async function createB2Bucket({bucketName, isPublic = false} ) {
  try {
    const b2 = await authorizeB2();

    const response = await b2.createBucket({  bucketName,
                                              bucketType: isPublic ? 'allPublic' : 'allPrivate' });

    return response.data;

  } catch (err) {
    console.error('Error creating bucket:', err.message);
    throw err;
  }
}

// export async function createB2Bucket(bucketName, isPublic = false, userId, shopId) {
//   try {
//     const b2 = await authorizeB2();
//     // const result = await b2.getBucket({ bucketName })
//     // const bucket = result.data.buckets[0];

//     // const fileList = await b2.listFileNames({     bucketId: bucket.bucketId, 
//     //                                           maxFileCount: 10000 });

//     // const totalSize = fileList.data.files.reduce((sum, file) => sum + file.contentLength, 0);

//     const response = await b2.createBucket({ bucketName, bucketType: 'allPrivate' });

//     return response.data;

//     // const auth_db = await authDbConnect();
//     // const Bucket = bucketModel(auth_db)

//     // const bucket = new Bucket({ bucketName: bucketData.bucketName,
//     //                               bucketId: bucketData.bucketId,
//     //                             bucketType: bucketData.bucketType,
//     //                              createdBy: userId,
//     //                                 shopId             });
//     // const savedBucket = await bucket.save();


//     // const { _id, __v, ...bucketInfo } = savedBucket.toObject();
//     // return { ...bucketData,
//     //          ...bucketInfo };
//     // const response = await b2.createBucket({ bucketName,
//     //                                          bucketType: isPublic 
//     //                                                         ? 'allPublic' 
//     //                                                         : 'allPrivate', });
//     // return response.data;
//   } catch (err) {
//     console.error('Error creating bucket:', err.message);
//     throw err;
//   }
// }

