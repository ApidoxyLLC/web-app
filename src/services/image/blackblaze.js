import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';
import { imageModel } from '@/models/vendor/Image';
import sharp from 'sharp';
import { bucketModel } from '@/models/auth/Bucket';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { dbConnect } from '@/lib/mongodb/db';
import mongoose from 'mongoose';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import config from '../../../config';

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
    const { _id: shopId, referenceId, ownerId,  dbInfo, bucketInfo } = vendor 
    
    const { dbName } = dbInfo

    let bucketName = null
    let bucketId = null

    if(bucketInfo) {
        bucketName = bucketInfo.bucketName
          bucketId = bucketInfo.bucketId
    }else {
      let newBucket;
        try {
          newBucket = await createBucketIfNotExists({   createdBy: uploadBy,
                                                           shopId,
                                                       bucketName: referenceId,
                                                      referenceId,
                                                       bucketType: 'allPrivate'     });

          if (newBucket.error) throw new Error('Storage Bucket creation failed');

          bucketName = newBucket.bucketName;
            bucketId = newBucket.bucketId;

        } catch (error) {
          throw new Error(newBucket?.message || 'Storage Bucket creation failed');
        }
    }

    const { data: uploadData } = await b2.getUploadUrl({ bucketId });
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(fileExtension)) 
         throw new Error(`Unsupported file type: ${file.name}`);

    if (file.size > MAX_FILE_SIZE) 
        throw new Error(`File exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    const          _id = new mongoose.Types.ObjectId();
    const baseFileName = `${_id.toString()}`.replace(/[^\w.-]/g, '_');
    const     fileName = `${folder}/${baseFileName+'.'+fileExtension}`

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const imageSharp = sharp(originalBuffer);
    // const       buffer = Buffer.from(await file.arrayBuffer());
    let compressedBuffer;
    if (file.type === 'image/jpeg') {
      compressedBuffer = await imageSharp.jpeg({ quality: 75 }).toBuffer();
    } else if (file.type === 'image/png') {
      compressedBuffer = await imageSharp.png({ compressionLevel: 9 }).toBuffer();
    } else if (file.type === 'image/webp') {
      compressedBuffer = await imageSharp.webp({ quality: 75 }).toBuffer();
    } else if (file.type === 'image/avif') {
      compressedBuffer = await imageSharp.avif({ quality: 50 }).toBuffer();
    } else {
      throw new Error(`Unsupported file type for compression: ${file.type}`);
    }

    const     metadata = await sharp(compressedBuffer ).metadata();

    const uploadResponse = await b2.uploadFile({       uploadUrl: uploadData.uploadUrl,
                                                 uploadAuthToken: uploadData.authorizationToken,
                                                        fileName,
                                                            data: compressedBuffer,
                                                            mime: file.type,
                                                   contentLength: compressedBuffer.length     });

    const backblazeUrl = `https://f000.backblazeb2.com/file/${bucketName}/${fileName}`;


    // const dbUri = await decrypt({ cipherText: dbInfo.dbUri, 
    //                                   options: { secret: config.vendorDbUriEncryptionKey } });

    // const shop_db = await dbConnect({ dbKey: dbInfo.dbName, dbUri });
    const vendor_db = await vendorDbConnect();
    const     Image = imageModel(vendor_db)
    const    result = await Image.create({       _id,
                                            provider: 'b2',
                                            uploadBy,
                                            fileName: uploadResponse.data.fileName,
                                              fileId: uploadResponse.data.fileId,
                                            fileInfo: { ...uploadResponse.data.fileInfo, size: compressedBuffer.length, width: metadata.width, height: metadata.height, format: metadata.format, ...extraData },
                                              shopId: vendor._id,
                                       shopReference: vendor.referenceId,
                                              folder,
                                        backblazeUrl,
                                            mimeType: file.type,
                                            isActive: false,
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

export async function checkBucketExists(bucketName) {
  try {
    const b2 = await authorizeB2();
    
    // List all buckets in the account
    const response = await b2.listBuckets();
    
    // Find the bucket by name
    const bucket = response.data.buckets.find(b => b.bucketName === bucketName);
    
    if (bucket) {
      return {
        exists: true,
        bucket: {
          id: bucket.bucketId,
          name: bucket.bucketName,
          type: bucket.bucketType,
          createdAt: new Date(bucket.createdAt).toISOString()
        }
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking bucket existence:', error);
    throw new Error(`Failed to check bucket existence: ${error.message}`);
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

export async function downloadImage({bucket, folder, file}) {
  try {
    await authorizeB2();
    return await b2.downloadFileByName({
                      bucketName: bucket,
                      fileName: `${file}`,
                      responseType: 'stream',
                    });
  } catch (error) {
    console.log(error)
    throw new Error (error)
  }
    
}

// export async function deleteImageFile({fileName, fileId}) {
//   const b2 = await authorizeB2();
//   const response = await b2.deleteFileVersion({ fileName, fileId });
//   return response.data;
// }  


export async function deleteImage({ bucketId, fileName, fileId }) {
  if (!bucketId || (!fileName && !fileId)) return { success: false, message: 'bucketId and either fileName or fileId are required.' };
  
  try {
    // Authenticate
    const b2 = await authorizeB2();

    // If we have only fileName, fetch fileId
    let finalFileId = fileId;
    if (!finalFileId && fileName) {
      const { data } = await b2.listFileNames({ bucketId,
                                                startFileName: fileName,
                                                maxFileCount: 1
                                              });

      const file = data.files.find(f => f.fileName === fileName);
      if (!file) {
        return { success: false, message: 'File not found in bucket.' };
      }
      finalFileId = file.fileId;
    }

    // Delete file
    await b2.deleteFileVersion({
      fileId: finalFileId,
      fileName: fileName || undefined
    });

    return { success: true, message: 'File deleted successfully.' };
  } catch (error) {
    console.error('Error deleting file from B2:', error);
    return { success: false, message: error.message };
  }
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

export async function createB2Bucket({bucketName, createdBy, shopId,  isPublic = false} ) {

  try {
    await authorizeB2();
    const response = await b2.createBucket({  bucketName,
                                              bucketType: isPublic ? 'allPublic' : 'allPrivate' });
    const vendor_db = await vendorDbConnect();
    const Bucket = bucketModel(vendor_db)
    const bucketData = response.data;
    
    const bucketDoc = new Bucket({ bucketName: bucketData.bucketName,
                                     bucketId: bucketData.bucketId,
                                   bucketType: bucketData.bucketType,
                                    createdBy,
                                       shopId             });
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

