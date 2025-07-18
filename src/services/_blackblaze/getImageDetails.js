import { authorizeB2 } from './b2Client.js';

export async function getImageDetails(fileName, bucketId) {
  const b2 = await authorizeB2();

  const { data } = await b2.listFileNames({
    bucketId,
    prefix: fileName,
    maxFileCount: 1,
  });

  const file = data.files?.[0];
  return file?.fileName === fileName ? file : null;
}