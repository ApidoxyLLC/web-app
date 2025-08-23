import { z } from 'zod';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import sendPasswordResetEmail from './sendPasswordResetEmail';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';
import sendSMS from '@/services/mail/sendSMS';
import { dbConnect } from '@/lib/mongodb/db';
import config from '../../../../../../config';

const schema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format").optional(),
}).refine(
  (data) => (data.email ? 1 : 0) + (data.phone ? 1 : 0) === 1,
  { message: "Provide either email or phone number, not both" }
).transform((data) => {
  if (data.email) return { type: "email", email: data.email };  
  if (data.phone) return { type: "phone", phone: data.phone };  
});

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json( { error: "Invalid request data", details: parsed.error.format() }, { status: 422 } );
  
  const { email, phone, type } = parsed.data;
  if(!email && !phone) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const referenceId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  
  if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
  
  console.log(referenceId)

  try {
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })




    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );


  //       console.log(vendor)
  // return NextResponse.json({ message: "Test request " }, { status: 200 })
    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
    const User = userModel(shop_db);
    
    // Generate password reset token 
    const resetToken = type === "phone"
                            ? String(crypto.randomInt(0, 1000000)).padStart(6, "0")
                            : crypto.randomBytes(48).toString('hex') 
                            
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiry (1 hour)
    const resetTokenExpiry = type === "phone"
                            ? Date.now() + config.endUserPhoneTokenExpireMinuts * 60 * 1000
                            : Date.now() + config.endUserEmailTokenExpireMinuts * 60 * 1000


    // console.log(parsed.data)
    // console.log(resetToken)
    // console.log(hashedToken)
    // console.log(resetTokenExpiry)
    // console.log(vendor)
    // return NextResponse.json({ MESSAGE: "TEST RESPONSE" }, { status: 200 } )                            
    const user = await User.findOneAndUpdate( { ...(type === "email" && { email, isEmailVerified: true }), 
                                                ...(type === "phone" && { phone, isPhoneVerified: true })  },
                                              { $set: {
                                                        "security.forgotPasswordToken"       : hashedToken,
                                                        "security.forgotPasswordTokenExpiry" : resetTokenExpiry, 
                                                        "security.attemptWith"               : type
                                                        // "security.isFlagged"                 : true 
                                                      }
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

      type === "phone" 
        ? await sendSMS({   phone, 
                      message: `Your verification code: ${resetToken} (valid for ${(config.endUserPhoneTokenExpireMinuts - 1)} minutes)`
                    })
        : await sendPasswordResetEmail({    email: user.email,
                                             name: user.name || user.email,
                                         resetUrl,
                                         shopName: shop.name             })

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