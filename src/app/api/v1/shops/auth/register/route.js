import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import registerDTOSchema from "./registerDTOSchema";
import sendEmail from "@/services/mail/sendEmail";
import sendSMS from "@/services/mail/sendSMS";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { rateLimiterRegisterUser } from './limiter';

export async function POST(request) {
  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}
  
  const   parsed = registerDTOSchema.safeParse(body);
  const vendorId = request.headers.get('x-vendor-identifier');
  const     host = request.headers.get('host'); 

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
              request.headers.get('x-real-ip') || null;
  const fingerprint = request.headers.get('x-fingerprint') || null;
  const identity = ip || fingerprint;

  if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  try { await rateLimiterRegisterUser.consume(identity) } 
  catch (rateLimitError) { return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429 } ) }

  if (!parsed.success)    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  const     name = parsed.data.name?.trim()                 || null;
  const    email = parsed.data.email?.trim().toLowerCase()  || null;
  const    phone = parsed.data.phone?.trim()                || null;
  const password = parsed.data?.password                    || null;

  if(password){
    // add more containing common password
    const commonPasswords = ['password', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) return NextResponse.json({ error: "Common password provided, change the password" }, { status: 422 });
  }

  try {
    const   auth_db = await authDbConnect();
    const ShopModel = await shopModel(auth_db)
    const      shop = await ShopModel.findOne({ $or: [{ vendorId }, { "host.domain": host }] })
                                      .select('+_id '                                               +
                                              '+email '                                             +
                                              '+dbInfo '                                            +
                                              '+dbInfo.uri '                                        +
                                              '+dbInfo.prefix '                                     +
                                              '+timeLimitations '                                   +
                                              '+timeLimitations.EMAIL_VERIFICATION_EXPIRE_MINUTES ' +
                                              '+timeLimitations.PHONE_VERIFICATION_EXPIRE_MINUTES'     )
                                      .lean()
    if(!shop) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    
    const VENDOR_DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY
    const                        dbUri = await decrypt({cipherText: shop.dbInfo.uri, 
                                                           options: { secret: VENDOR_DB_URI_ENCRYPTION_KEY } })

    const   shopDbName = shop.dbInfo.prefix + shop._id
    const    vendor_db = await dbConnect({ dbKey: shopDbName, dbUri })
    const    UserModel = userModel(vendor_db)
    const existingUser = await UserModel.findOne({ $or: [ ...(email ? [{ email }] : []), ...(phone ? [{ phone }] : []) ]});
    if (existingUser) return NextResponse.json({ error: "User already exists" }, { status: 409 });
    
    const               SALT_ROUNDS =  parseInt( process.env.END_USER_BCRYPT_SALT_ROUNDS || "10", 10);
    const                      salt = await bcrypt.genSalt(SALT_ROUNDS);
    const EMAIL_VERIFICATION_EXPIRY = Number(shop.timeLimitations.EMAIL_VERIFICATION_EXPIRE_MINUTES)  || 10
    const PHONE_VERIFICATION_EXPIRY = Number(shop.timeLimitations.PHONE_VERIFICATION_EXPIRE_MINUTES) || 3
    
    const  rawToken = crypto.randomBytes(48).toString('hex')
    const     token = crypto.createHash('sha256').update(rawToken).digest('hex');
    const       otp = crypto.randomInt(Number(process.env.PHONE_OTP_MIN), Number(process.env.PHONE_OTP_MAX)).toString();
    const   otpSalt = await bcrypt.genSalt(12);
    const hashedOtp = await bcrypt.hash(otp, otpSalt)

    const payload = {         name,
                          security: { ...(password 
                                    && { password: await bcrypt.hash(password, salt) } ) },
                      verification: { ...(email && {
                                                emailVerificationToken: token,
                                          emailVerificationTokenExpiry: new Date(Date.now() + (EMAIL_VERIFICATION_EXPIRY * 60 * 1000) ).getTime(),                                    
                                        }),
                                      ...((phone && !email) && { 
                                                  phoneVerificationOTP: hashedOtp,
                                            phoneVerificationOTPExpiry: new Date(Date.now() + (PHONE_VERIFICATION_EXPIRY * 60 * 1000)).getTime()
                                        })
                                    },
                    ...(email && { email: email.trim().toLowerCase() }),
                    ...(phone && { phone: phone?.trim() })
                  };

        const newEndUser = new UserModel(payload);
        const savedUser =  await newEndUser.save();
    
    if(savedUser){
      if(email && password) {
        const senderEmail = shop.email || process.env.DEFAULT_SENDER_EMAIL;
        /** 
         ** ****************************************************** **
         ** Recommend to transfer this Verificaiton Email and      **
         ** Phone OTP sending to task Quaue.... not to block I.O   **
         ** Task Queue will implement later                        **
         ** sendEmail()                                            **
         ** sendSMS()                                              **
         ** ****************************************************** **
         **/ 
        sendEmail({ receiverEmail: savedUser.email, emailType: 'VERIFY' , senderEmail, token: token  }).catch(console.error);
      }
      if(phone && !email) await sendSMS({ phone, message: `Your verification code is: ${otp}`}).catch(console.error);
      return NextResponse.json({ success: true, message: "User registered successfully" }, { status: 201 });
    } 

  } catch (error) {
    console.error(`User Creation Error: ${error.message}`);
    return NextResponse.json( { error: "Internal server error" }, { status: 500 });
  }
}