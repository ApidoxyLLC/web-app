import { z } from 'zod';
import crypto from 'crypto';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongodb/db';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import { rateLimiterVerifyToken } from './limiter';

// Create schema for query parameters
const schema = z.object({ token: z.string().length(96, "Invalid token format") });

export async function GET(request) {
//   Rate limiter setup
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || null;
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = ip || fingerprint;

  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });
  
  try { await rateLimiterVerifyToken.consume(identity) } 
  catch (rateLimitError) { return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429 }) }

  // Get search parameters from URL
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Validate required parameters exist
  if (!token) return NextResponse.json( { error: "Missing required information... " }, { status: 400 } );
  const parsed = schema.safeParse({ token });
  if (!parsed.success) return NextResponse.json({ error: "Invalid parameters", details: parsed.error.format() }, { status: 422 });
  
  const vendorId = request.headers.get('x-vendor-identifier');
  const host     = request.headers.get('host');
  if (!vendorId && !host) return NextResponse.json({ error: "Missing host" }, { status: 400 });
  
  try {
    const auth_db   = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Find shop with vendorId OR host
    const shop = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                .select("+_id +dbInfo.uri +dbInfo.prefix")
                                .lean();

    if (!shop) return NextResponse.json( { error: "Invalid vendor or host" }, { status: 404 });
    
    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) {
      console.error("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                     options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });

    const       shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const        vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const        UserModel = userModel(vendor_db);
    const      hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const       resetToken = crypto.randomBytes(48).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const RESET_PASSWORD_TOKEN_EXPIRE = Number(process.env.END_USER_RESET_PASSWORD_TOKEN_EXPIRE_MINUTES)
    const tokenExpiry = Date.now() + (RESET_PASSWORD_TOKEN_EXPIRE * 60 * 1000);
    const user = await UserModel.findOneAndUpdate(  { "security.forgotPasswordToken": hashedToken,
                                                      "security.forgotPasswordTokenExpiry": { $gt: Date.now() } },
                                                    { $set    : { "security.resetPasswordToken"       : hashedResetToken,
                                                                  "security.resetPasswordTokenExpiry" : tokenExpiry,
                                                                  "security.isFlagged"                : true              },
                                                      $unset  : { "security.forgotPasswordToken": "",
                                                                  "security.forgotPasswordTokenExpiry": ""                } },
                                                    { new: true, projection: { _id: 1, email: 1, name: 1 }, lean: true } );

    if (!user) { return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 })}

    return NextResponse.json( { success : true, token: resetToken, email: user.email,
                                expireAt: new Date(tokenExpiry).toISOString() } );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json( { error: "Internal server error" }, { status: 500 } );
  }
}