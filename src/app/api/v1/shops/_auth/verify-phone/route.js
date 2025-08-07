import { z } from 'zod';
import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import { rateLimiterPhoneOTP } from './limiter';

const OTP_LENGTH = Number(process.env.END_USER_PHONE_OTP_LENGTH);
const schema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 characters").max(20),
    otp: z.string().length(OTP_LENGTH,  `OTP must be ${OTP_LENGTH} characters`)
});

export async function POST(request) {
  // Rate limiter setup
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = fingerprint || ip;
  
  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
  try { await rateLimiterPhoneOTP.consume(identity) } 
  catch (rateLimitError) { return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })}

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request data", details: parsed.error.format() },{ status: 422 });
  const { phone, otp } = parsed.data;
  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  try {
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Find shop with vendorId OR host
    const shop = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                .select("+_id "+
                                        "+dbInfo "+
                                        "+dbInfo.uri "+
                                        "+dbInfo.prefix")
                                .lean();

    if (!shop) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) {
      console.error("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 } ); 
    }
    
    // Decrypt database URI
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                     options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });

    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const vendor_db  = await dbConnect({ dbKey: shopDbName, dbUri });
    const UserModel  = userModel(vendor_db);
    
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