import { NextResponse } from "next/server";
import { createShopDTOSchema } from "./createShopDTOSchema";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb/db";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/auth/User";
import crypto from 'crypto'; 
import config from "../../../../../config";

export async function POST(request) {
  let body;
  try { body = await request.json();} 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const { authenticated, error, data } = await getAuthenticatedUser(request);

  // sessionId
  // userReferenceId
  // name
  // email
  // phone
  // role
  // isVerified
  // timezone
  // theme
  // language
  // currency

  // const userSession = await getAuthenticatedUser(request);
  if(!authenticated) 
      return NextResponse.json({ error: "...not authorized" }, { status: 401 });


  const response = await fetch(`${process.env.DOMAIN_SDK_URL}/domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}` // Optional
      },
      body: JSON.stringify({
        name: requestBody.name,
        email: requestBody.email
      }),
      cache: 'no-store', // Optional: disables caching
    });



  const parsed = createShopDTOSchema.safeParse(body);
  if (!parsed.success) 
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const auth_db = await authDbConnect()
  const UserModel =  userModel(auth_db);
  const user = await UserModel.findOne({ isDeleted: false,
                                          $or: [
                                            { userId: inputUserId },
                                            { activeSessions: inputSessionId }
                                          ]
                                        }).select('+_id +usage');

  const      country = parsed.data.country.trim();
  const     industry = parsed.data.industry?.trim();
  const businessName = parsed.data.businessName?.trim();
  const     location = parsed.data.location;
  // const _sample_ownerId = new mongoose.Types.ObjectId();

  const  accessTokenSecretCipherText = await encrypt({   data: crypto.randomBytes(32).toString('base64'),
                                                      options: { secret: config.accessTokenSecretEncryptionKey  } });

  const refreshTokenSecretCipherText = await encrypt({   data: crypto.randomBytes(64).toString('hex'),
                                                      options: { secret: config.refreshTokenSecretEncryptionKey } });

  const     nextauthSecretCipherText = await encrypt({   data: crypto.randomBytes(32).toString('base64'),
                                                      options: { secret: config.nextAuthSecretEncryptionKey     } });

  const     shopId = new mongoose.Types.ObjectId();
  const shopDbName = config.vendorDbPrefix + shopId

  const dbUriCipherText = await encrypt({ data: config.vendorDbDefaultUri+'/'+ shopDbName,
                                       options: { secret: config.vendorDbUriEncryptionKey } });

    try {

          const ShopModel = shopModel(auth_db);

          const shop = await ShopModel.create([{
                                                  _id: shopId,
                                              ownerId: user._id,
                                              country: country,
                                             industry: industry,
                                         businessName: businessName,
                                             location: location,

                                               dbInfo:  { provider: config.defaultVendorDbProvider,
                                                               uri: dbUriCipherText,
                                                            prefix: config.vendorDbPrefix },

                                                 keys:  {    ACCESS_TOKEN_SECRET: accessTokenSecretCipherText,
                                                            REFRESH_TOKEN_SECRET: refreshTokenSecretCipherText,
                                                                 NEXTAUTH_SECRET: nextauthSecretCipherText,
                                                      //  EMAIL_VERIFICATION_SECRET: emailVerificationCipherText
                                                        },
                                      timeLimitations:  { ACCESS_TOKEN_EXPIRE_MINUTES: config.accessTokenDefaultExpireMinutes,
                                                          REFRESH_TOKEN_EXPIRE_MINUTES: config.refreshTokenDefaultExpireMinutes,
                                                          EMAIL_VERIFICATION_EXPIRE_MINUTES: config.emailVerificationDefaultExpireMinutes,
                                                          PHONE_VERIFICATION_EXPIRE_MINUTES: config.phoneVerificationDefaultExpireMinutes
                                                        }
                                      }]);
                        await UserModel.updateOne(  { _id: user._id },
                                                    {
                                                      $push: { shops: shop._id },
                                                      $inc: { 'usage.shops': 1 }
                                                    }
                                                  );

        
      if(shop[0])
        return NextResponse.json({ message: "Shop created successfully", success: true, data: shop[0] }, { status: 201 })
    } catch (error) {
      return NextResponse.json({
              error: error.message || "Shop Not created",
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            }, { status: 500 });
    }
  return new NextResponse(JSON.stringify({response: "sample response "}), { status: 201 });
}

