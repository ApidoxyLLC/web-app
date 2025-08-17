import { z } from 'zod';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
// import { getVendor } from '@/services/vendor/getVendor';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';

// Create schema for query parameters
const schema = z.object({ token: z.string().min(32 ) });

export async function POST(request) {
  // Rate limiter setup
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

  let body;
  try { body = await request.json() } 
  catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request data", details: parsed.error.format() },{ status: 422 });
    const { token } = parsed.data;

  const referenceId = request.headers.get('x-vendor-identifier');
  const host     = request.headers.get('host');
  if (!referenceId && !host) return NextResponse.json({ error: "Missing host" }, { status: 400 });
  
  try {
    // const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    // if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );

    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
    const shop_db  = await dbConnect({ dbKey: dbName, dbUri });


    const             User = userModel(shop_db);
    const      hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const       resetToken = crypto.randomBytes(64).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const RESET_PASSWORD_TOKEN_EXPIRE = Number(process.env.END_USER_RESET_PASSWORD_TOKEN_EXPIRE_MINUTES)
    const tokenExpiry = Date.now() + (RESET_PASSWORD_TOKEN_EXPIRE * 60 * 1000);
    const user = await User.findOneAndUpdate(  {              "security.forgotPasswordToken"       : hashedToken,
                                                              "security.forgotPasswordTokenExpiry" : { $gt: Date.now() } },
                                               {     $set : { "security.resetPasswordToken"        : hashedResetToken,
                                                              "security.resetPasswordTokenExpiry"  : tokenExpiry,
                                                              "security.isFlagged"                 : true              },
                                                   $unset : { "security.forgotPasswordToken"       : "",
                                                              "security.forgotPasswordTokenExpiry" : ""                } },
                                               { new: true, projection: { _id: 1, email: 1, phone: 1,  name: 1, security: 1 }, lean: true } );

    if (!user) { return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 })}

    const { security, email, phone } =  user
    const { attemptWith } =  security 
    return NextResponse.json( { success : true, token: resetToken, ...(attemptWith === "email" &&   { email }), ...(attemptWith === "phone" &&   { phone }), 
                                expireAt: new Date(tokenExpiry).toISOString() } );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json( { error: "Internal server error" }, { status: 500 } );
  }
}