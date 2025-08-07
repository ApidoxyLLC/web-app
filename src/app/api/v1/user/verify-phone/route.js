import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import verifyPhoneDTOSchema from './verifyPhoneDTOSchema';
import { getVendor } from '@/services/vendor/getVendor';
import { userModel } from '@/models/shop/shop-user/ShopUser';



export async function POST(request) {
  // Rate limiter setup
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

    let body;
    try { body = await request.json() } 
    catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const fingerprint = request.headers.get('x-fingerprint') || null;
  // const identity = fingerprint || ip;
  
  const parsed = verifyPhoneDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request data", details: parsed.error.format() },{ status: 422 });
  const { phone, otp } = parsed.data;

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');

  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  try {
    const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
    const UserModel = userModel(shop_db);
    
    // Hash OTP for comparison
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    
    // Update user and verify phone
    const updatedUser = await UserModel.findOneAndUpdate( {  phone,
                                                              "verification.phoneVerificationOTP"       : hashedOTP,
                                                              "verification.phoneVerificationOTPExpiry" : { $gt: Date.now() } 
                                                            },
                                                            { $unset: { "verification.phoneVerificationOTP"      : "",
                                                                        "verification.phoneVerificationOTPExpiry": "" },
                                                              $set  : { isPhoneVerified: true  } 
                                                            }
                                                          );

    if (!updatedUser) return NextResponse.json( { error: "Invalid OTP, expired OTP, or phone not found" }, { status: 404 } );
    return NextResponse.json( { success: true, message: "Phone number verified successfully" }, { status: 200 } );

  } catch (error) {
    console.error("Phone verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}