
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import {  decrypt } from "@/lib/encryption/cryptoEncryption";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { cookies } from "next/headers";
import crypto from "crypto";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import minutesToExpiresIn from "@/app/utils/shop-user/minutesToExpiresIn";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { getVendor } from "@/services/vendor/getVendor";
// Security headers configuration


const refreshLimiter = new RateLimiterMemory({
  points: 5,              // 5 requests
  duration: 60 * 5,       // per 5 minutes
  blockDuration: 60 * 15  // block for 15 minutes if consumed
});

export async function POST(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || null;
    const fingerprint = request.headers.get('x-fingerprint') || null;
    const identity = ip || fingerprint;
    if (!identity) return NextResponse.json({ error: "Missing identity" }, { status: 400 });

    try { await refreshLimiter.consume(identity) } 
    catch (rateLimitError) { 
      const retrySecs = Math.round(rateLimitError.msBeforeNext / 1000) || 60;
      return NextResponse.json( { error: "Too many requests. Try again later." }, { status: 429, headers: { 'Retry-After': retrySecs.toString() } } ) }

    
    let refreshToken = null;
    const authHeader = request.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) 
        refreshToken = authHeader.split(" ")[1];
    else {
        const cookieStore = cookies();
        refreshToken = cookieStore.get("refresh_token")?.value;
    }

    if (!refreshToken) 
      return NextResponse.json( { error: "Refresh token required" }, { status: 400  });

    const vendorId = request.headers.get('x-vendor-identifier');
    const     host = request.headers.get('host');
    if (!vendorId && !host) 
      return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400  });

  try {
    const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ['createdAt', 'primaryDomain']    });
    if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // ['secrets', 'timeLimitations', 'status'] 

    // Decrypt token secrets
    const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    const RT_SECRET_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY;    
    if (!AT_SECRET_KEY || !RT_SECRET_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 });
    const  ACCESS_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.accessTokenSecret,
                                                    options: { secret: AT_SECRET_KEY } });    
    const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.refreshTokenSecret,
                                                    options: { secret: RT_SECRET_KEY } });


    const    shop_db = await dbConnect({ dbKey: dbName, dbUri })
    const  UserModel = userModel(shop_db);
    const SessionModel = sessionModel(shop_db);

    // Verify refresh token
    let payload;
    try { payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);} 
    catch (err) {
        if (err.name === 'TokenExpiredError') return NextResponse.json({ error: "Refresh token expired" }, { status: 401  })
            return NextResponse.json({ error: "Invalid refresh token" }, { status: 401  });
    }
    if (!payload.session) 
        return NextResponse.json({ error: "Invalid token payload" }, { status: 401  });

    // Find session
    const session = await SessionModel.findById(payload.session);
    if (              !session || session.revoked       ||
          (session.fingerprint != payload?.fingerprint) ||
       (session.refreshTokenId != payload?.tokenId ))
        return NextResponse.json({ error: "Invalid session" }, { status: 401  });

    // Token rotation: Generate new identifiers
    const newAccessTokenId = crypto.randomBytes(16).toString('hex');
    const newRefreshTokenId = crypto.randomBytes(16).toString('hex');

    // Token configuration
    const AT_EXPIRY = Number(vendor.expirations?.accessTokenExpireMinutes) || 15;
    const RT_EXPIRY = Number(vendor.expirations?.refreshTokenExpireMinutes) || 1440;

    // Get user data for updated claims
    const user = await UserModel.findById(session.userId).select(
      "name avatar email phone role theme language timezone currency"
    ).lean();

    if (!user || (payload.email !== user.email && payload.phone !== user.phone))
      return NextResponse.json( { error: "User not found" },  { status: 404  })

    const newPayload = {    session: session._id,
                        fingerprint,
                               name: user.name,
                              email: user.email,
                              phone: user.phone,
                               role: user.role,
                         isVerified: user.isEmailVerified || user.isPhoneVerified };

    const  accessToken = jwt.sign( {...newPayload, tokenId: newAccessTokenId },
                                                         ACCESS_TOKEN_SECRET,
                                  { expiresIn: minutesToExpiresIn(AT_EXPIRY) } );
    
    const refreshToken = jwt.sign( {...newPayload, tokenId: newRefreshTokenId },
                                                         REFRESH_TOKEN_SECRET,
                                   { expiresIn: minutesToExpiresIn(RT_EXPIRY) } );
    const accessTokenExpiry = minutesToExpiryTimestamp(AT_EXPIRY)
    const refreshTokenExpiry = minutesToExpiryTimestamp(RT_EXPIRY)

    // Update session with new token identifiers
    session.accessTokenId      = newAccessTokenId;
    session.refreshTokenId     = newRefreshTokenId;
    session.accessTokenExpiry  = accessTokenExpiry;
    session.refreshTokenExpiry = refreshTokenExpiry;
    session.lastRefreshed      = new Date();
    await session.save();

    // Prepare response
    const response = NextResponse.json( {              success: true,
                                                   accessToken,
                                                  refreshToken,
                                           accessTokenExpireAt: new Date(accessTokenExpiry).toISOString(),
                                          refreshTokenExpireAt: new Date(refreshTokenExpiry).toISOString(),
                                                user: {    _id: user._id,
                                                          name: user.name,
                                                         email: user.email,
                                                         phone: user.phone,
                                                          role: user.role,
                                                        avatar: user.avatar,
                                                         local: { theme   : user.theme,
                                                                  language: user.language,
                                                                  timezone: user.timezone,
                                                                  currency: user.currency   },
                                                    } },
      { status: 200  }
    );

    // Set HTTP-only cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: AT_EXPIRY * 60
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: RT_EXPIRY * 60
    });

    return response;

  } catch (error) {
    console.error(`Token refresh error: ${error.message}`);
    return NextResponse.json( { error: "Token refresh failed" }, { status: 500  } ) }
}