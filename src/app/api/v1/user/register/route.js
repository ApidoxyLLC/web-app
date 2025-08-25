import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import registerDTOSchema from "./registerDTOSchema";
import sendEmail from "@/services/mail/sendEmail";
import sendSMS from "@/services/mail/sendSMS";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import config from "../../../../../../config";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = registerDTOSchema.safeParse(body);
  console.log(parsed)

  const referenceId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  // const fingerprint = request.headers.get('x-fingerprint') || null;

  const { allowed, retryAfter } = await applyRateLimit({ key: `${host}${ip}`, scope: 'userLogin' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  const name = parsed.data.name?.trim() || null;
  const email = parsed.data.email?.trim().toLowerCase() || null;
  const phone = parsed.data.phone?.trim() || null;
  const password = parsed.data?.password || null;
  const gender = parsed.data?.gender || null;

  if (password) {
    // add more containing common password
    const commonPasswords = ['password', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) return NextResponse.json({ error: "Common password provided, change the password" }, { status: 422 });
  }

  try {
    const { data, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if (!data) return NextResponse.json({ error: "Invalid request" }, { status: 400 });


    const shop_db = await dbConnect({ dbKey: dbName, dbUri })
    const User = userModel(shop_db)
    const existingUser = await User.findOne({ $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] });
    if (existingUser) return NextResponse.json({ error: "User already exists" }, { status: 409 });

    const SALT_ROUNDS = parseInt(process.env.END_USER_BCRYPT_SALT_ROUNDS || "10", 10);
    const salt = await bcrypt.genSalt(SALT_ROUNDS);

    const rawToken = crypto.randomBytes(48).toString('hex')
    const token = crypto.createHash('sha256').update(rawToken).digest('hex');
    const otp = crypto.randomInt(Number(process.env.PHONE_OTP_MIN), Number(process.env.PHONE_OTP_MAX)).toString();
    const otpSalt = await bcrypt.genSalt(12);
    const hashedOtp = await bcrypt.hash(otp, otpSalt)

    const emailVerificationExpireMinutes = Number.isFinite(Number(data.expirations?.emailVerificationExpireMinutes ?? config.emailVerificationDefaultExpireMinutes))
      ? Number(data.expirations?.emailVerificationExpireMinutes ?? config.emailVerificationDefaultExpireMinutes)
      : 15;

    const phoneVerificationExpireMinutes = Number.isFinite(Number(data.expirations?.phoneVerificationExpireMinutes ?? config.phoneVerificationDefaultExpireMinutes))
      ? Number(data.expirations?.phoneVerificationExpireMinutes ?? config.phoneVerificationDefaultExpireMinutes)
      : 4;

    const payload = {
      name,
      security: { ...(password && { password: await bcrypt.hash(password, salt) }) },
      verification: {
        ...(email && {
          emailVerificationToken: token,
          emailVerificationTokenExpiry: new Date(Date.now() + (emailVerificationExpireMinutes * 60 * 1000)).getTime(),
        }),
        ...((phone && !email) && {
          phoneVerificationOTP: hashedOtp,
          phoneVerificationOTPExpiry: new Date(Date.now() + (phoneVerificationExpireMinutes * 60 * 1000)).getTime()
        })
      },
      ...(email && { email: email.trim().toLowerCase() }),
      ...(phone && { phone: phone?.trim() }),
      ...(gender && { gender: gender?.trim() })
    };

    const newEndUser = new User(payload);
    const savedUser = await newEndUser.save();

    console.log(payload)

    if (savedUser) {
      if (email && password) {
        const senderEmail = data.email || process.env.DEFAULT_SENDER_EMAIL;
        /** 
         ** ****************************************************** **
         ** Recommend to transfer this Verificaiton Email and      **
         ** Phone OTP sending to task Quaue.... not to block I.O   **
         ** Task Queue will implement later                        **
         ** sendEmail()                                            **
         ** sendSMS()                                              **
         ** ****************************************************** **
         **/
        sendEmail({ receiverEmail: savedUser.email, emailType: 'VERIFY', senderEmail, token: token }).catch(console.error);
      }
      if (phone && !email) await sendSMS({ phone, message: `Your verification code is: ${otp}` }).catch(console.error);
      return NextResponse.json({ success: true, message: "User registered successfully" }, { status: 201 });
    }

  } catch (error) {
    console.log(`User Creation Error: ${error.message}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


// const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
