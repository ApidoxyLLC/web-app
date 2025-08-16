import { z } from 'zod';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import sendPasswordResetEmail from './sendPasswordResetEmail';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
// import { getVendor } from '@/services/vendor/getVendor';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';

const schema = z.object({ email: z.string().email("Invalid email format")   });

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
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
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    // const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
    const User = userModel(shop_db);
    
    // Generate password reset token (96 characters)
    const resetToken = crypto.randomBytes(48).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiry (1 hour)
    const FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES = parseInt(process.env.END_USER_FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES || "60", 10); // 1 hour default
    const resetTokenExpiry = Date.now() + FORGET_PASSWORD_TOKEN_EXPIRE_MINUTES * 60 * 1000;

    const user = await User.findOneAndUpdate( { email },
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

    return NextResponse.json({ success: true, message: "Password reset instructions sent to your email" }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}