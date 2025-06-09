import { z } from 'zod';
import { NextResponse } from 'next/server';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { dbConnect } from '@/app/lib/mongodb/db';
import { userModel } from '@/models/auth/User';
import crypto from 'crypto'; 
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import sendEmail from '@/services/mail/sendEmail';
import { shopModel } from '@/models/auth/Shop';
import { rateLimiterEmailToken } from './limiter';
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';


const schema = z.object({ email: z.string().email() });

export async function POST(request) {
    let body;
    try   { body = await request.json() } 
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid  email address..." }, { status: 422 });
    const { email } = parsed?.data
    // Rate limiter 
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 'unknown_ip';
    const fingerprint = request.headers.get('x-fingerprint') || null;

    const identity = fingerprint || ip;
    if (!identity) return NextResponse.json({ error: "Missing identity " }, { status: 400 });
    const rateLimit = await rateLimiterEmailToken.consume(`${email.toLowerCase()}:${identity}`).catch(() => null);
    if (!rateLimit) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    
    const vendorId = request.headers.get('x-vendor-identifier');
    const host = request.headers.get('host');
    if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
    
    try {
      const auth_db = await authDbConnect();
      const ShopModel = shopModel(auth_db);
      // Get shop configuration
      const shop = await ShopModel.findOne({  $or: [{ vendorId }, { "host.domain": host }] })
                                  .select(  '+_id ' +
                                            '+dbInfo ' +
                                            '+dbInfo.uri ' +
                                            '+dbInfo.prefix ' +
                                            '+timeLimitations ' +
                                            '+timeLimitations.EMAIL_VERIFICATION_EXPIRE_MINUTES ' +
                                            '+email'
                                          ).lean();

      if (!shop) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

      const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
          if (!VENDOR_DB_URI_ENCRYPTION_KEY)
            return NextResponse.json( { error: "Server configuration error" }, { status: 500 });

      const      dbUri = await decrypt({ cipherText: shop.dbInfo.uri, options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY }});
      const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
      const  vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
      const  UserModel = userModel(vendor_db);
      const hashedToken = crypto.createHash('sha256').update(rawToken) .digest('hex');

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
