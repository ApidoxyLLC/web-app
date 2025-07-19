import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

export async function GET(req, { params }) {
  const { shop, folder, file } = params;

  console.log('Store:', store);
  console.log('Category:', category);


  const fileName = params.fileName; // from dynamic route [fileName]
  const bucketName = process.env.B2_BUCKET_NAME;

  try {
    await b2.authorize(); // Must authorize before every download unless cached

    const response = await b2.downloadFileByName({
      bucketName,
      fileName,
      responseType: 'stream',
    });

    const headers = new Headers();
    headers.set('Content-Type', response.data.headers['content-type'] || 'image/jpeg');
    headers.set('Content-Length', response.data.headers['content-length']);

    return new NextResponse(response.data, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('B2 Download Error:', err.message);
    return new NextResponse('File not found', { status: 404 });
  }
}