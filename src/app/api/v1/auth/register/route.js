import authDbConnect from "@/app/lib/mongodbConnections/authDbConnect";
import bcrypt from "bcryptjs";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import registerSchema from "./registerDTOSchema";
import rateLimiter from "./rateLimiter";
import { getClientIp } from "@/app/utils/ip";
import { ValidationError, ConflictError, SyntaxError } from "@/app/lib/error";


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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email?.trim();
  const phone = parsed.data.phone?.trim();
  const password = parsed.data.password;

  if (!email && !phone) {
    throw new ValidationError("Either email or phone must be provided");
  }

  if(password){
    const commonPasswords = ['password', '12345678', ];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError("Password is too common");
    }
  }

  const query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });

    // Database operations with transaction
    const session = await User.startSession();
    session.startTransaction();
    

    try {
      // Check for existing user
      const existingUser = await User.findOne(
        { $or: [{ email }, { phone }] },
        { session }
      ).lean();
      if (existingUser) {
        throw new ConflictError(
          existingUser.email === email 
            ? "Email already in use" 
            : "Phone number already in use"
        );
      }

      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const verificationToken = generateVerificationToken();
      
      const userData = {
        name,
        password: hashedPassword,
        salt,
        ...(email && { 
          email: email.toLowerCase(),
          isEmailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpires: Date.now() + 3600000
        }),
        ...(phone && { 
          phone,
          isPhoneVerified: false 
        })};

      const newUser = new User(userData);
      const savedUser = await newUser.save({ session });

      await session.commitTransaction();
      session.endSession();
      // returning confirmation response 
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.__v;
    delete userResponse.emailVerificationToken;
    delete userResponse.emailVerificationTokenExpires;


    return NextResponse.json({
      message: "User registered successfully",
      success: true,
      data: userResponse
    }, { status: 201 })

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      // logger.error("Registration error", { error: error.message });

      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON" }, 
          { status: 400 }
        );
      }
  
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message }, 
          { status: error.status || 422 }
        );
      }
  
      if (error instanceof ConflictError) {
        return NextResponse.json(
          { error: error.message }, 
          { status: error.status || 409 }
        );
      }
  
      return NextResponse.json(
        { error: "Internal server error" }, 
        { status: 500 }
      );
    }

}