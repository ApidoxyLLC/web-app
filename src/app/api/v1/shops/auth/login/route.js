import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { encrypt, decrypt } from "@/lib/encryption/cryptoEncryption";
import loginDTOSchema from "./loginDTOSchema";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { loginHistoryModel } from "@/models/shop/shop-user/LoginHistory";
import { cookies } from "next/headers";
import sendSMS from "@/services/mail/sendSMS";
import rateLimit from "./rateLimit";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import minutesToExpiresIn from "@/app/utils/shop-user/minutesToExpiresIn";
import addMinutesToISO from "@/app/utils/addMinutesToISO";
import config from "../../../../../../../config";

function applyHeaders(response, headers) {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}


export async function POST(request) {
  // Input validation
  let body;
  try { body = await request.json();} 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}
  const    vendorId = request.headers.get('x-vendor-identifier');
  const        host = request.headers.get('host'); 
  const          ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const   userAgent = request.headers.get('user-agent') || '';
  const fingerprint = request.headers.get('x-fingerprint') || null;


  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });
  const    parsed = loginDTOSchema.safeParse(body);
  if (!parsed.success)    return NextResponse.json( { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 422 });

  const { allowed, headers} = rateLimit({ip, fingerprint});
  if (!allowed) return NextResponse.json( { error: "Too many requests" }, { status: 429, headers: headers } );

  try {
    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Get shop configuration
    const shop = await ShopModel.findOne({ $or: [ { vendorId }, { "domains": { $elemMatch: { domain: host } } }]})
                                .select("+_id "+
                                        "+dbInfo +dbInfo.uri +dbInfo.prefix "+
                                        "+maxSessionAllowed "+
                                        "+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET " +
                                        "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES +timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES" 
                                      ).lean();

    if (!shop) 
      return NextResponse.json( { error: "Authentication failed" }, { status: 400 } )

    // Decrypt DB URI
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, options: { secret: DB_URI_ENCRYPTION_KEY } });

    // Decrypt token secrets
    const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    const RT_SECRET_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY;    
    if (!AT_SECRET_KEY || !RT_SECRET_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 });
    const  ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
                                                    options: { secret: AT_SECRET_KEY } });    
    const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.REFRESH_TOKEN_SECRET,
                                                    options: { secret: RT_SECRET_KEY } });

    // Connect to vendor DB
    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const  vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const  UserModel = userModel(vendor_db);

    // Validate input

    const identifier      = parsed.data.identifier?.trim();
    const password        = parsed.data.password;
    const identifierName  = parsed.data.identifierName;
    const timezone        = parsed.data.timezone?.trim();

    // Get user document (non-lean for updates)
    const user = await UserModel.findOne({ [identifierName]: identifier.trim() })
                                .select("+security.password +security.failedAttempts +security.isBlocked " +
                                        "+isEmailVerified +isPhoneVerified " +
                                        "+lock.lockUntil " +
                                        "+activeSessions " +
                                        "+name +avatar +email +phone +role +theme +language +timezone +currency " +
                                        "+twoFactor.enabled" );
    if (!user) return NextResponse.json( { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 } );

    // Account lock check
    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
      return NextResponse.json({ error: `Account locked. Try again in ${retryAfter} seconds` }, { status: 423, headers: { 'Retry-After': retryAfter.toString() } } );
    }

    // Password validation
    if (!user.security?.password) 
      return NextResponse.json({ success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 } );
    const validPassword = await bcrypt.compare(password, user.security.password);
    
    if (!validPassword) {
      const MAX_ATTEMPTS = parseInt(process.env.END_USER_MAX_LOGIN_ATTEMPT || "5", 10);
      user.security.failedAttempts = (user.security.failedAttempts || 0) + 1;
      
      if (user.security.failedAttempts >= MAX_ATTEMPTS) {
        // Exponential backoff lock
        const LOCK_MINUTES = parseInt(process.env.END_USER_LOCK_MINUTES || "15", 10);
        const lockMinutes = LOCK_MINUTES * Math.pow(2, user.security.failedAttempts - MAX_ATTEMPTS);
        user.lock = { lockUntil: Date.now() + lockMinutes * 60 * 1000 };
      }

      await user.save();
      const isLocked = user.lock?.lockUntil && user.lock.lockUntil > Date.now();
      const retrySeconds = Math.ceil((user.lock?.lockUntil - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" },
        { 
          status: isLocked ? 429 : 401,
          ...(isLocked && { headers: { 'Retry-After': retrySeconds.toString() } }),
        }
      );
    }

    // Handle 2FA if enabled
    // Temporary turn of Two Factor authentication 
    // this will implement later now, to Two factor service is on
    // if (user.phone && user.twoFactor?.enabled) {
    //   const OTP_ENCRYPTION_KEY = process.env.END_USER_TWO_STEP_OTP_ENCRYPTION_KEY;
    //   if (!OTP_ENCRYPTION_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 } );
    //   const PHONE_VERIFICATION_EXPIRE_MINUTES = Number(process.env.END_USER_PHONE_VERIFICATION_EXPIRE_MINUTES) || 5;
    //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
    //   const otpCipherText = await encrypt({ data: otp, options: { secret: OTP_ENCRYPTION_KEY } });

    //   // Start transaction for 2FA
    //   const dbSession = await vendor_db.startSession();
    //   try {
    //     await dbSession.withTransaction(async () => {
    //       // Reset security counters
    //       user.security.failedAttempts = 0;
    //       user.lock = undefined;
          
    //       // Set OTP
    //       user.twoFactor              = user.twoFactor || {};
    //       user.twoFactor.token        = otpCipherText;
    //       user.twoFactor.tokenExpiry  = minutesToExpiryTimestamp(PHONE_VERIFICATION_EXPIRE_MINUTES);
          
    //       await user.save({ session: dbSession });
    //     });
    //   } finally {
    //     dbSession.endSession();
    //   }

    //   // Send SMS outside transaction
    //   try {
    //     await sendSMS({
    //       phone: user.phone,
    //       message: `Your verification code: ${otp} (valid for ${PHONE_VERIFICATION_EXPIRE_MINUTES} minutes)`
    //     });
    //   } catch (err) {
    //     console.error("SMS send failed:", err);
    //     return NextResponse.json(
    //       { error: "Failed to send verification code" },
    //       { status: 500 }
    //     );
    //   }

    //   return NextResponse.json(
    //     { success: true, message: "OTP sent to your phone" },
    //     { status: 200 }
    //   );
    // }

    // Regular login flow (no 2FA)

    const sessionId = new mongoose.Types.ObjectId();
    const newAccessTokenId = crypto.randomBytes(16).toString('hex');
    const newRefreshTokenId = crypto.randomBytes(16).toString('hex');
    const MAX_SESSIONS = shop.maxSessionAllowed || Number(process.env.END_USER_DEFAULT_MAX_SESSIONS) || 5;

    // Token configuration
    const AT_EXPIRY = Number(shop.timeLimitations?.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
    const RT_EXPIRY = Number(shop.timeLimitations?.REFRESH_TOKEN_EXPIRE_MINUTES) || 1440;
    
    const AT_ENCRYPT_KEY = process.env.END_USER_ACCESS_TOKEN_ENCRYPTION_KEY;
    const RT_ENCRYPT_KEY = process.env.END_USER_REFRESH_TOKEN_ENCRYPTION_KEY;
    const IP_ENCRYPT_KEY = process.env.END_USER_IP_ADDRESS_ENCRYPTION_KEY;
    
    if (!AT_ENCRYPT_KEY || !RT_ENCRYPT_KEY || !IP_ENCRYPT_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 } );
    
    const payload = {     
                         session: sessionId.toString(),
                     fingerprint,
                            name: user.name,
                           email: user.email,
                           phone: user.phone,
                            role: user.role,
                      isVerified: user.isEmailVerified || user.isPhoneVerified };

    const accessToken = jwt.sign( { ...payload, tokenId: newAccessTokenId },
                                  ACCESS_TOKEN_SECRET,
                                  { expiresIn: minutesToExpiresIn(AT_EXPIRY) } );
    

    const refreshToken = jwt.sign(
      { ...payload, tokenId: newRefreshTokenId },
      REFRESH_TOKEN_SECRET,
      { expiresIn: minutesToExpiresIn(RT_EXPIRY) }
    );

    const    ipAddressCipherText = await encrypt({ data: ip,
                                                options: { secret: IP_ENCRYPT_KEY }     });                    
    const  accessTokenExpiry = minutesToExpiryTimestamp(AT_EXPIRY)
    const refreshTokenExpiry = minutesToExpiryTimestamp(RT_EXPIRY)
    // Start transaction for login
    const dbSession = await vendor_db.startSession();
    try {
        await dbSession.withTransaction(async () => {
        const SessionModel = sessionModel(vendor_db);
        const LoginHistoryModel = loginHistoryModel(vendor_db);

        // 1. Create session
        await new SessionModel({               _id: sessionId,
                                            userId: user._id,
                                          provider: `local-${identifierName}`, // Fixed template literal
                                     accessTokenId: newAccessTokenId,
                                    refreshTokenId: newRefreshTokenId,
                                      //  accessToken: accessTokenCipherText,
                                 accessTokenExpiry: accessTokenExpiry,
                                      // refreshToken: refreshTokenCipherText,
                                refreshTokenExpiry: refreshTokenExpiry,                                     
                                                ip: ipAddressCipherText,
                                       fingerprint,
                                         userAgent
                                }).save({ session: dbSession });

        // 2. Update user sessions (prune if exceeding limit)
        user.activeSessions = user.activeSessions || [];
        user.activeSessions.push({ sessionId });

        if (user.activeSessions.length > MAX_SESSIONS) {
          const excessSessions = user.activeSessions.length - MAX_SESSIONS;
          const sessionsToRemove = user.activeSessions.splice(0, excessSessions);
          const sessionIds = sessionsToRemove.map(s => s.sessionId);
          await SessionModel.deleteMany( { _id: { $in: sessionIds } }, { session: dbSession } );
        }

        // 3. Reset security flags        
        if ((!user.timezone || user.timezone.trim() === '') && timezone) user.timezone = timezone;
        user.security.failedAttempts = 0;
        user.lock = undefined;
        await user.save({ session: dbSession });

        // 4. Record login history
        await new LoginHistoryModel({      userId: user._id,
                                        sessionId,
                                         provider: `local-${identifierName}`, // Fixed template literal
                                               ip: ipAddressCipherText,
                                        userAgent,
                                      fingerprint,
                                    }).save({ session: dbSession });
      });
    }    

    finally { await dbSession.endSession() }
    
    const response = NextResponse.json({      success: true,
                                          accessToken,
                                         refreshToken,
                                  accessTokenExpireAt: new Date(accessTokenExpiry).toISOString(),
                                 refreshTokenExpireAt: new Date(refreshTokenExpiry).toISOString(),
                                                 user: {   _id: user._id,
                                                          name: user.name,
                                                         email: user.email,
                                                         phone: user.phone,
                                                          role: user.role,
                                                        avatar: user.avatar,
                                                         local: { theme   : user.theme,
                                                                  language: user.language,
                                                                  timezone: user.timezone,
                                                                  currency: user.currency   },
                                                      }
                                        }, { status: 200 });
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      domain: host,
      maxAge: Math.floor((accessTokenExpiry - Date.now()) / 1000),
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      domain: host,
      maxAge: Math.floor((refreshTokenExpiry - Date.now()) / 1000),
    });                                        
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    Object.entries(headers).forEach(([key, value]) => { response.headers.set(key, value); });      
    return response;
  } catch (error) {
    console.error(`Login Error: ${error.message}`);
    return NextResponse.json( { error: "Authentication failed" }, { status: 500 } );
  }
}



