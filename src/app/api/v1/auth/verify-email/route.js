import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';

const schema = z.object({ token: z.string(),
                    fingerprint: z.string().length(32, 'Invalid fingerprint ID length').optional()
                  });

export async function POST(request) {
  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data..." }, { status: 422 });
  const { token, fingerprint } = parsed.data

  try {
    const db = authDbConnect()
    const UserModel = userModel(db);

    const user = UserModel.findOne({ "verification.emailVerificationToken": token, "verification.emailVerificationTokenExpiry":{ $gt: Date.now() } })
                          .select("+verification " +
                                  "+verification.emailVerificationToken"  +
                                  "+verification.emailVerificationTokenExpiry")
                          .lean();
    if(!user) return NextResponse.json({ error: "Invalid token" }, { status: 400 })
                                user.isEmailVerified = true;
            user.verification.emailVerificationToken = undefined;
      user.verification.emailVerificationTokenExpire = undefined;
      
      user.save()

    // You can add custom logic here, e.g. check if email exists in Db
    return NextResponse.json({ valid: true, email });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Invalid email format' },
      { status: 400 }
    );
  }
}