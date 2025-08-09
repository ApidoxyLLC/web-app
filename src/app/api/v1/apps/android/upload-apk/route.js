import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import getAuthenticatedUser from '../../../auth/utils/getAuthenticatedUser';
import securityHeaders from '../../../utils/securityHeaders';
// import { uploadAPKFile } from '@/services/file/blackblaze';

import uploadAPKFileDTOSchema from './uploadAPKFileDTOSchema'; // You'll need to create this schema

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'uploadAPKFile' });
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});
  
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if(!authenticated)
    return NextResponse.json({ error: "Not authorized" }, { status: 401, headers: securityHeaders });

  // Validate content type
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data'))
    return NextResponse.json({ error: 'Invalid content type. Use multipart/form-data' }, { status: 400 });

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const shopId = formData.get('shop');
    const version = formData.get('version');
    const releaseNotes = formData.get('releaseNotes');

    const body = {
      file,
      shop: shopId,
      version,
      releaseNotes
    };

    const parsed = uploadAPKFileDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
      const vendor_db = await vendorDbConnect();
      const Vendor = vendorModel(vendor_db);
      const vendor = await Vendor.findOne({ referenceId: shopId })
                                .select('_id referenceId ownerId ownerId dbInfo bucketInfo')
                                .lean();

      // Verify user has permission to upload APKs for this vendor
      if (vendor.ownerId.toString() !== data.userId) {
        return NextResponse.json({ error: "Not authorized to upload APKs for this vendor" }, { status: 403 });
      }

      const apkData = await uploadAPKFile({ 
        file, 
        vendor,
        uploadBy: data.userId,
        version: parsed.data.version,
        releaseNotes: parsed.data.releaseNotes
      });

      if (!apkData) return NextResponse.json({ error: "Failed to upload APK" }, { status: 400 });
      
      return NextResponse.json({ 
        success: true, 
        data: {
          url: apkData.url,
          version: apkData.version,
          uploadedAt: apkData.uploadedAt,
          fileSize: apkData.fileSize
        } 
      }, { status: 201 });
    } catch (error) {
      console.error('APK Upload Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Top Level Error:', error);
    return NextResponse.json({ 
      error: 'Request processing failed', 
      details: error.message  
    }, { status: 500 });
  }
}