// export async function POST(request) {
//   /** 
//    ** ****************************** **
//    **         Remaining Task         **
//    **  Rate Limiting for this route  **
//    **   This will Implement later    **
//    ** ****************************** **
//    */
//   let body;
//   try { body = await request.json(); } 
//   catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}
  
//   const   parsed = loginDTOSchema.safeParse(body);
//   const vendorId = request.headers.get('x-vendor-identifier');
//   const     host = request.headers.get('host'); 

//   if (!parsed.success)    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
//   if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });




//   try {
//     // Connect to auth database and get shop info
//     const auth_db   = await authDbConnect();
//     const ShopModel = await shopModel(auth_db);
//     const shop      = await ShopModel.findOne({ $or: [{ vendorId }, { "domains": { $elemMatch: { domain: host } } }],})
//                                      .select("+_id " + 
//                                              "+dbInfo " +
//                                              "+dbInfo.uri "+
//                                              "+dbInfo.prefix "+
//                                              "+maxSessionAllowed "+
//                                              "+keys "+
//                                              "+keys.ACCESS_TOKEN_SECRET "+
//                                              "+keys.REFRESH_TOKEN_SECRET "+
//                                              "+timeLimitations "+
//                                              "+timeLimitations.EMAIL_VERIFICATION_EXPIRE_MINUTES "+
//                                              "+timeLimitations.PHONE_VERIFICATION_EXPIRE_MINUTES "+
//                                              "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES "+
//                                              "+timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES "
//                                             ).lean();

