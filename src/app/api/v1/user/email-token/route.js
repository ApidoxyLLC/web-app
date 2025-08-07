import { z } from 'zod';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import crypto from 'crypto'; 
import sendEmail from '@/services/mail/sendEmail';
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';
import { getVendor } from '@/services/vendor/getVendor';


const schema = z.object({ email: z.string().email() });

export async function POST(request) {
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
    let body;
    try { body = await request.json() } 
    catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid  email address..." }, { status: 422 });
    const { email } = parsed?.data
    // Rate limiter 

    const fingerprint = request.headers.get('x-fingerprint') || null;
    const vendorId = request.headers.get('x-vendor-identifier');
    const host = request.headers.get('host');
    if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
    
    try {



      const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
      if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
      const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
      const  UserModel = userModel(shop_db);
      const user = await UserModel.findOne({  email,
                                              $and: [ { $or: [ {                             isEmailVerified: false }, 
                                                               {                             isEmailVerified: { $exists: false } } ] }, 
                                                      { $or: [ { "verification.emailVerificationTokenExpiry": { $lte: Date.now() } }, 
                                                               { "verification.emailVerificationTokenExpiry": { $exists: false } },
                                                               { "verification.emailVerificationToken"      : { $exists: false } } ] } ]
                                            }).select('+_id ' +
                                                      '+email ' +
                                                      '+verification ' +
                                                      '+verification.emailVerificationToken ' +
                                                      '+verification.emailVerificationTokenExpiry ' +
                                                      '+isEmailVerified' );

      if (!user) return NextResponse.json( { success: true, message: "If your email exists and isn't verified, you'll receive a verification email" }, { status: 200 });
      const rawToken = crypto.randomBytes(48).toString('hex');                    
      const    token = crypto.createHash('sha256').update(rawToken).digest('hex');                    
      const   expiry = minutesToExpiryTimestamp(Number(shop.timeLimitations?.EMAIL_VERIFICATION_EXPIRE_MINUTES) || 10)
      await UserModel.updateOne( { _id: user._id }, { $set: {       'verification.emailVerificationToken': token,
                                                              'verification.emailVerificationTokenExpiry': expiry } } );

      const senderEmail = shop.email || process.env.DEFAULT_SENDER_EMAIL;
        await sendEmail({
          receiverEmail: user.email,
          emailType: 'VERIFY',
          senderEmail,
          token: rawToken  // Send the raw token (not hashed) to the user
        }).catch(error => console.log("Email sending failed:", error));

      // You can add custom logic here, e.g. check if email exists in Db
      return NextResponse.json({ message: "Verification email sent" }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { valid: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
}
