import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import { downloadImage } from '@/services/image/blackblaze';
// import { headers } from 'next/headers';
export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { shop, folder, file } = await params;
  try {

    const response = await downloadImage({ bucket: shop, folder, file })

    const stream = response.data;
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const contentLength = response.headers['content-length'];

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(stream, { status: 200, headers });
  } catch (err) {
    console.error('B2 Download Error:', err.message);
    return new NextResponse('File not found', { status: 404 });
  }
}