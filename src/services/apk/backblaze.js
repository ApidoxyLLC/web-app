import mongoose from 'mongoose';
import B2 from 'backblaze-b2';
// import { createBucketIfNotExists } from '@/services/bucket/blackblaze';

import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { apkModel } from '@/models/apk/Apk'; // You'll need to create this model

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

export async function uploadAPKFile({ file, vendor, uploadBy, version, releaseNotes }) {
    const b2 = await authorizeB2();
    const { _id: shopId, referenceId, dbInfo, bucketInfo } = vendor;
    
    const { dbName, dbUri } = dbInfo;

    let bucketName = null;
    let   bucketId = null;

    if (bucketInfo) {
        bucketName = bucketInfo.bucketName;
        bucketId = bucketInfo.bucketId;
    } else {
        let newBucket;
        try {
            newBucket = await createBucketIfNotExists({
                createdBy: uploadBy,
                shopId,
                bucketName: referenceId,
                referenceId,
                bucketType: 'allPrivate'
            });

            if (newBucket.error) throw new Error('Storage Bucket creation failed');

            bucketName = newBucket.bucketName;
            bucketId = newBucket.bucketId;
        } catch (error) {
            throw new Error(newBucket?.message || 'Storage Bucket creation failed');
        }
    }

    const { data: uploadData } = await b2.getUploadUrl({ bucketId });
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    // Validate APK file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Unsupported MIME type: ${file.type}. Only APK files are allowed.`);
    }

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new Error(`Unsupported file extension: ${fileExtension}. Only .apk files are allowed.`);
    }

    if (file.size > MAX_APK_SIZE) {
        throw new Error(`APK file exceeds limit of ${MAX_APK_SIZE / 1024 / 1024}MB`);
    }

    const _id = new mongoose.Types.ObjectId();
    const baseFileName = `${_id.toString()}`.replace(/[^\w.-]/g, '_');
    const folder = 'apks';
    const fileName = `${folder}/${baseFileName}.${fileExtension}`;

    // Read file buffer (no compression for APK files)
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResponse = await b2.uploadFile({
        uploadUrl: uploadData.uploadUrl,
        uploadAuthToken: uploadData.authorizationToken,
        fileName,
        data: buffer,
        mime: file.type,
        contentLength: buffer.length
    });

    const backblazeUrl = `https://f000.backblazeb2.com/file/${bucketName}/${fileName}`;

    // Connect to vendor database and save APK metadata
    const vendor_db = await vendorDbConnect();
    const Apk = apkModel(vendor_db);

    const result = await Apk.create({
        _id,
        provider: 'b2',
        uploadBy,
        fileName: uploadResponse.data.fileName,
        fileId: uploadResponse.data.fileId,
        fileInfo: {
            ...uploadResponse.data.fileInfo,
            size: buffer.length,
            version,
            releaseNotes,
            originalName: file.name,
        },
        shopId: vendor._id,
        shopReference: vendor.referenceId,
        folder,
        backblazeUrl,
        mimeType: file.type,
        isActive: false,
        version,
        releaseNotes,
        bucketId: uploadResponse.data.bucketId,
        bucketName: bucketName
    });

    return {
        id: result._id,
        provider: result.provider,
        fileName: result.fileName,
        fileId: result.fileId,
        fileInfo: result.fileInfo,
        shop: result.shopId,
        folder: result.folder,
        backblazeUrl,
        bucketId: result.bucketId,
        bucketName: result.bucketName,
        version: result.version,
        downloadUrl: backblazeUrl,
        size: buffer.length,
        uploadedAt: result.createdAt
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