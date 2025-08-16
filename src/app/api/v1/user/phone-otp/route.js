import { z } from 'zod';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import sendSMS from '@/services/mail/sendSMS';
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';

const schema = z.object({ phone: z.string().regex(/^\d{10,15}$/, 'Invalid phone number') });

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.ip || "";
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
  let body;
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid phone number format." }, { status: 422 });
  const { phone } = parsed.data;

  const referenceId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  if (!referenceId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  try {
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
    const  User = userModel(shop_db);

    const user = await User.findOne({ phone, $and: [ { $or: [  { isPhoneVerified: false              }, 
                                                               { isPhoneVerified: { $exists: false } }] },
                                                     { $or: [  { "verification.phoneVerificationOTPExpiry": { $lte: Date.now() } },
                                                               { "verification.phoneVerificationOTPExpiry": { $exists: false      } },
                                                               { "verification.phoneVerificationOTP"      : { $exists: false      } } ] } ]    })
                           .select('+_id +phone +verification +isPhoneVerified');

    if (!user) return NextResponse.json({ success: true, message: "If your phone number exists and isn't verified, you'll receive a verification code." },{ status: 200 });

    const OTP_DIGITS = config.phoneOtpDigits || 6
    const        otp = crypto.randomInt(0, Math.pow(10, OTP_DIGITS)).toString().padStart(OTP_DIGITS, '0');
    const  hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const     expiry = minutesToExpiryTimestamp(config.phoneVerificationDefaultExpireMinutes || 10);

    await User.updateOne({ _id: user._id },
                         { $set: { 'verification.phoneVerificationOTP'      : hashedOtp,
                                   'verification.phoneVerificationOTPExpiry': expiry } });

    // await sendSMS({   phone: user.phone, 
    //                 message: `Your verification code: ${otp} (valid for ${(config.phoneVerificationDefaultExpireMinutes - 1)} minutes)`});

    try {
          await sendSMS({ phone: user.phone, message: `Your code is: ${otp}` });
   } catch (smsError) {
          console.error("SMS sending failed:", smsError);
          // Consider whether to:
          // 1. Still return success (security consideration)
          // 2. Log but don't reveal failure to client
          return NextResponse.json({ success: true, message: "If your number exists, you'll receive a code" }, { status: 200 } );
    }
    return NextResponse.json({ success: true, message: "Verification code sent" }, { status: 200 });
  } catch (error) {
    console.error("Phone token request error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
