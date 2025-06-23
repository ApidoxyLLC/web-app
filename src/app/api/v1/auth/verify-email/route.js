import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { userModel } from '@/models/auth/User';
import crypto from 'crypto'; 

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

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const db = authDbConnect()
    const UserModel = userModel(db);

    const user = await UserModel.findOne({ "verification.emailVerificationToken": hashedToken,
                                           "verification.emailVerificationTokenExpiry": { $gt: Date.now() }})                                           
                                .select("+email "+
                                        "+isEmailVerified "+
                                        "+verification.emailVerificationToken "+
                                        "+verification.emailVerificationTokenExpiry" );
    if (!user) 
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

                              user.isEmailVerified = true;
          user.verification.emailVerificationToken = undefined;
    user.verification.emailVerificationTokenExpiry = undefined;

    await user.save();

    // You can add custom logic here, e.g. check if email exists in Db
    return NextResponse.json({ valid: true, email: savedUser.email });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Invalid email format' },
      { status: 400 }
    );
  }
}