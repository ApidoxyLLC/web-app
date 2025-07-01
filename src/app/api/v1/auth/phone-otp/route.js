import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';
import sendSMS from '@/services/mail/sendSMS';
import crypto from 'crypto'; 
import config from '../../../../../../config';

const schema = z.object({ phone: z.string().phone() });

export async function POST(request) {

  // Rate Limiter
  // Rate limiter turned off for uninterrupted development task
  // pls test and then turn it on before production 
  //////////////////////////////////////////
  // ===== 1. Rate Limiting (Uncomment for production) =====
  // const ip = await getClientIp();
  // const key = ip || 'anonymous';
  // try { await phoneVerificationLimiter.consume(key); } 
  // catch (err) { return NextResponse.json( { error: 'Too many requests. Please try again later.' },{ status: 429 });}

  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid  email address..." }, { status: 422 });
  const { phone } = parsed?.data

  try {
    const        db = authDbConnect();
    const UserModel = userModel(db);
    const      user = UserModel.findOne({  phone, 
                                             $or: [{ "verification.phoneVerificationOTPExpire": { $lte: Date.now() } },
                                                   { "verification.phoneVerificationOTPExpire": { $exists: false } }   ]   });

    if(!user) return NextResponse.json({ error: "If your number exists, you'll receive a OTP" }, { status: 400 })

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    // ===== 6. Secure Update =====
                                user.isPhoneVerified = false;
                                   user.verification = user.verification || {}; 
              user.verification.phoneVerificationOTP = hashedOtp
      user.verification.emailVerificationTokenExpire = new Date(Date.now() + (config.phoneVerificationExpireMinutes * 60 * 1000));
      const savedUser = await user.save()

      if(!savedUser) return NextResponse.json({ error: "Failed to save OTP" }, { status: 500 })
      await sendSMS({ phone: user.phone, 
                      message: `Your verification code: ${otp} (valid for ${config.phoneVerificationExpireMinutes} minutes)`
                    });

    // ===== 7. Send Phone code... =====
    return NextResponse.json( { message: "OTP sent to your phone" }, { status: 200 } );
  } catch (error) {
    console.error("Phone OTP Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },  // Generic error
      { status: 500 }
    );
  }
}
