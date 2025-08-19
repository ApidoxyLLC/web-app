import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import {  decrypt } from "@/lib/encryption/cryptoEncryption";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { cookies } from "next/headers";
import crypto from "crypto";
import minutesToExpiryTimestamp from "@/app/utils/shop-user/minutesToExpiryTimestamp";
import minutesToExpiresIn from "@/app/utils/shop-user/minutesToExpiresIn";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import config from "../../../../../../config";
import securityHeaders from "../../utils/securityHeaders";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import mongoose from "mongoose";

export async function POST(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
    const fingerprint = request.headers.get('x-fingerprint') || null;

    const referenceId = request.headers.get('x-vendor-identifier');
    const        host = request.headers.get('host');
    if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

    const { allowed, retryAfter } = await applyRateLimit({ key: `${host}${ip}`  });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

    

    let refreshToken = null;
    const authHeader = request.headers.get("authorization");
    const hasBearerToken = authHeader && authHeader.startsWith("Bearer ")
    if (hasBearerToken) refreshToken = authHeader.split(" ")[1]; 
    
    else { const cookieStore = await cookies(); 
                refreshToken = cookieStore.get("refresh_token")?.value; }
    if (!refreshToken) return NextResponse.json( { error: "Refresh token required" }, { status: 400, headers: securityHeaders });

    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    
    const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.refreshTokenSecret,
                                                    options: { secret: config.refreshTokenSecretEncryptionKey } });

    let payload;
    try { 
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      if (!payload.sub || !payload.tokenId)return NextResponse.json({ error: "Invalid token payload" }, { status: 401, headers: securityHeaders });
    } catch (err) {
        if (err.name === 'TokenExpiredError') return NextResponse.json({ error: "Refresh token expired" }, { status: 401, headers: securityHeaders })
            return NextResponse.json({ error: "Invalid refresh token" }, { status: 401, headers: securityHeaders });
    }





    const  ACCESS_TOKEN_SECRET = await decrypt({ cipherText: vendor.secrets.accessTokenSecret,
                                                    options: { secret: config.accessTokenSecretEncryptionKey } });



    console.log(payload)
    console.log(refreshToken)
    console.log(ACCESS_TOKEN_SECRET)

    const shop_db = await dbConnect({ dbKey: dbName, dbUri })
    const Session = sessionModel(shop_db);
    const hashedRefreshTokenId = crypto.createHmac('sha256', config.refreshTokenIdHashKey).update(payload.tokenId).digest('hex');
    // const hashedRefreshTokenId = crypto.createHmac('sha256', config.refreshTokenIdHashKey).update(payload.tokenId).digest('hex');
    const [result] = await Session.aggregate([
                                        // 1. Match the session
                                        {
                                          $match: {
                                            _id: new mongoose.Types.ObjectId(payload.sub),
                                            refreshTokenId: hashedRefreshTokenId,
                                            // revoked: { $ne: true }
                                          }
                                        },

                                        // 2. Lookup the user
                                        {
                                          $lookup: {
                                            from: "users",
                                            localField: "userId",
                                            foreignField: "_id",
                                            as: "user"
                                          }
                                        },
                                        { $unwind: "$user" },

                                        // 3. Lookup cart
                                        {
                                          $lookup: {
                                            from: "carts",
                                            localField: "user.cart",
                                            foreignField: "_id",
                                            as: "cartData"
                                          }
                                        },
                                        { $unwind: { path: "$cartData", preserveNullAndEmptyArrays: true } },

                                        // 4. Lookup products
                                        {
                                          $lookup: {
                                            from: "products",
                                            localField: "cartData.items.productId",
                                            foreignField: "_id",
                                            as: "products"
                                          }
                                        },

                                        // 5. Project desired structure
                                        {
                                          $project: {
                                            _id: 0,
                                            session: {
                                              _id: "$_id",
                                              fingerprint: "$fingerprint",
                                              userId: "$userId",
                                              provider: "$provider",
                                              refreshTokenId: "$refreshTokenId",
                                              refreshTokenExpiry: "$refreshTokenExpiry",
                                              ip: "$ip",
                                              userAgent: "$userAgent",
                                              timezone: "$timezone",
                                              createdAt: "$createdAt",
                                              revoked: "$revoked"
                                            },
                                            user: {
                                              _id: "$user._id",
                                              name: "$user.name",
                                              avatar: "$user.avatar",
                                              email: "$user.email",
                                              phone: "$user.phone",
                                              gender: "$user.gender",
                                              dob: "$user.dob",
                                              bio: "$user.bio",
                                              isEmailVerified: "$user.isEmailVerified",
                                              isPhoneVerified: "$user.isPhoneVerified",
                                              activeSessions: "$user.activeSessions",
                                              lock: "$user.lock",
                                              role: "$user.role",
                                              theme: "$user.theme",
                                              language: "$user.language",
                                              timezone: "$user.timezone",
                                              currency: "$user.currency"
                                            },
                                            cart: {
                                              $cond: {
                                                if: { $ifNull: ["$cartData", false] },
                                                then: {
                                                  $map: {
                                                    input: "$cartData.items",
                                                    as: "item",
                                                    in: {
                                                      $mergeObjects: [
                                                        "$$item",
                                                        {
                                                          product: {
                                                            $arrayElemAt: [
                                                              {
                                                                $filter: {
                                                                  input: "$products",
                                                                  as: "prod",
                                                                  cond: { $eq: ["$$prod._id", "$$item.productId"] }
                                                                }
                                                              },
                                                              0
                                                            ]
                                                          },
                                                          variants: {
                                                            $cond: {
                                                              if: "$$item.variantId",
                                                              then: {
                                                                $filter: {
                                                                  input: {
                                                                    $arrayElemAt: [
                                                                      {
                                                                        $filter: {
                                                                          input: "$products",
                                                                          as: "prod",
                                                                          cond: { $eq: ["$$prod._id", "$$item.productId"] }
                                                                        }
                                                                      },
                                                                      0
                                                                    ]
                                                                  }.variants,
                                                                  as: "variant",
                                                                  cond: { $eq: ["$$variant._id", "$$item.variantId"] }
                                                                }
                                                              },
                                                              else: []
                                                            }
                                                          }
                                                        }
                                                      ]
                                                    }
                                                  }
                                                },
                                                else: []
                                              }
                                            }
                                          }
                                        }
                                      ]);

    if (!result) return NextResponse.json({ error: "Session not found" }, { status: 401, headers: securityHeaders });
    // console.log(result)
    // return NextResponse.json({ message: "Sample rest return" }, { status: 401, headers: securityHeaders });                                        
    const { user, session, cart } = result;
    if (!user || (payload.email !== user.email && payload.phone !== user.phone))
        return NextResponse.json( { error: "User not found" },  { status: 404, headers: securityHeaders })

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

        const newAccessTokenId = crypto.randomBytes(accessTokenIdLength).toString('hex');
    const newRefreshTokenId = crypto.randomBytes(refreshTokenIdLength).toString('hex');

    const newPayload = {    session: session._id,
                        fingerprint,
                               name: user.name,
                              email: user.email,
                              phone: user.phone,
                               role: user.role,
                         isVerified: user.isEmailVerified || user.isPhoneVerified,
                             gender: user.gender,
                    isEmailVerified: user.isEmailVerified,
                    isPhoneVerified: user.isPhoneVerified,
                              theme: user.theme,
                           language: user.language,
                           timezone: user.timezone,
                           currency: user.currency,
                               cart,         };

    const  newAccessToken = jwt.sign( {...newPayload, tokenId: newAccessTokenId },
                                                         ACCESS_TOKEN_SECRET,
                                  { expiresIn: minutesToExpiresIn(accessTokenExpireMinutes) } );
    
    const newRefreshToken = jwt.sign( {...newPayload, tokenId: newRefreshTokenId },
                                                         REFRESH_TOKEN_SECRET,
                                   { expiresIn: minutesToExpiresIn(refreshTokenExpireMinutes) } );
    const accessTokenExpiry = minutesToExpiryTimestamp(accessTokenExpireMinutes)
    const refreshTokenExpiry = minutesToExpiryTimestamp(refreshTokenExpireMinutes)

     await Session.findByIdAndUpdate( session._id,
                                      {
                                        refreshTokenId: newRefreshTokenId,
                                        refreshTokenExpiry: refreshTokenExpiry,
                                        lastRefreshed: new Date()
                                      },
                                      { new: true }
                                    );




    // Prepare response
    const response = NextResponse.json( {              success: true,
                                                   accessToken: newAccessToken,
                                                  refreshToken: newRefreshToken,
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
                                                                                      cart
                                                                                    } 
                                        },
      { status: 200, headers: securityHeaders }
    );

    // Set HTTP-only cookies
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      domain: host,
      maxAge: Math.floor((accessTokenExpiry - Date.now()) / 1000),
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      domain: host,
      maxAge: Math.floor((refreshTokenExpiry - Date.now()) / 1000),
    });
    return response;

}


    // Get user data for updated claims
    // const user = await UserModel.findById(session.userId).select(
    //   "name avatar email phone role theme language timezone currency"
    // ).lean();