//     if (!shop)
//       return NextResponse.json({ error: "Invalid request" }, { status: 400 });

//     // Decrypt and connect to vendor database
//     const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
//     if (!DB_URI_ENCRYPTION_KEY) throw new Error("Key missing... check config...");
//     const dbUri = await decrypt({ cipherText: shop.dbInfo.uri, options: { secret: DB_URI_ENCRYPTION_KEY } });

//     const  ACCESS_TOKEN_SECRET_ENCRYPTION_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY
//     const REFRESH_TOKEN_SECRET_ENCRYPTION_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY
//     if (!ACCESS_TOKEN_SECRET_ENCRYPTION_KEY || !REFRESH_TOKEN_SECRET_ENCRYPTION_KEY || !shop.keys.ACCESS_TOKEN_SECRET || !shop.keys.REFRESH_TOKEN_SECRET)
//       return NextResponse.json({ error: "Error..." }, { status: 400 });

//       const ACCESS_TOKEN_SECRET  = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET, 
//                                                       options: { secret: ACCESS_TOKEN_SECRET_ENCRYPTION_KEY } });
//       const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.REFRESH_TOKEN_SECRET, 
//                                                       options: { secret: REFRESH_TOKEN_SECRET_ENCRYPTION_KEY } });



//     if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET)
//       return NextResponse.json({ error: "Error..." }, { status: 400 });

