import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import getAuthenticatedUser from '../auth/utils/getAuthenticatedUser';
import securityHeaders from '../utils/securityHeaders';
import { uploadShopImage } from '@/services/image/blackblaze';
import uploadImageFileDTOSchema from './uploadImageFileDTOSchema';

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'uploadCategoryImage' });
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});
  
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if(!authenticated)
        return NextResponse.json({ error: "...not authorized" }, { status: 401, headers: securityHeaders });

  // Validate content type
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data'))
      return NextResponse.json({ error: 'Invalid content type. Use multipart/form-data' }, { status: 400 });

  try {
    // Parse form data
    const formData = await request.formData();
    const     file = formData.get('file');
    const   shopId = formData.get('shop');

    const parsed = uploadImageFileDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    try {
        const vendor_db = await vendorDbConnect()
        const    Vendor = vendorModel(vendor_db)
        const    vendor = await Vendor.findOne({ referenceId: shopId })
                                      .select('_id referenceId ownerId ownerId dbInfo bucketInfo')
                                      .lean();

        const image = await uploadShopImage({     file, 
                                                vendor,
                                              uploadBy: data.userId,
                                                folder: 'logo' })

        if(!image) return NextResponse.json( { error: error }, { status: 400 } );
       return NextResponse.json( { success: true, data: image }, { status: 201 });
    } catch (error) {
        console.log(error)
        return NextResponse.json( { error: error }, { status: 400 } );
    }
  } catch (error) {
    console.error('Top Level Error:', error);
    return NextResponse.json( {   error: 'Request processing failed', details: error.message  }, { status: 500 } );
  }
}
