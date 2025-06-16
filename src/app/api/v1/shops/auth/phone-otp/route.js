import { z } from 'zod';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { dbConnect } from '@/app/lib/mongodb/db';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { rateLimiterPhoneToken } from './limiter';
import sendSMS from '@/services/mail/sendSMS';
// import sendSMS from '@/services/sms/sendSMS'; // Your SMS sending service
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';

const schema = z.object({ phone: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number') });

export async function POST(request) {
  let body;
  try { body = await request.json() }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid phone number format." }, { status: 422 });
  const { phone } = parsed.data;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = fingerprint || ip;
  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  const rateLimit = await rateLimiterPhoneToken.consume(`${phone}:${identity}`).catch(() => null);
  if (!rateLimit)
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  if (!vendorId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  try {
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const shop = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                .select("+_id +dbInfo " +
                                        "+dbInfo.uri "  +
                                        "+dbInfo.prefix " +
                                        "+timeLimitations.PHONE_VERIFICATION_EXPIRE_MINUTES ")
                                .lean();

    if (!shop) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const      dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                          options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });
    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const  vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const  UserModel = userModel(vendor_db);

    const user = await UserModel.findOne({ phone, $and: [ { $or: [  { isPhoneVerified: false }, 
                                                                    { isPhoneVerified: { $exists: false } }] },
                                                          { $or: [  { "verification.phoneVerificationTokenExpiry": {    $lte: Date.now() } },
                                                                    { "verification.phoneVerificationTokenExpiry": { $exists: false      } },
                                                                    { "verification.phoneVerificationToken"      : { $exists: false      } } ] } ]
                                          }).select('+_id +phone +verification +isPhoneVerified');

    if (!user) return NextResponse.json({ success: true, message: "If your phone number exists and isn't verified, you'll receive a verification code." },{ status: 200 });


    const OTP_DIGITS = parseInt(process.env.PHONE_OTP_DIGITS || "6", 10);
    const otp = crypto.randomInt(0, Math.pow(10, OTP_DIGITS)).toString().padStart(OTP_DIGITS, '0');
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const    expiry = minutesToExpiryTimestamp(Number(shop.timeLimitations?.PHONE_VERIFICATION_EXPIRE_MINUTES) || 10);

    await UserModel.updateOne({ _id: user._id },
                              { $set: { 'verification.phoneVerificationToken': hashedOtp,
                                        'verification.phoneVerificationTokenExpiry': expiry } });
    await sendSMS({   phone: user.phone, 
                    message: `Your verification code: ${otp} (valid for ${PHONE_VERIFICATION_EXPIRY} minutes)`});

    return NextResponse.json({ success: true, message: "Verification code sent" }, { status: 200 });

  } catch (error) {
    console.error("Phone token request error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}