//     const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
//     const  vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
//     const  UserModel = userModel(vendor_db);

    
//     const fingerprint     = parsed.data.fingerprint?.trim()|| null;
//     const identifier      = parsed.data.identifier?.trim();
//     const password        = parsed.data.password;
//     const identifierName  = parsed.data.identifierName
//     const timezone        = parsed.data.timezone?.trim();

//     const allowedIdentifiers = ['email', 'phone', 'username'];
//     if (!allowedIdentifiers.includes(identifierName)) {
//       return NextResponse.json({ error: "Invalid identifier type" }, { status: 400 });
//     }

//     const user = await UserModel.findOne({ [identifierName]:identifier })
//                                 .select("+_id "+
//                                         "+user.phone "+
//                                         "+security "+
//                                         "+security.password "+
//                                         "+security.failedAttempts"+
//                                         "+security.isBlocked "+
//                                         "+twoFactor " +
//                                         "+twoFactor.enabled " +
//                                         "+twoFactor.token " +
//                                         "+twoFactor.tokenExpires "+
//                                         "+lock " +
//                                         "+lock.lockUntil " +
//                                         "+activeSessions "+
//                                         "+isEmailVerified " +
//                                         "+isPhoneVerified " +
//                                         "+name +avatar +email +phone +role +theme +language +timezone +currency"
//                                         ).lean();
//     if(user.phone && user.twoFactor.enabled){
//         /** Two Step verification approach */ 
//         const PHONE_VERIFICATION_EXPIRE_MINUTES = Number(process.env.END_USER_PHONE_VERIFICATION_EXPIRE_MINUTES || 5); // minutes
//         const       TWO_STEP_OTP_ENCRYPTION_KEY = process.env.END_USER_TWO_STEP_OTP_ENCRYPTION_KEY
//         const                               otp = Math.floor(100000 + Math.random() * 900000).toString();
//         const                     otpCipherText = await encrypt({  data: otp,
//                                                                 options: { secret: TWO_STEP_OTP_ENCRYPTION_KEY }      });

