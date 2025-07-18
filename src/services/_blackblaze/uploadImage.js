// lib/backblaze/uploadImage.js
import { authorizeB2 } from './b2Client.js';
import crypto from 'crypto';

export async function uploadImage({ buffer, fileName, mimeType, bucketId }) {
  const b2 = await authorizeB2();

  const { data: uploadUrl } = await b2.getUploadUrl({ bucketId });

  const fileId = crypto.randomUUID().replace(/[^\w.-]/g, '_');
    
  const uploadResponse = await b2.uploadFile({
    uploadUrl: uploadUrl.uploadUrl,
    uploadAuthToken: uploadUrl.authorizationToken,
    fileName,
    data: buffer,
    mime: mimeType,
    contentLength: buffer.length,
  });

  return {
    fileId: uploadResponse.data.fileId,
    fileName: uploadResponse.data.fileName,
    size: uploadResponse.data.contentLength,
    uploadTimestamp: uploadResponse.data.uploadTimestamp,
  };
}