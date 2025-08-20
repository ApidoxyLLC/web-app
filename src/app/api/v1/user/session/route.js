import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import jwt from "jsonwebtoken";
import { getVendor } from "@/services/vendor/getVendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import config from "../../../../../../config";
import { validateSession } from "@/lib/redis/helpers/endUserSession";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
// import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { authenticationStatus } from "../../middleware/auth";

export async function GET(request) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.headers["x-real-ip"] || request.socket?.remoteAddress || "";

  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." },{ status: 429, headers: { "Retry-After": retryAfter.toString() } });

  const   vendorId = request.headers.get("x-vendor-identifier");
  const       host = request.headers.get("host");
  const authHeader = request.headers.get("authorization");


  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });
  

  if (!authHeader || !authHeader.startsWith("Bearer ")) 
    return NextResponse.json({ success: false, message: "Unauthorized", code: "MISSING_TOKEN" },{ status: 401 });
  const accessToken = authHeader.split(" ")[1];

  try {
    // const { vendor, dbUri, dbName } = await getVendor({ id: vendorId, host, fields: ["createdAt", "primaryDomain", "secrets.accessTokenSecret"],});
    // if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 });

    // const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    // if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // const ACCESS_TOKEN_SECRET = await decrypt({cipherText: vendor.secrets.accessTokenSecret, 
    //                                               options: { secret: config.accessTokenSecretEncryptionKey } });

    const { success: authenticated, vendor, data, isTokenRefreshed, token, db } = await authenticationStatus(request);
    console.log(authenticated)
    console.log(data)
    console.log(vendor)
    if(!authenticated) return NextResponse.json({ error: "Unauthorized..." }, { status: 400 });

    const user = data || null;

        // return { success: true, isTokenRefreshed: false, data: { ...decoded, ...cachedSession}, vendor };
// 
    // console.log(vendor)
    // console.log(data)
    // console.log(token)
    // return NextResponse.json({ message: "TEST response " },{ status: 200 });
    // Verify token
    // let payload;
    // try { payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET); } 
    // catch (err) {
    //   const code = (err instanceof jwt.TokenExpiredError) 
    //                 ? "TOKEN_EXPIRED" 
    //                 : "INVALID_TOKEN";
                    
    //   const message = (code === "TOKEN_EXPIRED") 
    //                     ? "Token expired" 
    //                     : "Invalid token";
    //   return NextResponse.json({ success: false, message, code },{ status: 401 });
    // }

    // if (!payload.sub || !payload.tokenId) return NextResponse.json( { success: false, message: "Invalid token payload", code: "INVALID_TOKEN", }, { status: 401 } );



    // let redisSession;
    // // { vendorId, sessionId, tokenId }
    // try { redisSession = await validateSession({  vendorId: vendor.id,  
    //                                              sessionId: payload.sub, 
    //                                                tokenId: payload.tokenId });} 
    // catch (err) { return { authenticated: false, error: " session check failed" };}

    // const { userId, tokenId } = redisSession;


    // Connect to vendor shop database
    // const shop_db = await dbConnect({ dbKey: dbName, dbUri });
    // const    User = userModel(shop_db);

    // // Aggregate user with session accessTokenExpiry
    // const [user] = await User.aggregate([
    //                                     {
    //                                       $lookup: {
    //                                         from: "sessions", // Session collection name
    //                                         localField: "_id",
    //                                         foreignField: "userId",
    //                                         as: "session",
    //                                         pipeline: [
    //                                           {
    //                                             $match: {
    //                                               _id: new ObjectId(payload.session), 
    //                                             },
    //                                           },
    //                                           {
    //                                             $project: {
    //                                               accessTokenExpiry: 1,
    //                                             },
    //                                           },
    //                                         ],
    //                                       },
    //                                     },
    //                                     {
    //                                       $unwind: "$session", // Convert session array to single object
    //                                     },
    //                                     {
    //                                       $project: {
    //                                         name: 1,
    //                                         avatar: 1,
    //                                         email: 1,
    //                                         phone: 1,
    //                                         role: 1,
    //                                         theme: 1,
    //                                         language: 1,
    //                                         timezone: 1,
    //                                         currency: 1,
    //                                         isEmailVerified: 1,
    //                                         isPhoneVerified: 1,
    //                                         accessTokenExpiry: "$session.accessTokenExpiry"
    //                                       },
    //                                     },
    //                                   ]);

    // // No session or session expired
    // if (!user || user.accessTokenExpiry < Date.now()) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message: "Session expired",
    //       code: "SESSION_EXPIRED",
    //     },
    //     { status: 401 });
    // }

    // Check account lock
    // if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message: "Account locked",
    //       code: "ACCOUNT_LOCKED",
    //     },
    //     { status: 403 }
    //   );
    // }

    // Respond with user data
    // return NextResponse.json({
    //   success: true,
    //   user: {
    //     _id: user._id,
    //     name: user.name,
    //     email: user.email,
    //     phone: user.phone,
    //     role: user.role,
    //     avatar: user.avatar,
    //     isVerified: user.isEmailVerified || user.isPhoneVerified,
    //     local: {
    //       theme: user.theme,
    //       language: user.language,
    //       timezone: user.timezone,
    //       currency: user.currency,
    //     },
    //   },
    //   accessTokenExpiry: user.accessTokenExpiry,
    // });

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
              currency: user.currency,
            },
          },
          accessTokenExpiry: user.accessTokenExpiry,
        });
  } catch (error) {
    console.error(`Session Validation Error: ${error.message}`);
    return NextResponse.json(
      { error: "Session validation failed" },
      { status: 500 }
    );
  }
}