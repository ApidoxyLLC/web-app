import mongoose from 'mongoose';
import B2 from 'backblaze-b2';
// import { createBucketIfNotExists } from '@/services/bucket/blackblaze';

import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { apkModel } from '@/models/vendor/Apk';
// import { apkModel } from '@/models/apk/Apk'; // You'll need to create this model

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

// Constants for APK files
const MAX_APK_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = ['application/vnd.android.package-archive', 'application/octet-stream'];
const ALLOWED_EXTENSIONS = ['apk'];

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function isReadableStream(obj) {
  return obj && typeof obj.on === 'function' && typeof obj.read === 'function';
}
export async function uploadAPKFile({ file, vendor, uploadBy, version, releaseNotes }) {
  let buffer;

  if (file && typeof file.arrayBuffer === 'function') {
    buffer = Buffer.from(await file.arrayBuffer());
  } else if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (isReadableStream(file)) {
    buffer = await streamToBuffer(file);
  } else if (file && file.buffer && Buffer.isBuffer(file.buffer)) {
    buffer = file.buffer;
  } else {
    throw new Error('Invalid file type. Expected Blob, Buffer, or ReadableStream.');
  }

  // Ensure B2 client is authorized before requesting upload URL
  await authorizeB2();

//   const uploadData = await b2.getUploadUrl({
//     bucketId: vendor.bucketInfo.bucketId
//   });

  const { data: uploadData } = await b2.getUploadUrl({ bucketId: vendor.bucketInfo.bucketId });

//   console.log('uploadData:', uploadData);
//     console.log('uploadData.uploadUrl:', uploadData?.uploadUrl);

  const uploadResponse = await b2.uploadFile({
    uploadUrl: uploadData.uploadUrl,
    uploadAuthToken: uploadData.authorizationToken,
    fileName: `${vendor.referenceId}/apk/${Date.now()}-${file.name || 'app.apk'}`,
    data: buffer
  });

  return {
    url: `${process.env.B2_DOWNLOAD_URL}/file/${vendor.bucketInfo.bucketName}/${uploadResponse.data.fileName}`,
    version,
    uploadedAt: new Date(),
    fileSize: buffer.length
  };
}
async function createBucketIfNotExists({createdBy, shopId, referenceId, bucketName, bucketType = 'allPrivate'}) {
  const b2 = await authorizeB2();
  if (!bucketName) bucketName = `${referenceId}`;
  
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

export function clearBucketCache(bucketName = null) {
  if (bucketName) {
    bucketCache.delete(bucketName);
  } else {
    bucketCache.clear();
  }
}