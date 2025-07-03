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
  catch {return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}

  const userSession = await getAuthenticatedUser(request);
  if(!userSession) 
      return NextResponse.json({ error: "...not authorized" }, { status: 401 });    
  const parsed = createShopDTOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

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
                                            //  vendorId: ()=> cuid(),
                                              ownerId: userSession?.userId,
                                    ownerLoginSession: userSession?.sessionId,
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
    const userSession = await getAuthenticatedUser(request);
    if (!userSession) {
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

    const userId = userSession.userId
    const sessionId = userSession.sessionId;

    const result = await ShopModel.aggregate([ { $lookup: { 
                                                              from: "users",
                                                               let: { userId, sessionId },
                                                          pipeline: [ { 
                                                                        $match: {
                                                                                    $expr: { $or: [ 
                                                                                                    { $eq: ["$userId", "$$userId"] },
                                                                                                    { $in: ["$$sessionId", "$activeSessions"] }
                                                                                                  ] },
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

    const response = result[0] || {
      shops: [],
      total: 0,
      currentPage: page,
      totalPages: 0,
      nextPage: null,
      prevPage: null
    };

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





  // const VENDOR_DB_NAME_ENCRYPTION_KEY = process.env.VENDOR_DB_NAME_ENCRYPTION_KEY
  // const dbNameCipherText = await encrypt({ data: shopDbName,
  //                                       options: { secret: VENDOR_DB_NAME_ENCRYPTION_KEY }      });

  // const DB_PROVIDER = process.env.VENDOR_DB_PROVIDER
  // const DB_URI = process.env.VENDOR_DB_DEFAULT_URI



        // const host = request.headers.get('host');
    // const origin = request.headers.get('origin');

    // const secret = process.env.NEXTAUTH_SECRET;
    // const token = await getToken({ req:request, secret });
    // const user_auth_session = await getServerSession(authOptions)

    // if(user_auth_session){
    //     console.log(user_auth_session)
    //     console.log("has session")
    //     const { email, phone, role } = user_auth_session.user
    //     const auth_db = await authDbConnect()
    //     console.log(token)
    //     NextResponse.json({ success: true,  data:user_auth_session, message: "Session Found" }, { status: 200 });
    // }
    
  // 
  // 5. Create (dynamically) New Database with necessery collections for the shop 

  // 6. connect to that new database
  // 7. Store basic information into collection named "shop" into that new database 
  // 8. connect to applications main database
  // 9. Update Shop Information to the User's Collection
  // 10. send success message 





    // const session = await getServerSession(authOptions)

    // if(session){
    //     console.log(session)
    //     console.log("has session")
    // }
    




//   const body = await req.json();
//   const { name } = body;

//   if (!name) {
//     return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
//   }

//   const newItem = { id: Date.now(), name };
//   items.push(newItem);
//   return new Response(JSON.stringify("newItem"), { status: 201 });






























  // Temporary generate
  // this will grab from users sessionId stored into accessToken
  // Need to check the users loggedin session from sessions collection on auth_db
  // const sessionId = new mongoose.Types.ObjectId();
  // const ownerId = new mongoose.Types.ObjectId();
    // schema structure  
    // {
    //    shopId: sessionId
    //    dbClauster: 
    //    dbSecret:
    //    dbNamePrefix: 
    // }

    // const dbSchema = new mongoose.Schema({
    //     provider: { type: String, default: 'mongodb' },
    //     uri: { type: String, default: '' },
    //     cluster
    // }, { timestamps: false });
    
    // const keySchema = new mongoose.Schema({
    //            ACCESS_TOKEN_SECRET: { type: String, required: true },
    //           REFRESH_TOKEN_SECRET: { type: String, required: true }, 
    
    //    ACCESS_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_ACCESS_TOKEN_DEFAULT_EXPIRE_MINUTES || 15 ) }, 
    //   REFRESH_TOKEN_EXPIRE_MINUTES: { type: Number, required: true, default: Number(process.env.END_USER_REFRESH_TOKEN_DEFAULT_EXPIRE_MINUTES || 10080) }, 
     
    // }, { timestamps: false })

// export async function GET() {
//   return Response.json(items);
// }

// export async function PATCH(req) {
//   const body = await req.json();
//   const { id, name } = body;

//   const index = items.findIndex(item => item.id === Number(id));
//   if (index === -1) {
//     return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
//   }

//   if (name) items[index].name = name;
//   return Response.json(items[index]);
// }

// export async function DELETE(req) {
//   const body = await req.json();
//   const { id } = body;

//   const index = items.findIndex(item => item.id === Number(id));
//   if (index === -1) {
//     return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
//   }

//   const deleted = items.splice(index, 1);
//   return Response.json(deleted[0]);
// }


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