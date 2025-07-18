import { authorizeB2 } from './b2Client.js';

export async function deleteImage(fileName, fileId) {
  const b2 = await authorizeB2();

  const response = await b2.deleteFileVersion({
    fileName,
    fileId,
  });

  return response.data;
}