//         user.twoFactor              = user.twoFactor || {}
//         user.twoFactor.token        = otpCipherText
//         user.twoFactor.tokenExpiry  = minutesToExpiryTimestamp(PHONE_VERIFICATION_EXPIRE_MINUTES)
        
//         const savedUser = await user.save()
//         if(!savedUser) return NextResponse.json({ error: "Failed to send verification code, pls try again..." }, { status: 500 })
//         const smsSendResult = await sendSMS({ phone: user.phone, message: `Your verification code: ${otp} (valid for ${PHONE_VERIFICATION_EXPIRE_MINUTES} minutes)`});
//         if(!smsSendResult) return NextResponse.json({ error: "Failed to send verification code, pls try again..." }, { status: 500 })
//         return NextResponse.json( { success: true, message: "OTP send to your phone, check your SMS" }, { status: 200 });
//     }
    
//     if (!user || !user.security?.password) throw new Error("Invalid credentials");

//     // Check lock user
//     if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
//         const retryAfter = Math.ceil( (user.lock.lockUntil - Date.now()) / 1000);
//         return NextResponse.json(
//               { error: `Account locked. Try again in ${retryAfter} seconds` },
//               { status: 423, headers: { 'Retry-After': retryAfter.toString() } }
//             );
//     }
//      if (!user?.security?.password) {
//         return { status: false, reason: 'no_password', message: 'Password not set.' };
//     }
//     const validPassword = await bcrypt.compare(password, user.security.password);
//     if (!validPassword) {
//         const MAX_ATTEMPTS =  Number(process.env.END_USER_MAX_LOGIN_ATTEMPT )|| 5;
//         user.security.failedAttempts = (user.security.failedAttempts || 0) + 1;
//         if (user.security.failedAttempts >= MAX_ATTEMPTS){
//           const lockMinutes = 5 * Math.pow(2, user.security.failedAttempts - MAX_ATTEMPTS);
//           user.lock = { lockUntil: Date.now() + lockMinutes * 60 * 1000 };
//         }
//         await user.save();
//         return NextResponse.json({ error: "Invalid credentials" },
//         { 
//           status: user.security.failedAttempts >= MAX_ATTEMPTS ? 429 : 401,
//           ...(user.security.failedAttempts >= MAX_ATTEMPTS && { headers: { 'Retry-After': '60' } })
//         }
//       );
//     }
//     user.security.failedAttempts = 0;
//     user.lock = undefined;
//     await user.save();

//     try {
//       const ip =  request.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
//                   request.headers['x-real-ip'] || 
//                   request.socket?.remoteAddress || '';
//       const userAgent = request.headers['user-agent'] || '';
//       const sessionId = new mongoose.Types.ObjectId();
//       const MAX_SESSIONS = shop.maxSessionAllowed || Number(process.env.END_USER_DEFAULT_MAX_SESSIONS) || 5;


