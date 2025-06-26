import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import jwt from "jsonwebtoken";
import rateLimit from "@/app/utils/rateLimit";
import mongoose from "mongoose";

export async function GET(request) {
  // Extract headers
  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 'unknown_ip';
  const authHeader = request.headers.get('authorization');
  
  
  if (!vendorId && !host) {return NextResponse.json( { error: "Missing vendor identifier or host" }, { status: 400 });}
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, message: "Unauthorized", code: "MISSING_TOKEN" },{ status: 401 }); }

  // Temporary off rate limiting
  // const fingerprint = request.headers.get('x-fingerprint') || null;
  // const { allowed, headers } = rateLimit({ ip, fingerprint });
  // if (!allowed) {
  //   return NextResponse.json(
  //     { error: "Too many requests" },
  //     { status: 429, headers }
  //   );
  // }

  const accessToken = authHeader.split(' ')[1];
  
  try {
    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Get shop configuration
    const shop = await ShopModel.findOne({
      $or: [{ vendorId }, { "domains": { $elemMatch: { domain: host } }}]
    }).select(
      "+dbInfo "+
      "+dbInfo.uri +dbInfo.prefix " +
      "+keys "+
      "+keys.ACCESS_TOKEN_SECRET " +
      "+timeLimitations "+
      "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES"
    ).lean();

    if (!shop)
      return NextResponse.json(
        { success: false, message: "Authentication failed", code: "INVALID_VENDOR" },
        { status: 400 }
      );

    // Decrypt token secret
    const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    if (!AT_SECRET_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 });
    
    const ACCESS_TOKEN_SECRET = await decrypt({
      cipherText: shop.keys.ACCESS_TOKEN_SECRET,
      options: { secret: AT_SECRET_KEY }
    });

    // Verify token
    let payload;
    try {
      payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { success: false, message: "Token expired", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Invalid token", code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    // Validate payload structure
    if (!payload.userId || !payload.session) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload", code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    // Decrypt DB URI
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const dbUri = await decrypt({
      cipherText: shop.dbInfo.uri,
      options: { secret: DB_URI_ENCRYPTION_KEY }
    });

    // Connect to vendor DB
    const   shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const    vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const SessionModel = sessionModel(vendor_db);
    const    UserModel = userModel(vendor_db);

    // Validate session
    const sessionId = new mongoose.Types.ObjectId(payload.session);
    const session = await SessionModel.findOne({
      _id: sessionId,
      userId: payload.userId
    }).select("+accessTokenExpiry");

    if (!session || session.accessTokenExpiry < Date.now()) {
      return NextResponse.json(
        { success: false, message: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    // Get user data
    const user = await UserModel.findById(payload.userId).select(
      "name avatar email phone role theme language timezone currency isEmailVerified isPhoneVerified"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check account lock
    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
      return NextResponse.json(
        { success: false, message: "Account locked", code: "ACCOUNT_LOCKED" },
        { status: 403 }
      );
    }

    // Successful response
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isEmailVerified || user.isPhoneVerified,
        local: {
          theme: user.theme,
          language: user.language,
          timezone: user.timezone,
          currency: user.currency
        }
      },
    //   session: {
    //     id: session._id,
    //     accessTokenExpiry: session.accessTokenExpiry
    //   }
    });
    
  } catch (error) {
    console.error(`Session Validation Error: ${error.message}`);
    return NextResponse.json(
      { error: "Session validation failed" },
      { status: 500 }
    );
  }
}