export async function GET(request) {
  try {
    // Authenticate the user
    const { authenticated, error, data } = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    // Pagination params (optional, default to page 1, limit 10)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    // Connect to the auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const { sessionId, userReferenceId, name, email, phone, role, isVerified, timezone, theme, language, currency } = data

    const result = await ShopModel.aggregate([ { $lookup: { 
                                                              from: "users",
                                                               let: { userReferenceId, sessionId, email },
                                                          pipeline: [ {
                                                                        $match: {
                                                                                    $expr: { $or: [ 
                                                                                                    { $eq: ["$referenceId", "$$userReferenceId"] },
                                                                                                    { $eq: ["$$email", "$email"] },
                                                                                                    { $in: ["$$sessionId", "$activeSessions"] },
                                                                                                  ] 
                                                                                                },
                                                                                isDeleted: false
                                                                              }
                                                                      },
                                                                      { $limit: 1 },
                                                                      { $project: { _id: 1 } }
                                                                    ],
                                                                as: "user"
                                                          }
                                                },
                                                { $match: {
                                                            $or: [ 
                                                                    {  $expr: { $eq: ["$ownerId", { $arrayElemAt: ["$user._id", 0] }] } },
                                                                    { stuffs: { $elemMatch: {
                                                                                              userId: { $eq: { $arrayElemAt: ["$user._id", 0] } }, 
                                                                                              status: "active"
                                                                                            } 
                                                                              } 
                                                                    } 
                                                                  ]
                                                          }
                                                },
                                                { $facet: {
                                                            shops: [ {    $skip: skip  },
                                                                     {   $limit: limit },
                                                                     { $project: { user: 0, __v: 0 } } ],
                                                            total: [{ $count: "count" }]
                                                          }
                                                },
                                                { $project: {
                                                                    shops: "$shops",
                                                                    total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                                                              currentPage: { $literal: page },
                                                               totalPages: {
                                                                            $ceil: {
                                                                                $divide: [
                                                                                            { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                                                                                            limit
                                                                                        ]
                                                                              }
                                                                           }
                                                            }
                                                },
                                                {
                                                  $addFields: {
                                                    nextPage: {
                                                      $cond: [{ $lt: [page, "$totalPages"] }, { $add: [page, 1] }, null]
                                                    },
                                                    prevPage: {
                                                      $cond: [{ $gt: [page, 1] }, { $subtract: [page, 1] }, null]
                                                    }
                                                  }
                                                }
                                              ]);

    const response = result[0] || {     shops: [],
                                        total: 0,
                                  currentPage: page,
                                   totalPages: 0,
                                     nextPage: null,
                                     prevPage: null   };

    return NextResponse.json({
      success: true,
      data: response.shops,
      total: response.total,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      nextPage: response.nextPage,
      prevPage: response.prevPage
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: error.message || "Failed to retrieve shop data",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}





async function createAppDatabase(dbName) {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined');
  let conn;
  try {
    conn = await dbConnect({dbKey: dbName, dbUri: MONGODB_URI})
    const shopCollections = [
                                  'shops',
                                  'shop_users',
                                  'shop_sessions',
                                  'shop_login_histories',
                                  'products',
                                  'categories',
                                  'carts',
                                  'rating_reviews',
                                  'delivery_partners'
                                ];

    // Create collections
    await Promise.all(
      shopCollections.map(collectionName =>
        conn.db.createCollection(collectionName)
      )
    );

    console.log(`Database '${dbName}' initialized with ${shopCollections.length} collections`);
    return { success: true, dbName };
  } catch (error) {
    console.error('Database creation failed:', error);
    throw new Error(`Database setup failed: ${error.message}`);
  } finally {
    if (conn) {
      await conn.close();
      console.log('Temporary connection closed');
    }
  }
}