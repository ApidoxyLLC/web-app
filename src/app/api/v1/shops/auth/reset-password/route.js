import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongodb/db';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import { rateLimiterResetPassword } from './limiter';

const schema = z.object({
  token: z.string().length(96, "Invalid token format"),
  email: z.string().email("Invalid email format"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export async function POST(request) {
  // Rate limiter setup
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || null;
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = ip || fingerprint;

  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  try { await rateLimiterResetPassword.consume(identity) } 
  catch (rateLimitError) { return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429 } ) }

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request data", details: parsed.error.format() }, { status: 422 });
  
  const { token, email, newPassword } = parsed.data;

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  
  if (!vendorId && !host) return NextResponse.json( { error: "Missing vendor identifier or host" }, { status: 400 } );
  
  
  try {
    const   auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Find shop with vendorId OR host
    const shop = await ShopModel.findOne({  $or: [{ vendorId }, { "host.domain": host }] })
                                .select("+_id +dbInfo.uri +dbInfo.prefix")
                                .lean();
    if (!shop) return NextResponse.json( { error: "Invalid vendor or host" },  { status: 404 } );
    

    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) {
      console.error("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
      return NextResponse.json( { error: "Server configuration error" }, { status: 500 } );
    }
    
    // Decrypt database URI
    const    SALT_ROUNDS =  parseInt( process.env.END_USER_BCRYPT_SALT_ROUNDS || "10", 10);
    const          dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                              options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });
    const     shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const      vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const      UserModel = userModel(vendor_db);
    const    hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const           salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    // Find user by ID and valid reset token
    const user = await UserModel.findOneAndUpdate(  {
                                                      email,
                                                      "security.resetPasswordToken": hashedToken,
                                                      "security.resetPasswordTokenExpiry": { $gt: Date.now() },
                                                      isFlagged: true
                                                    },
                                                    { $set  : { password: hashedPassword,
                                                                "security.passwordChangedAt": Date.now()  },
                                                      $unset: { "security.forgotPasswordToken": "",
                                                                "security.forgotPasswordTokenExpiry": ""  } },
                                                    { new: true,  lean: true, projection: { _id: 1, email: 1, name: 1 } }
                                                  );
    if (!user)  return NextResponse.json( { error: "Invalid or expired password reset token" }, { status: 400 });
    return NextResponse.json( { success: true, message: "Password has been reset successfully" }, { status: 200 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}