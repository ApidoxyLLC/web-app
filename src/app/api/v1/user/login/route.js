import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { encrypt, decrypt } from "@/lib/encryption/cryptoEncryption";
import loginDTOSchema from "./loginDTOSchema";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { loginHistoryModel } from "@/models/shop/shop-user/LoginHistory";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import minutesToExpiresIn from "@/app/utils/shop-user/minutesToExpiresIn";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import config from "../../../../../../config";
import crypto from 'crypto';
import securityHeaders from "../../utils/securityHeaders";
import { setSession } from "@/lib/redis/helpers/endUserSession";


export async function POST(request) {
  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const referenceId = request.headers.get('x-vendor-identifier');
  const        host = request.headers.get('host');

  // Rate limiter 
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown_ip';
  const { allowed, retryAfter } = await applyRateLimit({  key: `${host}:${ip}` });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

  // Input validation
  // const fingerprint = request.headers.get('x-fingerprint') || null;

  if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });
  const parsed = loginDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json( { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 422 });

  try {
    // Connect to auth database
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    
    // Connect to vendor DB
    const    shop_db = await dbConnect({ dbKey: dbName, dbUri })
    const  User = userModel(shop_db);
  
    // Validate input
    const identifier      = parsed.data.identifier?.trim();
    const password        = parsed.data.password;
    const identifierName  = parsed.data.identifierName;
    const fingerprint     = parsed.data.fingerprint;
    const timezone        = parsed.data.timezone?.trim();
    const userAgent       = request.headers.get('user-agent') || '';

    // Get user document (non-lean for updates)
    const [user] = await User.aggregate([ { $match: { [identifierName]: identifier.trim() } },
                                          {
                                            $lookup: {
                                              from: 'carts',
                                              localField: 'cart',
                                              foreignField: '_id',
                                              as: 'cartData'
                                            }
                                          },
                                          {
                                            $unwind: {
                                              path: '$cartData',
                                              preserveNullAndEmptyArrays: true
                                            }
                                          },
                                          {
                                            $lookup: {
                                              from: 'products',
                                              localField: 'cartData.items.productId',
                                              foreignField: '_id',
                                              as: 'products'
                                            }
                                          },
                                          {
                                            $project: {
                                              security: 1,
                                              lock: 1,
                                              cart: 1,

                                              // User profile fields
                                              name: 1,
                                              avatar: 1,
                                              email: 1,
                                              phone: 1,
                                              gender: 1,
                                              dob: 1,
                                              bio: 1,
                                              isEmailVerified: 1,
                                              isPhoneVerified: 1,
                                              activeSessions: 1,
                                              lock: 1, 
                                              role: 1,
                                              theme: 1,
                                              language: 1,
                                              timezone: 1,
                                              currency: 1,
                                              cartItems: {
                                                $map: {
                                                  input: '$cartData.items',
                                                  as: 'item',
                                                  in: {
                                                    $mergeObjects: [
                                                      '$$item',
                                                      {
                                                        product: {
                                                          $arrayElemAt: [
                                                            {
                                                              $filter: {
                                                                input: '$products',
                                                                as: 'prod',
                                                                cond: { $eq: ['$$prod._id', '$$item.productId'] }
                                                              }
                                                            },
                                                            0
                                                          ]
                                                        },
                                                        variants: {
                                                                      $cond: {
                                                                        if: '$$item.variantId',
                                                                        then: {
                                                                          $filter: {
                                                                            input: {
                                                                              $arrayElemAt: [
                                                                                {
                                                                                  $filter: {
                                                                                    input: '$products',
                                                                                    as: 'prod',
                                                                                    cond: { $eq: ['$$prod._id', '$$item.productId'] }
                                                                                  }
                                                                                },
                                                                                0
                                                                              ]
                                                                            }.variants,
                                                                            as: 'variant',
                                                                            cond: { $eq: ['$$variant._id', '$$item.variantId'] }
                                                                          }
                                                                        },
                                                                        else: []   // ✅ correct
                                                                      }
                                                                    }
                                                      }
                                                    ]
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        ]);


    // const cart = await Cart.findById(user.cart).select("items totals currency lastUpdated");
    
    if (!user) return NextResponse.json( { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 } );

    

    

    // Account lock check
    if (user.lock?.lockUntil && user.lock.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lock.lockUntil - Date.now()) / 1000);
      return NextResponse.json({ error: `Account locked. Try again in ${retryAfter} seconds` }, { status: 423, headers: { 'Retry-After': retryAfter.toString() } } );
    }

    // Password validation
    if (!user.security?.password) return NextResponse.json({ success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 } );
    const validPassword = await bcrypt.compare(password, user.security.password);



    // if (!validPassword) {
    //   const MAX_ATTEMPTS = parseInt(process.env.END_USER_MAX_LOGIN_ATTEMPT || "5", 10);
    //   user.security.failedAttempts = (user.security.failedAttempts || 0) + 1;
      
    //   if (user.security.failedAttempts >= MAX_ATTEMPTS) {
    //     // Exponential backoff lock
    //     const LOCK_MINUTES = parseInt(process.env.END_USER_LOCK_MINUTES || "15", 10);
    //     const lockMinutes = LOCK_MINUTES * Math.pow(2, user.security.failedAttempts - MAX_ATTEMPTS);
    //     user.lock = { lockUntil: Date.now() + lockMinutes * 60 * 1000 };
    //   }

    //   await user.save();
    //   const isLocked = user.lock?.lockUntil && user.lock.lockUntil > Date.now();
    //   const retrySeconds = Math.ceil((user.lock?.lockUntil - Date.now()) / 1000);
    //   return NextResponse.json( { success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: isLocked ? 429 : 401, ...(isLocked && { headers: { 'Retry-After': retrySeconds.toString() } }) } ); 
    // }

    if (!validPassword) {
      const MAX_ATTEMPTS = parseInt(process.env.END_USER_MAX_LOGIN_ATTEMPT || "5", 10);
      const failedAttempts = (user.security?.failedAttempts || 0) + 1;

      let updateDoc = { "security.failedAttempts": failedAttempts };

      if (failedAttempts >= MAX_ATTEMPTS) {
        const LOCK_MINUTES = parseInt(process.env.END_USER_LOCK_MINUTES || "15", 10);
        const lockMinutes = LOCK_MINUTES * Math.pow(2, failedAttempts - MAX_ATTEMPTS);
        updateDoc.lock = { lockUntil: Date.now() + lockMinutes * 60 * 1000 };
      }

      await User.updateOne({ _id: user._id }, { $set: updateDoc });
      console.log(".....******Invalid password")

      return NextResponse.json({ success: false, message: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    console.log("identifierName")
    console.log(identifierName)
   
    const notVerified = (identifierName === 'email' && !user.isEmailVerified) ||
      (identifierName === 'phone' && !user.isPhoneVerified) ||
      (identifierName === 'username' && !(user.isEmailVerified || user.isPhoneVerified));

    if (notVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Account not verified",
        },
        { status: 403 } 
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

    const       accessTokenIdLength = Number.isFinite(Number(vendor.secrets?.accessTokenIdLength ?? config.endUserAccessTokenIdLength))
                                                    ? Number(vendor.secrets?.accessTokenIdLength ?? config.endUserAccessTokenIdLength)
                                                    : 16;

    const      refreshTokenIdLength = Number.isFinite(Number(vendor.secrets?.refreshTokenIdLength ?? config.endUserRefreshTokenIdLength))
                                                    ? Number(vendor.secrets?.refreshTokenIdLength ?? config.endUserRefreshTokenIdLength)
                                                    : 32;

    const  accessTokenExpireMinutes = Number.isFinite(Number(vendor.expirations?.accessTokenExpireMinute ?? config.accessTokenDefaultExpireMinutes))
                                                    ? Number(vendor.expirations?.accessTokenExpireMinute ?? config.accessTokenDefaultExpireMinutes)
                                                    : 30;

    const refreshTokenExpireMinutes = Number.isFinite(Number(vendor.expirations?.refreshTokenExpireMinutes ?? config.refreshTokenDefaultExpireMinutes ))
                                                    ? Number(vendor.expirations?.refreshTokenExpireMinutes ?? config.refreshTokenDefaultExpireMinutes )
                                                    : 1440;

    const sessionId = new mongoose.Types.ObjectId();
    const newAccessTokenId = crypto.randomBytes(accessTokenIdLength).toString('hex');
    const newRefreshTokenId = crypto.randomBytes(refreshTokenIdLength).toString('hex');
    const MAX_SESSIONS = vendor.maxSessionAllowed || Number(process.env.END_USER_DEFAULT_MAX_SESSIONS) || 3;

    // Token configuration


    const  ACCESS_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.accessTokenSecret,
                                                    options: { secret: config.accessTokenSecretEncryptionKey } });    

    const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.refreshTokenSecret,
                                                    options: { secret: config.refreshTokenSecretEncryptionKey } });
    
    // if (!AT_ENCRYPT_KEY || !RT_ENCRYPT_KEY || !IP_ENCRYPT_KEY) return NextResponse.json( { error: "Server configuration error" }, { status: 500 } );
    
    const payload = { ...(fingerprint   && { fingerprint }),
                      ...(user.name     && {     name: user.name     }),
                      ...(user.email    && {    email: user.email    }),
                      ...(user.phone    && {    phone: user.phone    }),
                      ...(user.avatar   && {   avatar: user.avatar   }),
                      ...(user.role     && {     role: user.role     }),
                      ...(user.gender   && {   gender: user.gender   }),
                      ...(user.theme    && {    theme: user.theme    }),
                      ...(user.language && { language: user.language }),
                      ...(user.timezone && { timezone: user.timezone }),
                      ...(user.currency && { currency: user.currency }),
                       isVerified: user.isEmailVerified || user.isPhoneVerified,
                  isEmailVerified: user.isEmailVerified,
                  isPhoneVerified: user.isPhoneVerified,
                             cart: user.cart,
                      };

    const accessToken = jwt.sign( {        sub: sessionId.toString(),
                                    ...payload, 
                                       tokenId: newAccessTokenId },
                                    ACCESS_TOKEN_SECRET,
                                  { expiresIn: minutesToExpiresIn(accessTokenExpireMinutes) } );
    
    const refreshToken = jwt.sign( { 
                                 ...(fingerprint && { fingerprint }),
                                            sub: sessionId.toString(),
                                        tokenId: newRefreshTokenId },
                                    REFRESH_TOKEN_SECRET,
                                  { expiresIn: minutesToExpiresIn(refreshTokenExpireMinutes) }
                                );

    const    ipAddressCipherText = await encrypt({ data: ip,
                                                options: { secret: config.endUserIpAddressEncryptionKey }     });                                                 

    const hashedRefreshTokenId = crypto.createHmac('sha256', config.refreshTokenIdHashKey).update(newRefreshTokenId).digest('hex');



    await setSession({  vendorId: vendor.id,
                       sessionId: sessionId.toString(),
                         tokenId: newAccessTokenId,
                         payload: { userId: user._id, 
                                      role: user.role, 
                                     email: user.email,
                                     phone: user.phone  } 
                      }) 

    const  accessTokenExpiry = minutesToExpiryTimestamp(accessTokenExpireMinutes)
    const refreshTokenExpiry = minutesToExpiryTimestamp(refreshTokenExpireMinutes)

    const dbSession = await shop_db.startSession();
    try {
      await dbSession.withTransaction(async () => {
        const Session = sessionModel(shop_db);
        const LoginHistoryModel = loginHistoryModel(shop_db);
        const User = userModel(shop_db);

        

        // 1. Create session
        await Session.create([{ _id: sessionId,
                                userId: user._id,
                                provider: `local-${identifierName}`,
                                refreshTokenId: hashedRefreshTokenId,
                                refreshTokenExpiry,
                                ip: ipAddressCipherText,
                                userAgent,
                                ...(fingerprint && { fingerprint })
                              }], { session: dbSession });

        // 2. Update user sessions (push + prune in one update)
        const pushAndPruneOps = {
          $push: { activeSessions: sessionId },
          $set: {
            "security.failedAttempts": 0,
            lock: undefined,
          }
        };

        if ((!user.timezone || user.timezone.trim() === '') && timezone) {
          pushAndPruneOps.$set.timezone = timezone;
        }

        // Use updateOne to modify the user
        await User.updateOne({ _id: user._id }, pushAndPruneOps, { session: dbSession } );

        // If pruning needed → do extra cleanup
        if (user.activeSessions.length + 1 > MAX_SESSIONS) {
          const excessSessions = user.activeSessions.length + 1 - MAX_SESSIONS;
          const sessionsToRemove = user.activeSessions.slice(0, excessSessions);

          if (sessionsToRemove.length) {
            await Session.deleteMany({ _id: { $in: sessionsToRemove }}, { session: dbSession }  );
            await User.updateOne( { _id: user._id }, { $pull: { activeSessions: { $in: sessionsToRemove } } }, { session: dbSession } );
          }
        }

        // 3. Record login history
        await LoginHistoryModel.create([{    userId: user._id,
                                          sessionId,
                                           provider: `local-${identifierName}`,
                                                 ip: ipAddressCipherText,
                                          userAgent,
                   ...(fingerprint && { fingerprint })   }], { session: dbSession });
      });
    } finally { await dbSession.endSession(); }
    
    const response = NextResponse.json({      success: true,
                                          accessToken,
                                         refreshToken,
                                  accessTokenExpireAt: new Date(accessTokenExpiry).toISOString(),
                                 refreshTokenExpireAt: new Date(refreshTokenExpiry).toISOString(),
                                                 user: {                                                      
                                                      ...(user.name   && {   name: user.name    }),
                                                      ...(user.email  && {  email: user.email   }),
                                                      ...(user.avatar && { avatar: user.avatar  }),
                                                      ...(user.user   && {   user: user.user    }),
                                                      ...(user.gender && { gender: user.gender  }),
                                                      ...(user.phone  && {  phone: user.phone   }),
                                                                             role: user.role,
                                                                       isVerified: user.isEmailVerified || user.isPhoneVerified,
                                                                  isEmailVerified: user.isEmailVerified,
                                                                  isPhoneVerified: user.isPhoneVerified,
                                                                            local: { 
                                                                                  ...(user.theme    && {    theme: user.theme    }),
                                                                                  ...(user.language && { language: user.language }),
                                                                                  ...(user.timezone && { timezone: user.timezone }),
                                                                                  ...(user.currency && { currency: user.currency }),
                                                                                    },
                                                                            cart: user.cart
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

    Object.entries(securityHeaders).forEach(([key, value]) => { response.headers.set(key, value); });      
    return response;
  } catch (error) {
    console.log(error)
    console.error(`Login Error: ${error.message}`);
    return NextResponse.json( { error: "Authentication failed" }, { status: 500 } );
  }
}
