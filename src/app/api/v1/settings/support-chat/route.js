import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { z } from 'zod';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';
import securityHeaders from '../../utils/securityHeaders';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';

// Zod validation schema
const chatSupportSchema = z.array(
  z.object({
    shop: z.string(),
    provider: z.enum(['facebook', 'whatsapp', 'intercom', 'tawk']),
    link: z.string().url({ message: 'Invalid URL format' }),
    active: z.boolean().optional()
  })
);

export async function PATCH(request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json( { error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });
  

  // Parse & validate body
  const body = await request.json();
  const parsed = chatSupportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid chat support data', errors: parsed.error.flatten() },{ status: 400 });

  // Authenticate user
  const { authenticated, error: authError, data: user } = await getAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: authError || 'Not authorized' }, { status: 401 });

  // Connect to DB and get model
  const db = await vendorDbConnect();
  const Vendor = vendorModel(db);

  // Extract shop ID and supports
  const shopId = parsed.data[0].shop;
  const incomingSupports = parsed.data.map(({ provider, link, active }) => ({
    provider,
    link,
    active: active ?? true
  }));

  // Find the vendor
  const vendor = await Vendor.findOne({ referenceId: shopId });
  if (!vendor)
    return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });

  // Initialize if null
  if (!Array.isArray(vendor.chatSupport)) {
    vendor.chatSupport = [];
  }

  // Merge or insert each provider
  for (const newSupport of incomingSupports) {
    const index = vendor.chatSupport.findIndex(
      (support) => support.provider === newSupport.provider
    );

    if (index !== -1) {
      // Update existing
      vendor.chatSupport[index].link = newSupport.link;
      vendor.chatSupport[index].active = newSupport.active;
      vendor.chatSupport[index].updatedAt = new Date();
    } else {
      // Add new
      vendor.chatSupport.push({
        provider: newSupport.provider,
        link: newSupport.link,
        active: newSupport.active
      });
    }
  }

  // Save updated vendor
  await vendor.save();

  return NextResponse.json(
    { message: 'Chat support updated successfully', chatSupport: vendor.chatSupport },
    { status: 200, headers: securityHeaders() }
  );
}