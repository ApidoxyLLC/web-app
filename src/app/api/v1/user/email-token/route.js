import { z } from 'zod';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import crypto from 'crypto'; 
import sendEmail from '@/services/mail/sendEmail';
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp';
import { getInfrastructure } from '@/services/vendor/getInfrastructure';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';


const schema = z.object({ email: z.string().email() });

export async function POST(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
    let body;
    try { body = await request.json() } 
    catch (error) { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

    const parsed = schema.safeParse(body);
    if (!(parsed.success === true)) return NextResponse.json({ error: "Invalid  email address..." }, { status: 422 });
    const { email } = parsed?.data
    // Rate limiter 

    const fingerprint = request.headers.get('x-fingerprint') || null;
    const referenceId = request.headers.get('x-vendor-identifier');
    const host = request.headers.get('host');
    if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });
    
    try {
      const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
      // const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
      if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 } );
      const shop_db  = await dbConnect({ dbKey: dbName, dbUri });
      const  UserModel = userModel(shop_db);
      

      const    rawToken = crypto.randomBytes(48).toString('hex');                    
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');                    
      const      expiry = minutesToExpiryTimestamp(Number(vendor.expirations?.emailVerificationExpireMinutes) || 10)



      const user = await UserModel.findOneAndUpdate({
                                                      email,
                                                      $and: [
                                                              { $or: [ { isEmailVerified: false }, { isEmailVerified: { $exists: false } } ] },
                                                              { $or: [ { "verification.emailVerificationTokenExpiry": { $lte: Date.now() } },
                                                                       { "verification.emailVerificationTokenExpiry": { $exists: false } },
                                                                       { "verification.emailVerificationToken": { $exists: false } }            ]
                                                              }
                                                            ]
                                                    },
                                                    {
                                                      $set: { 'verification.emailVerificationToken': hashedToken,
                                                              'verification.emailVerificationTokenExpiry': expiry }
                                                    },
                                                    {
                                                      new: true,               // return the updated document
                                                      projection: {            // same fields you were selecting
                                                        _id: 1,
                                                        email: 1,
                                                        verification: 1,
                                                        isEmailVerified: 1
                                                      }
                                                    }
                                                  );

    if (!user) return NextResponse.json({ success: true, message: "If your email exists and isn't verified, you'll receive a verification email" }, { status: 200 });

      const senderEmail = vendor.email || process.env.DEFAULT_SENDER_EMAIL;
        await sendEmail({ receiverEmail: user.email,
                              emailType: 'VERIFY',
                            senderEmail,
                                  token: rawToken
                        }).catch(error => console.log("Email sending failed:", error));

      // You can add custom logic here, e.g. check if email exists in Db
      return NextResponse.json({ message: "Verification email sent" }, { status: 200 });
    } catch (error) {
      return NextResponse.json( { valid: false, error: 'Internal server error' }, { status: 500 } );
    }
}



      // const user = await UserModel.findOne({  email,
      //                                         $and: [ { $or: [ {                             isEmailVerified: false }, 
      //                                                          {                             isEmailVerified: { $exists: false } } ] }, 
      //                                                 { $or: [ { "verification.emailVerificationTokenExpiry": { $lte: Date.now() } }, 
      //                                                          { "verification.emailVerificationTokenExpiry": { $exists: false } },
      //                                                          { "verification.emailVerificationToken"      : { $exists: false } } ] } ]
      //                                       }).select('+_id ' +
      //                                                 '+email ' +
      //                                                 '+verification ' +
      //                                                 '+verification.emailVerificationToken ' +
      //                                                 '+verification.emailVerificationTokenExpiry ' +
      //                                                 '+isEmailVerified' );

      // if (!user) return NextResponse.json( { success: true, message: "If your email exists and isn't verified, you'll receive a verification email" }, { status: 200 });


            // await UserModel.updateOne( { _id: user._id }, { $set: {       'verification.emailVerificationToken': token,
      //                                                         'verification.emailVerificationTokenExpiry': expiry } } );