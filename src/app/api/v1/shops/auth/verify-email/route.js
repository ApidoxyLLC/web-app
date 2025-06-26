import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb/db';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import rateLimiter from './limiter';

const schema = z.object({ token: z.string().length(96, "Invalid token format") });

export async function POST(request) {
    // Rate limiter 
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
              request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = fingerprint || ip;
  if (!identity)  return NextResponse.json({ error: "Missing identity " }, { status: 400 });
  const rateLimit = await rateLimiter.consume(identity).catch(() => null);
  if (!rateLimit) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  
  let body;
  try { body = await request.json() } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request data" }, { status: 422 });
  const { token } = parsed.data;

  const vendorId  = request.headers.get('x-vendor-identifier');
  const host      = request.headers.get('host');
  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  
  try {
    const auth_db   = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    const shop      = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                     .select("+_id "+
                                             "+dbInfo "+
                                             "+dbInfo.uri +dbInfo.prefix")
                                     .lean();

    if (!shop) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 400 });
    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                     options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });

    const  shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const   vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const   UserModel = userModel(vendor_db);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UserModel.findOneAndUpdate({ "verification.emailVerificationToken"       : hashedToken,
                                                    "verification.emailVerificationTokenExpiry" : { $gt: Date.now() } },
                                                    { $unset: { 'verification.emailVerificationToken'       : 1,
                                                                'verification.emailVerificationTokenExpiry' : 1 },
                                                      $set  : { 'isEmailVerified': true }
                                                    }, { new: true } );
    if (!user) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    return NextResponse.json({ success: true, message: "Email verified successfully" }, { status: 200 });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}