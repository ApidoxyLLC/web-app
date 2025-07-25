import authDbConnect from "@/lib/mongodb/authDbConnect";
import bcrypt from "bcryptjs";
import User from "@/models/auth/User";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import registerSchema from "./registerDTOSchema";
import config from "../../../../../../config";
import rateLimiter from "./rateLimiter";
import { getClientIp } from "@/app/utils/ip";
import crypto from 'crypto';

// Task Need to Review 
// Enable Rate limiting
// Check Error handeling
// apply sending verififation Email 

authDbConnect();

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Rate limiting
  // const userIP =  await getClientIp();
  // try {
  //   await rateLimiter.consume(userIP, 2);
  // } catch (error) {
  //   return NextResponse.json(
  //     { error: "Too many requests" },
  //     { status: 429 }
  //   );
  // }

  // Validation with zod
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email?.trim();
  const phone = parsed.data.phone?.trim();
  const password = parsed.data.password;

  if (!email && !phone) {
    return NextResponse.json({ error: "Either email or phone must be provided" }, { status: 422 });
  }

  if(password){
    const commonPasswords = ['password', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      // Validation Error
      return NextResponse.json({ error: "Common password provided, change the password" }, { status: 422 });
    }
  }

  const session = await User.startSession();

  try {    
    session.startTransaction();

    // Check for exiting User
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
                           .session(session)
                           .lean();
    // Error for Existing User 
    if(existingUser){
      return NextResponse.json({ error: "User already Exist" }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const token = crypto.randomBytes(32).toString('hex');
    const verificationToken = crypto.createHash('sha256').update(token).digest('hex');

    const PHONE_VERIFICATION_EXPIRY = Number(process.env.PHONE_VERIFICATION_EXPIRY || 5); // minutes

    const userData = {  name,
                        security: { ...(password 
                                      && {  password: hashedPassword,
                                            salt } ) },
                                            
                        verification: { ...(email && {
                                            emailVerificationToken: verificationToken,
                                            emailVerificationTokenExpires: Date.now() + (config.emailVerificationExpireMinutes * 60000) //15 minute validation 
                                          }),
                                        ...((phone && !email) && { 
                                            phoneVerificationOTP: Math.floor(100000 + Math.random() * 900000).toString(),
                                            phoneVerificationOTPExpires: new Date(Date.now() + (PHONE_VERIFICATION_EXPIRY * 60 * 1000))
                                          })
                                      },
                      ...(email && { email }),
                      ...(phone && {  phone })
                    };

    const newUser = new User(userData);
    const savedUser = await newUser.save({ session });
    // const userResponse = savedUser.toObject();
    const { 
            // name,
            // email,
            // phone,
            role,
            theme,
            language,
            timezone,
            currency,
            plan,
          } = savedUser.toObject();
    const userResponse = {  name, 
                            email, 
                            phone, 
                            role,  
                            local: { 
                                      theme, 
                                      language, 
                                      timezone, 
                                      currency, 
                                      plan 
                                    } };

    await session.commitTransaction();
    session.endSession();
    return NextResponse.json({
          message: "User registered successfully",
          success: true,
          data: userResponse
        }, { status: 201 })
  } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
              error: error.message || "Something went wrong",
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            }, { status: 500 });
  }
}