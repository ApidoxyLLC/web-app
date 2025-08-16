import { z } from 'zod';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
// import { userModel } from '@/models/auth/User';
// import { shopModel } from '@/models/auth/Shop';
// import { decrypt } from '@/lib/encryption/cryptoEncryption';
// import { rateLimiterPhoneToken } from './limiter';
import sendSMS from '@/services/mail/sendSMS';
import { getVendor } from '@/services/vendor/getVendor';
// import sendSMS from '@/services/sms/sendSMS'; // Your SMS sending service
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';

const schema = z.object({ phone: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number') });

export async function POST(request) {

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
  let body;
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid phone number format." }, { status: 422 });
  const { phone } = parsed.data;

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  if (!vendorId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  try {
    const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
    const  User = userModel(shop_db);

    const user = await User.findOne({ phone, $and: [ { $or: [  { isPhoneVerified: false }, 
                                                                    { isPhoneVerified: { $exists: false } }] },
                                                          { $or: [  { "verification.phoneVerificationOTPExpiry": {    $lte: Date.now() } },
                                                                    { "verification.phoneVerificationOTPExpiry": { $exists: false      } },
                                                                    { "verification.phoneVerificationOTP"      : { $exists: false      } } ] } ]    })
                           .select('+_id +phone +verification +isPhoneVerified');

    if (!user) return NextResponse.json({ success: true, message: "If your phone number exists and isn't verified, you'll receive a verification code." },{ status: 200 });


    const OTP_DIGITS = parseInt(process.env.PHONE_OTP_DIGITS || "6", 10);
    const        otp = crypto.randomInt(0, Math.pow(10, OTP_DIGITS)).toString().padStart(OTP_DIGITS, '0');
    const  hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const     expiry = minutesToExpiryTimestamp(Number(shop.timeLimitations?.PHONE_VERIFICATION_EXPIRE_MINUTES) || 10);

    await UserModel.updateOne({ _id: user._id },
                              { $set: { 'verification.phoneVerificationOTP': hashedOtp,
                                        'verification.phoneVerificationOTPExpiry': expiry } });
    await sendSMS({   phone: user.phone, 
                    message: `Your verification code: ${otp} (valid for ${PHONE_VERIFICATION_EXPIRY} minutes)`});

    return NextResponse.json({ success: true, message: "Verification code sent" }, { status: 200 });

  } catch (error) {
    console.error("Phone token request error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}