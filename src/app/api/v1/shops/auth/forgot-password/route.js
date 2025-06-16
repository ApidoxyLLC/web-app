import { z } from 'zod';
import crypto from 'crypto';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongodb/db';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { userModel } from '@/models/auth/User';
import { shopModel } from '@/models/auth/Shop';
import rateLimiterForgetPassword from './limiter';
import sendPasswordResetEmail from './sendPasswordResetEmail';

const schema = z.object({ email: z.string().email("Invalid email format")   });

export async function POST(request) {
  // Rate limiter setup
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || null;
  const fingerprint = request.headers.get('x-fingerprint') || null;

  const identity = ip || fingerprint
  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 })

  try { await rateLimiterForgetPassword.consume(identity) } 
  catch (rateLimitError) { return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429 } );}

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json( { error: "Invalid request data", details: parsed.error.format() }, { status: 422 } );
  
  const { email } = parsed.data;

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  
  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  
  try {
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Find shop with vendorId OR host
    const shop = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                .select("+_id +name +dbInfo.uri +dbInfo.prefix")
                                .lean();

    if (!shop) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 });

    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!VENDOR_DB_URI_ENCRYPTION_KEY) {
      console.error("Missing VENDOR_DB_URI_ENCRYPTION_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 } );
    }
    
    // Decrypt database URI
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                     options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } });

    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const UserModel = userModel(vendor_db);
    
    // Find user by email
    // const user = await UserModel.findOne({ email });
    // if (!user) return NextResponse.json({ success: true, message: "If the email exists, a password reset link will be sent" }, { status: 200 });    
    
    // Generate password reset token (96 characters)
    const resetToken = crypto.randomBytes(48).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiry (1 hour)
    const FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES = parseInt(process.env.END_USER_FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES || "60", 10); // 1 hour default
    const resetTokenExpiry = Date.now() + FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES * 60 * 1000;

    const user = await UserModel.findOneAndUpdate( { email },
                                                  { $set: {
                                                      "security.forgotPasswordToken"       : hashedToken,
                                                      "security.forgotPasswordTokenExpiry" : resetTokenExpiry }
                                                  },
                                                  {
                                                    new: true,
                                                    projection: { _id: 1, email: 1, name: 1 }, 
                                                    lean: true
                                                  }
                                                );
    if (!user) return NextResponse.json({ success: true, message: "If the email exists, a password reset link will be sent" }, { status: 200 });                                                
    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}&id=${user._id}`;
    
    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name || user.email,
        resetUrl,
        shopName: shop.name
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Don't fail the request - just log the error
    }

    return NextResponse.json(
      { success: true, message: "Password reset instructions sent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}