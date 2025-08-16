import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
// import { rateLimiterResetPassword } from './limiter';

const schema = z.object({
  token: z.string().length(96, "Invalid token format"),
  email: z.string().email("Invalid email format"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  // try { await rateLimiterResetPassword.consume(identity) } 
  // catch (rateLimitError) { return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429 } ) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid  email address..." }, { status: 422 });  
  const { token, email, newPassword } = parsed.data;

  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  
  if (!vendorId && !host) return NextResponse.json( { error: "Missing vendor identifier or host" }, { status: 400 } );
  
  
  try {
    const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });

    // Decrypt database URI
    const    SALT_ROUNDS =  parseInt( process.env.END_USER_BCRYPT_SALT_ROUNDS || "10", 10);
    const      User = userModel(shop_db);
    const    hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const           salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    // Find user by ID and valid reset token
    const user = await User.findOneAndUpdate(  {
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