//       const  ACCESS_TOKEN_EXPIRE_MINUTES = Number(shop.timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
//       const REFRESH_TOKEN_EXPIRE_MINUTES = Number(shop.timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES)  || 1440
//       const  ACCESS_TOKEN_ENCRYPTION_KEY = process.env.END_USER_ACCESS_TOKEN_ENCRYPTION_KEY
//       const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.END_USER_REFRESH_TOKEN_ENCRYPTION_KEY
//       const    IP_ADDRESS_ENCRYPTION_KEY = process.env.END_USER_IP_ADDRESS_ENCRYPTION_KEY
//     if (!ACCESS_TOKEN_ENCRYPTION_KEY || !REFRESH_TOKEN_ENCRYPTION_KEY)
//       return NextResponse.json({ error: "Missing keys" }, { status: 400 });

//       const payload = {
//               name: user.name,
//             avatar: user.avatar,
//              email: user.email,
//              phone: user.phone,
//         isVerified: user.isEmailVerified || user.isPhoneVerified,
//               role: user.role,
//              local: {
//                       theme   : user.theme,
//                       language: user.language,
//                       timezone: user.timezone,
//                       currency: user.currency
//                     }
//       }

//       const  accessToken = jwt.sign( payload, ACCESS_TOKEN_SECRET,  { expiresIn: minutesToExpiresIn(ACCESS_TOKEN_EXPIRE_MINUTES) });
//       const refreshToken = jwt.sign( payload, REFRESH_TOKEN_SECRET, { expiresIn: minutesToExpiresIn(REFRESH_TOKEN_EXPIRE_MINUTES) });

//       const  accessTokenCipherText = await encrypt({        data: accessToken,
//                                                         options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }      });

//       const refreshTokenCipherText = await encrypt({       data: refreshToken,
//                                                         options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }     });

//       const    ipAddressCipherText = await encrypt({       data: ip,
//                                                         options: { secret: IP_ADDRESS_ENCRYPTION_KEY }     });
      
//       const dbSession = await vendor_db.startSession();
//       try {
//         await  dbSession.withTransaction( async () => {
//           const SessionModel      = sessionModel(vendor_db)
//           const LoginHistoryModel = loginHistoryModel(vendor_db);
//           const newSession = new SessionModel({          _id: sessionId, 
//                                                   userId: user._id, 
//                                                 provider: 'local-'+identifierName,
//                                              accessToken: accessTokenCipherText,
//                                        accessTokenExpiry: minutesToExpiryTimestamp(ACCESS_TOKEN_EXPIRE_MINUTES),                                      
//                                             refreshToken: refreshTokenCipherText,
//                                       refreshTokenExpiry: minutesToExpiryTimestamp(REFRESH_TOKEN_EXPIRE_MINUTES),
//                                                       ip: ipAddressCipherText,  
//                                              fingerprint: fingerprint,
//                                                userAgent: userAgent || '',
//                                                timezone,
//                                     });
//           const newHistory = LoginHistoryModel({     userId: user._id,
//                                                   sessionId: sessionId,
//                                                    provider: 'local-'+identifierName,
//                                                          ip: ipAddressCipherText,
//                                                   userAgent: userAgent,
//                                                 fingerprint: fingerprint      }) 

//         // const savedSession = await newSession.save()
//         // const savedHistory = await newHistory.save();

//             await Promise.all([
//               newSession.save({ session: dbSession }),
//               newHistory.save({ session: dbSession })
//             ]);

//             if ((MAX_SESSIONS > 0) && user?.activeSessions?.length) {
//                 const sessions = await SessionModel.find({ userId: user._id })
//                                                    .sort({ createdAt: -1 })
//                                                    .session(dbSession);
 
//               if (sessions.length > MAX_SESSIONS) {
//                 const idsToDelete = sessions.slice(MAX_SESSIONS).map(s => s._id);
//                 await SessionModel.deleteMany(
//                   { _id: { $in: idsToDelete } },
//                   { session: dbSession }
//                 );

//                  const query = userModel.updateOne(   { _id: user._id },
//                                     {   $set: {
//                                                 "security.failedAttempts": 0,
//                                                 "lock.lockUntil": null,
//                                                 "security.lastLogin": new Date()
//                                                 },
//                                         $push: { 
//                                                 activeSessions: {
//                                                     $each: [sessionId],
//                                                     $slice: -MAX_SESSIONS // Keep last N elements
//                                                 }
//                                             }
//                                     },
//                                     { upsert: true }
//                     )

                    
//               }
//             }

