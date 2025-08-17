import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';

const schema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string()
    .regex(/^\+?\d{7,15}$/, "Invalid phone number format") // allows + and 7–15 digits
    .optional(),
  token: z.string(),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})
.refine(
  (data) => (data.email ? 1 : 0) + (data.phone ? 1 : 0) === 1,
  { message: "Provide either email or phone number, not both" }
)
.refine(
  (data) => {
    if (data.email) {
      return data.token.length >= 32 && data.token.length <= 128;
    }
    if (data.phone) {
      return /^\d{6}$/.test(data.token); // must be 6 digits only
    }
    return false;
  },
  { message: "Invalid token format based on identifier type", path: ["token"] }
)
.transform((data) => {
  if (data.email) {
    return {
      type: "email",
      email: data.email,
      token: data.token,
      newPassword: data.newPassword,
    };
  }
  if (data.phone) {
    return {
      type: "phone",
      phone: data.phone,
      token: data.token,
      newPassword: data.newPassword,
    };
  }
});

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  // if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid  Input data " }, { status: 422 });  
  const { token, email, phone, type, newPassword } = parsed.data;

  const referenceId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  
  if (!referenceId && !host) return NextResponse.json( { error: "Missing vendor identifier or host" }, { status: 400 } );
  
  
  try {
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });

    // Decrypt database URI
    // const    SALT_ROUNDS =  config.endUserBcryptSaltRounds || 10;
    console.log(config.endUserBcryptSaltRounds)
    const SALT_ROUNDS = parseInt(config.endUserBcryptSaltRounds, 10) || 10;
    const      User = userModel(shop_db);
    const    hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const           salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);



    // Test log 
    // console.log(parsed.data)
    // console.log(`SAULT **************${SALT_ROUNDS}`)
    // console.log(token)
    // console.log(hashedToken)
    // console.log("*************************password")
    // console.log(newPassword)
    // console.log(hashedPassword)
    // console.log(vendor)
    // return NextResponse.json({ MESSAGE: "TEST RESPONSE" }, { status: 200 } )    



    // Find user by ID and valid reset token 
    const user = await User.findOneAndUpdate(  {  ...(type === "email" && { email, isEmailVerified: true }), 
                                                  ...(type === "phone" && { phone, isPhoneVerified: true }),
                                                 "security.resetPasswordToken": hashedToken,
                                                 "security.resetPasswordTokenExpiry": { $gt: Date.now() },
                                                 "security.isFlagged": true
                                                },
                                                { $set  : { "security.password": hashedPassword,
                                                            "security.passwordChangedAt": Date.now(), 
                                                            "security.isFlagged": false  },
                                                  $unset: { "security.resetPasswordToken": "",
                                                            "security.resetPasswordTokenExpiry": ""  } },
                                                { new: true,  lean: true, projection: { _id: 1, email: 1, name: 1 } }
                                              );
    if (!user)  return NextResponse.json( { error: "Invalid or expired password reset token" }, { status: 400 });
    return NextResponse.json( { success: true, message: "Password has been reset successfully" }, { status: 200 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}