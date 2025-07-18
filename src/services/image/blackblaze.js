import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { imageModel } from '@/models/Image';
import sharp from 'sharp';

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

export async function uploadShopImage({ file, shop, folder}) {
    const b2 = await authorizeB2();

    const { data: uploadData } = await b2.getUploadUrl({ bucketId: bucketId });
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(fileExtension)) 
         throw new Error(`Unsupported file type: ${file.name}`);

    if (file.size > MAX_FILE_SIZE) 
        throw new Error(`File exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);

    const         uuid = crypto.randomUUID();
    const baseFileName = `${uuid}`.replace(/[^\w.-]/g, '_');
    const     fileName = `s_${shop}/${folder}/${baseFileName}`
    const       buffer = Buffer.from(await file.arrayBuffer());
    const     metadata = await sharp(buffer).metadata();

    const uploadResponse = await b2.uploadFile({       uploadUrl: uploadData.uploadUrl,
                                                 uploadAuthToken: uploadData.authorizationToken,
                                                        fileName,
                                                            data: buffer,
                                                            mime: file.type,
                                                   contentLength: buffer.length     });

    const { data: authTokenData } = await b2.getDownloadAuthorization({       bucketId,
                                                                        fileNamePrefix: fileName,
                                                                validDurationInSeconds: 604800     });

    const baseUrl = process.env.B2_DOWNLOAD_URL_PREFIX || `https://f002.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}`;
    const downloadUrl = `${baseUrl.replace(/\/+$/, '')}/${fileName}`;

    const authorizedUrl = `https://f002.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}?Authorization=${authTokenData.authorizationToken}`;

    const auth_db = await authDbConnect();
    const Image = imageModel(auth_db)
    const result = await Image.create({ provider: 'b2',
                                        fileName: uploadResponse.data.fileName,
                                          fileId: uploadResponse.data.fileId,
                                        fileInfo: { ...uploadResponse.data.fileInfo, width: metadata.width, height: metadata.height, format: metadata.format },
                                          shopId: shop,
                                          folder,
                                     downloadUrl,
                                        bucketId: uploadResponse.data.bucketId, 
                                      bucketName: bucketName,
                              authorizationToken: authTokenData.authorizationToken,
                             authorizationExpiry: Date.now() + (604800 * 1000)           });

  return {                  id: result._id,
                      provider: result.provider,
                      fileName: result.fileName,
                        fileId: result.fileId,
                      fileInfo: result.fileInfo,
                          shop: result.shopId,
                        folder: result.folder,
                   downloadUrl: result.downloadUrl,
                      bucketId: result.bucketId,
                    bucketName: result.bucketName,
            authorizationToken: result.authorizationToken,
           authorizationExpiry: new Date(result.authorizationExpiry).toLocaleString(),
                 authorizedUrl: `https://f002.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}?Authorization=${authTokenData.authorizationToken}`     }
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

export async function createB2Bucket(bucketName, isPublic = false) {
  try {
    const b2 = await authorizeB2();
    const response = await b2.createBucket({ bucketName,
                                             bucketType: isPublic 
                                                            ? 'allPublic' 
                                                            : 'allPrivate', });

    return response.data;
  } catch (err) {
    console.error('Error creating bucket:', err.message);
    throw err;
  }
}