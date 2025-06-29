import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';

const phoneVefiryDTOSchema = z.object({ phone: z.string().email(),
                                          otp: z.string().number().min(0).max(999999).int()  });

export async function POST(request) {
  let body;
  try   { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const parsed = phoneVefiryDTOSchema.safeParse(body);
  if (!parsed.success) 
    return NextResponse.json({ error: "Invalid data..." }, { status: 422 });
  const { phone, otp } = parsed.data

  try {
    const        db = await authDbConnect();
    const UserModel = userModel(db);

    const user = await UserModel.findOne({        phone,
              "verification.phoneVerificationOTPExpiry": { $gt: Date.now() },});

    if (!user || !user.verification?.phoneVerificationOTP)
      return NextResponse.json({ error: "No active verification request" }, { status: 400 });    

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const otpMatch = user.verification.phoneVerificationOTP === hashedOtp;

    user.verification.phoneVerificationOTP = undefined;
    user.verification.phoneVerificationOTPExpiry = undefined;

    // If match, verify
    if (otpMatch) user.isPhoneVerified = true;

  // 🔒 Optional: Log failed attempt (separate model or log collection)
  // await db.collection('otp_attempt_logs').insertOne({
  //   phone,
  //   attemptedOTP: otp,
  //   success: false,
  //   timestamp: new Date(),
  //   ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  //   fingerprint: body.fingerprint || null
  // });


await user.save();

if (!otpMatch) {
  return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
}

return NextResponse.json({ valid: true, phone: user.phone });
  } catch (error) {
    return NextResponse.json( { valid: false, error: 'Invalid email format' }, { status: 400 });
  }
}