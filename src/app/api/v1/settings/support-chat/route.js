import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';
import securityHeaders from '../../utils/securityHeaders';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import chatSupportDTOSchema from './chatSupportDTOSchema';
import hasUpdatePermission from './hasUpdatePermission';

export async function PATCH(request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||  request.headers.get('x-real-ip') ||  request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) 
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });    

    // Parse & validate body
    const body = await request.json();
    const parsed = chatSupportDTOSchema.safeParse(body);
    if (!parsed.success)  return NextResponse.json({ message: 'Invalid chat support data', errors: parsed.error.flatten() }, { status: 400 });
    
    // Authenticate user and verify permissions
    const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
    if (!authenticated) return NextResponse.json({ error: authError || 'Not authorized'}, { status: 401 });    



    const { shop, provider, link } = parsed.data;  
    // Connect to DB and get model
    const     db = await vendorDbConnect();
    const Vendor = vendorModel(db);
    const vendor = await Vendor.findOne({ referenceId: shop });
    if (!vendor) return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });

    if (!hasUpdatePermission(vendor, data.userId)) 
            return NextResponse.json( { success: false, error: 'Not authorized to read customer data' }, { status: 403, headers: securityHeaders });

    const existingIndex = vendor.chatSupport?.findIndex(cs => cs.provider === provider) ?? -1;

    if (existingIndex !== -1) {
        // Update existing entry
        vendor.chatSupport[existingIndex].link = link;
        vendor.chatSupport[existingIndex].active = active;
    } else {
        // Add new entry
        vendor.chatSupport = vendor.chatSupport || []; 
        vendor.chatSupport.push({ provider, link, active: true });
    }

    const updatedVendor  = await vendor.save();
    const updatedItem = vendor.chatSupport.find(cs => cs.provider === provider);
    return NextResponse.json({ message: 'Updated Successfully', chatSupport: updatedItem }, { status: 200, headers: securityHeaders });
    // return NextResponse.json( { message: 'Chat support updated successfully',  chatSupport: updatedVendor.chatSupport  }, { status: 200, headers: securityHeaders() } );
  } catch (error) {
    console.error('Error updating chat support:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}