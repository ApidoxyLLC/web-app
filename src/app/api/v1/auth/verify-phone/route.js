import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';

const schema = z.object({
  phone: z.string().email(),
    otp: z.string().number().min(0).max(999999).int(),
});

export async function POST(request) {
    let body;
    try { body = await request.json(); } 
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}
  
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data..." }, { status: 422 });
    const { phone, otp } = parsed.data
  try {
    const db = authDbConnect()
    const UserModel = userModel(db);

    const user = UserModel.findOne({ phone, "verification.phoneVerificationOTP": otp, "verification.phoneVerificationOTPExpiry":{ $gt: Date.now() } })
    if(!user) return NextResponse.json({ error: "Invalid token" }, { status: 400 })
                                user.isEmailVerified = true;
            user.verification.phoneVerificationOTP = undefined;
      user.verification.phoneVerificationOTPExpire = undefined;
      
    // You can add custom logic here, e.g. check if email exists in Db
    return NextResponse.json({ valid: true, email });
  } catch (error) {
    return NextResponse.json( { valid: false, error: 'Invalid email format' }, { status: 400 });
  }
}