//         })
//         NextResponse.json({ success: true, message: "Login successful", data: { accessToken, refreshToken} }, { status: 200 });

//       } catch (error) {
//         return NextResponse.json(
//           { error: "Internal server error" },
//           { status: 500 }
//         );
//       }

                                                        
      


      


      

//     } 
//     catch (error) {
//         console.error("Login failed:", error);
//         throw new Error("Authentication failed")
//     }
//   } catch (error) {
//     console.error(`Login Error: ${error.message}`);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }











    // finally {
    //   dbSession.endSession(); // Guaranteed cleanup
    // }




    // try {
        
    //     const      SessionModel = sessionModel(vendor_db);
    //     const LoginHistoryModel = loginHistoryModel(vendor_db);    
    //     const   newLoginSession = new SessionModel({    _id: sessionId,
    //                                                userId: user._id,
    //                                              provider: `local-${identifierName}`,
    //                                           accessToken: accessTokenCipherText,
    //                                     accessTokenExpiry: minutesToExpiryTimestamp(AT_EXPIRY),
    //                                          refreshToken: refreshTokenCipherText,
    //                                    refreshTokenExpiry: minutesToExpiryTimestamp(RT_EXPIRY),
    //                                                    ip: ipAddressCipherText,
    //                                           fingerprint: fingerprint,
    //                                             userAgent,
    //                                 });

    //     const savedLoginSession = await newLoginSession.save({ session: dbSession });

    //     user.activeSessions = user.activeSessions || [];
    //     user.activeSessions.push({ sessionId: savedLoginSession._id });
    //     if(user.activeSessions.length > MAX_SESSIONS){
    //       const   excessSessions = user.activeSessions.length - MAX_SESSIONS;
    //       const sessionsToRemove = user.activeSessions.splice(0, excessSessions);
    //       const       sessionIds = sessionsToRemove.map(s => s.sessionId);
    //       await SessionModel.deleteMany({ _id: { $in: sessionIds } }, { session: dbSession });
    //     }
    //     user.security.failedAttempts = 0;
    //     user.lock = undefined;
    //     const savedUser = await user.save({ session: dbSession })

    //     // Create login history
    //     const newHistory = new LoginHistoryModel({     userId: user._id,
    //                                                 sessionId: sessionId,
    //                                                  provider: `local-${identifierName}`,
    //                                                        ip: ipAddressCipherText,
    //                                                 userAgent,
    //                                               fingerprint
    //                                               });
    //     await newHistory.save({ session: dbSession });
    //     await dbSession.commitTransaction();
    //     dbSession.endSession();
    //     const response =  NextResponse.json({     success: true,
    //                                           accessToken,
    //                                          refreshToken,
    //                                                  user: { _id: savedUser._id,
    //                                                         name: savedUser.name,
    //                                                        email: savedUser.email,
    //                                                        phone: savedUser.phone,
    //                                                         role: savedUser.role,
    //                                                       avatar: savedUser.avatar,
    //                                                        local: { theme   : savedUser.theme,
    //                                                                 language: savedUser.language,
    //                                                                 timezone: savedUser.timezone,
    //                                                                 currency: savedUser.currency   },
    //                                                 }
    //                                         }, { status: 200 });

    //     // Add security headers
    //     response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    //     response.headers.set('X-Content-Type-Options', 'nosniff');
    //     response.headers.set('X-Frame-Options', 'DENY');
    //     response.headers.set('Referrer-Policy', 'same-origin');
    //     response.headers.set('X-XSS-Protection', '1; mode=block');
    //     response.headers.set('X-DNS-Prefetch-Control', 'off');
    //     Object.entries(headers).forEach(([key, value]) => { response.headers.set(key, value); });

    //     return response;

    // } 
    // catch (error)  {
    //   return NextResponse.json( { error: "Login failed" }, { status: 500 } );
    // }