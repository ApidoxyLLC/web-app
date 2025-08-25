import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import getAuthenticatedUser from '../../../auth/utils/getAuthenticatedUser';
import { uploadAPKFile } from '@/services/apk/backblaze';
import uploadAPKFileDTOSchema from './uploadAPKFileDTOSchema';

export const runtime = 'nodejs';

export async function POST(req) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });
  

  // Authentication
  // const { authenticated, data } = await getAuthenticatedUser(req);
  // if (!authenticated) {
  //   return NextResponse.json(
  //     { error: 'Not authorized' },
  //     { status: 401, headers: securityHeaders }
  //   );
  // }


  // Validate content type
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) return NextResponse.json({ error: 'Invalid content type. Use multipart/form-data' }, { status: 400 });
  

  try {
    // Read entire request body as Buffer (no 5MB limit)
    const reader = req.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));

    // Extract boundary from Content-Type
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return NextResponse.json({ error: 'Boundary not found' }, { status: 400 });
    }

    // Simple multipart parser (single file + fields)
    const parts = buffer
      .toString('binary')
      .split(`--${boundary}`)
      .filter(p => p.trim() && p.trim() !== '--');

    let file;
    let shopId, version, releaseNotes;

    for (const part of parts) {
      const [rawHeaders, rawBody] = part.split('\r\n\r\n');
      const headers = rawHeaders.split('\r\n').filter(Boolean);
      const disposition = headers.find(h => h.toLowerCase().includes('content-disposition'));
      if (!disposition) continue;

      const nameMatch = disposition.match(/name="([^"]+)"/);
      const filenameMatch = disposition.match(/filename="([^"]+)"/);

      if (filenameMatch) {
        // File part
        const fileBuffer = Buffer.from(
          rawBody.replace(/\r\n--$/, ''), // remove trailing boundary dashes
          'binary'
        );
        file = {
          name: filenameMatch[1],
          size: fileBuffer.length,
          type: headers.find(h => h.toLowerCase().startsWith('content-type'))?.split(':')[1]?.trim() || 'application/octet-stream',
          buffer: fileBuffer,
        };
      } else if (nameMatch) {
        const value = rawBody.replace(/\r\n--$/, '').trim();
        if (nameMatch[1] === 'shop') shopId = value;
        if (nameMatch[1] === 'version') version = value;
        if (nameMatch[1] === 'releaseNotes') releaseNotes = value;
      }
    }

    const body = { file, shop: shopId, version, releaseNotes };
    const parsed = uploadAPKFileDTOSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // DB lookup
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: shopId })
      .select('_id referenceId ownerId dbInfo bucketInfo')
      .lean();

    // if (!vendor || vendor.ownerId.toString() !== data.userId) {
    //   return NextResponse.json(
    //     { error: 'Not authorized to upload APKs for this vendor' },
    //     { status: 403 }
    //   );
    // }

    // Upload file
    const apkData = await uploadAPKFile({
      file,
      vendor,
      uploadBy: "68760517518176e300eddf60",
      version: "0.0.1",
      releaseNotes: "hgjhgjhfgdfhjgkjh",
    });

    if (!apkData) {
      return NextResponse.json({ error: 'Failed to upload APK' }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {        url: apkData.url, 
                   version: apkData.version, 
                uploadedAt: apkData.uploadedAt, 
                  fileSize: apkData.fileSize }, }, { status: 201 } );
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Request processing failed', details: err.message },
      { status: 500 }
    );
  }
}