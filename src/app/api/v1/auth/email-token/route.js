import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';
import crypto from 'crypto'; 
import sendEmail from '@/services/mail/sendEmail';
import { getClientIp } from '@/app/utils/ip';
import { phoneVerificationLimiter } from '../register/rateLimiter';


const schema = z.object({
  email: z.string().email(),
});

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
    const { email } = parsed?.data
  try {
    const db = authDbConnect()
    const UserModel = userModel(db);

    const user = UserModel.findOne({ email, 
                                      $or: [  { "verification.emailVerificationTokenExpire": { $lte: Date.now() } },
                                              { "verification.emailVerificationTokenExpire": { $exists: false } }   ]
                                    })
    if(!user) return NextResponse.json({ error: "If your email exists, you'll receive a verification link" }, { status: 400 })

    // ===== 5. Token Generation =====
    const token = crypto.randomBytes(32).toString('hex');
    const verificationToken = crypto.createHash('sha256').update(token).digest('hex');
    const EMAIL_VERIFICATION_EXPIRY = Number(process.env.EMAIL_VERIFICATION_EXPIRY || 15); // minutes
    
    // ===== 6. Secure Update =====
                                user.isEmailVerified = false;
                                   user.verification = user.verification || {}; 
            user.verification.emailVerificationToken = verificationToken;
      user.verification.emailVerificationTokenExpire = new Date( Date.now() + (EMAIL_VERIFICATION_EXPIRY * 60 * 1000) );
      await user.save()


    // ===== 7. Email Handling =====
    await sendEmail({ receiverEmail: user.email, emailType: 'VERIFY' , senderEmail: "" })

    // You can add custom logic here, e.g. check if email exists in Db
    return NextResponse.json({ message: "Check your email for verification" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Invalid email format' },
      { status: 400 }
    );
  }
}