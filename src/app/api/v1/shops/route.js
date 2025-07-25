import { NextResponse } from "next/server";
import { createShopDTOSchema } from "./createShopDTOSchema";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb/db";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/auth/User";
import { vendorModel } from "@/models/vendor/Vendor";
import crypto from 'crypto';
import config from "../../../../../config";
import cuid from "@bugsnag/cuid";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { createB2Bucket } from "@/services/image/blackblaze";
import { addDNSRecord } from "@/services/cloudflare/addDNSRecord";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Rate Limit
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createShop' });
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated)
    return NextResponse.json({ error: "...not authorized" }, { status: 401 });

  const auth_db = await authDbConnect()
  const UserModel = userModel(auth_db);

  const user = await UserModel.findOne({
    referenceId: data.userReferenceId,
    isDeleted: false
  }).select('+_id +usage +phone +email');


  if (!user)
    return NextResponse.json({ error: "...not authorized" }, { status: 404 });

  // Check shop limit before allowing to create
  const currentShopUsage = user.usage?.shops;
  const allowedShopLimit = user.subscriptionScope?.shops;

  if (currentShopUsage >= allowedShopLimit)
    return NextResponse.json({ warning: `You have reached your shop limit (${allowedShopLimit}) for the current plan.`, success: false }, { status: 403 });

  const parsed = createShopDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid Data" }, { status: 422 });

  try {
    const nativeAuthDb = auth_db.db;
    const collections = await nativeAuthDb.listCollections({ name: 'shops' }).toArray();

    if (collections.length === 0)
      await auth_db.createCollection('shops'); // create outside transaction

    const _id = new mongoose.Types.ObjectId();
    const referenceId = cuid();
    const txId = cuid();
    const dbName = `${config.vendorDbPrefix}_${_id}_db`
    const bucketName = `${referenceId}`
    const primaryDomain = _id.toString() + '.' + process.env.DEFAULT_SHOP_DOMAIN;


    const existingShop = await vendorModel(auth_db).findOne({
      $or: [
        { primaryDomain: primaryDomain },
        { domains: primaryDomain }
      ]
    });

    if (existingShop) {
      return NextResponse.json({
        error: `Domain ${primaryDomain} already exists in the system.`,
      }, { status: 409 });
    }

   

    await addDNSRecord({
      domain: primaryDomain,
      zoneId: config.zoneId,
      template: "shop2" // this points to your Pages or proxy
    });


    const bucket = await createB2Bucket({ bucketName, createdBy: data.userId, shopId: referenceId });

    if (!bucket)
      return NextResponse.json({ message: "bucket creation failed", success: false }, { status: 400 })

    const shopPayload = {
      _id,
      referenceId,
      ownerId: data.userId,
      email: data.email ? data.email : undefined,
      phone: data.phone ? data.phone : undefined,
      ownerLoginSession: data.sessionId,
      country: parsed.data.country.trim(),
      industry: parsed.data.industry?.trim(),
      businessName: parsed.data.businessName?.trim(),
      location: parsed.data.location,
      transaction: { txId, sagaStatus: 'pending', lastTxUpdate: new Date() }
    }

    const vendorPayload = {
      _id,
      referenceId,
      ownerId: data.userId,
      email: data.email ? data.email : undefined,
      phone: data.phone ? data.phone : undefined,
      country: parsed.data.country.trim(),
      industry: parsed.data.industry?.trim(),
      businessName: parsed.data.businessName?.trim(),
      location: parsed.data.location,
      dbInfo: {
        dbName,
        dbUri: await encrypt({
          data: config.vendorDbDefaultUri + '/' + dbName,
          options: { secret: config.vendorDbUriEncryptionKey }
        })
      },
      bucketInfo: {
        accountId: bucket.accountId,
        bucketName: bucketName,
        bucketId: bucket.bucketId
      },
      secrets: {
        accessTokenSecret: await encrypt({
          data: crypto.randomBytes(32).toString('base64'),
          options: { secret: config.accessTokenSecretEncryptionKey }
        }),

        refreshTokenSecret: await encrypt({
          data: crypto.randomBytes(64).toString('hex'),
          options: { secret: config.refreshTokenSecretEncryptionKey }
        }),

        nextAuthSecret: await encrypt({
          data: crypto.randomBytes(32).toString('base64'),
          options: { secret: config.nextAuthSecretEncryptionKey }
        }),
      },
      primaryDomain,
      domains: [primaryDomain],
      transaction: { txId, sagaStatus: 'pending', lastTxUpdate: new Date() }
    }

    const userUpdateQuery = {
      $push: { shops: _id },
      $inc: { 'usage.shops': 1 }
    }

    const vendor_db = await vendorDbConnect()
    const authDb_session = await auth_db.startSession()
    const VendorModel = vendorModel(vendor_db)
    const ShopModel = shopModel(auth_db);
    await authDb_session.startTransaction()
    try {
      const [shop] = await ShopModel.create([{ ...shopPayload }], { session: authDb_session })
      if (!shop || !shop._id) throw new Error("Shop creation failed");
      await UserModel.updateOne({ _id: data.userId }, userUpdateQuery, { session: authDb_session })
      const vendor = await VendorModel.create({ ...vendorPayload })
      const updateSagaSuccess = {
        'transaction.sagaStatus': 'success',
        'transaction.lastTxUpdate': new Date()
      };

      await Promise.all([ShopModel.updateOne({ _id: shop._id }, { $set: updateSagaSuccess }, { session: authDb_session }),
      VendorModel.updateOne({ _id: vendor._id }, { $set: updateSagaSuccess })]);

      await authDb_session.commitTransaction()
      const result = {
        id: shop.referenceId,
        businessName: shop.businessName,
        country: shop.country,
        industry: shop.industry,
        location: shop.location,
        domains: vendor.domains
      }

      if (result)
        return NextResponse.json({ message: "Shop created successfully", success: true, data: result }, { status: 201 })
    } catch (error) {
      await authDb_session.abortTransaction()
      try {
        await VendorModel.updateOne({ 'transaction.txId': txId },
          {
            $set: {
              'transaction.sagaStatus': 'failed',
              'transaction.lastTxUpdate': new Date()
            }
          });
      } catch (e) { console.error('Failed to mark saga as failed', e) }

      try {
        await ShopModel.updateOne({ 'transaction.txId': txId },
          {
            $set: {
              'transaction.sagaStatus': 'failed',
              'transaction.lastTxUpdate': new Date()
            }
          });
      } catch (e) { console.error('Failed to mark saga as failed', e) }

      await Promise.allSettled([ShopModel.deleteOne({
        $and: [{ $or: [{ 'transaction.sagaStatus': 'pending' }, { 'transaction.sagaStatus': 'failed' }] },
        { 'transaction.txId': txId }]
      }),
      VendorModel.deleteOne({
        $and: [{ $or: [{ 'transaction.sagaStatus': 'pending' }, { 'transaction.sagaStatus': 'failed' }] },
        { 'transaction.txId': txId }]
      })]);
      return NextResponse.json({
        error: error.message || "Shop Not created",
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }, { status: 500 });
    } finally {
      await authDb_session.endSession();
    }
  } catch (error) {
    console.log(error)
    return NextResponse.json({
      error: error.message || "Shop Not created",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request) {
  // Rate Limit
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getShop' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });

  try {
    // Authenticate the user
    const { authenticated, error, data } = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    // if (page < 1 || limit < 1 || limit > 100) {
    //   return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    // }

    console.log("From GET request....")
    console.log(data)

    // Pagination params (optional, default to page 1, limit 10)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Connect to the auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const { sessionId, userId, userReferenceId, name, email, phone, role, isVerified, timezone, theme, language, currency } = data

    const result = await ShopModel.aggregate([{
      $lookup: {
        from: "users",
        let: { userReferenceId, sessionId, email },
        pipeline: [{
          $match: {
            $expr: {
              $or: [
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
    {
      $match: {
        $or: [
          { $expr: { $eq: ["$ownerId", { $arrayElemAt: ["$user._id", 0] }] } },
          {
            stuffs: {
              $elemMatch: {
                userId: { $eq: { $arrayElemAt: ["$user._id", 0] } },
                status: "active"
              }
            }
          }
        ]
      }
    },
    {
      $facet: {
        shops: [{ $skip: skip },
        { $limit: limit },
        {
          $project: {
            id: "$referenceId",
            email: 1,
            phone: 1,
            businessName: 1,
            domain: 1,
            country: 1,
            industry: 1,
            location: 1,
            slug: 1,
            activeApps: 1,
            web: 1,
            android: 1,
            ios: 1,
            stuffs: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$stuffs", []] } }, 0] },
                {
                  $map: {
                    input: "$stuffs",
                    as: "s",
                    in: "$$s.name"
                  }
                },
                []
              ]
            },
            _id: 0,
            // __v: 0,
            // user: 0,
            // ownerId: 0,
            // transaction: 0,
            // stuffs: 0,
          }
        }],
        total: [{ $count: "count" }]
      }
    },
    {
      $project: {
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
    console.log(error)
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
    conn = await dbConnect({ dbKey: dbName, dbUri: MONGODB_URI })
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