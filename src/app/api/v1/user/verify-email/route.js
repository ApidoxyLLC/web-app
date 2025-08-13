import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { getVendor } from '@/services/vendor/getVendor';

const schema = z.object({ token: z.string().min(32) });

export async function POST(request) {
  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const vendorId = request.headers.get('x-vendor-identifier');
  const     host = request.headers.get('host');

  // Rate limiter 
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const { allowed, retryAfter } = await applyRateLimit({  key: `${host}:${ip}` });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );


  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request data" }, { status: 422 });
  const { token } = parsed.data;

  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  
  try {
    const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });

    const   User = userModel(shop_db);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOneAndUpdate( { 
                                                "verification.emailVerificationToken"       : hashedToken, 
                                                "verification.emailVerificationTokenExpiry" : { $gt: Date.now() } 
                                              }, 
                                              { 
                                                $unset: { 'verification.emailVerificationToken'      : 1, 
                                                          'verification.emailVerificationTokenExpiry': 1 }, 
                                                  $set: { isEmailVerified: true } 
                                              },
                                              { 
                                                       new: true, 
                                                projection: { email: 1, isEmailVerified: 1 } 
                                              }
                                            );

    if (!user) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    return NextResponse.json({ success: true, message: "Email verified successfully", valid: true, email: user.email }, { status: 200 });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}