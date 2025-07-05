import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
// import authDbConnect from '@/app/lib/mongodb/authDbConnect';
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

  if (!parsed.success) 
    return NextResponse.json({ error: "Invalid data..." }, { status: 422 });
  
  const { token, fingerprint } = parsed.data
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const        db = await authDbConnect();
    const UserModel = userModel(db);
    const      user = await UserModel.findOneAndUpdate( {                 "verification.token": hashedToken,
                                                                    "verification.tokenExpiry": { $gt: Date.now() }  },
                                                        { $set: { isEmailVerified: true },
                                                          $unset: {       "verification.token": "",
                                                                    "verification.tokenExpiry": "" } },
                                                        { new: true, select: "email isEmailVerified" } );

    if (!user) 
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    return NextResponse.json({ valid: true, email: user.email });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ valid: false, error: 'Something Went wrong...' }, { status: 400 });
  }
}