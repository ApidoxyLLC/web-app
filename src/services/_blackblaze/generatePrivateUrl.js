import { authorizeB2 } from './b2Client.js';

export function buildPrivateDownloadUrl({ bucketName, fileName, authToken }) {
  return `https://f000.backblazeb2.com/file/${bucketName}/${fileName}?Authorization=${authToken}`;
}

export async function getPrivateDownloadUrl(fileName, bucketId, bucketName, validForSeconds = 300) {
  const b2 = await authorizeB2();

  const { data } = await b2.getDownloadAuthorization({
    bucketId,
    fileNamePrefix: fileName,
    validDurationInSeconds: validForSeconds,
  });

  return buildPrivateDownloadUrl({ fileName, bucketName, authToken: data.authorizationToken });
}