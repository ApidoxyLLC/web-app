import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb/db";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/auth/User";
import { vendorModel } from "@/models/vendor/Vendor";
import crypto from 'crypto';
import cuid from "@bugsnag/cuid";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { createB2Bucket } from "@/services/image/blackblaze";
import { addDNSRecord } from "@/services/cloudflare/addDNSRecord";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import config from "../../../../../../config";

// CREATE APP
// import id 
// const shopId
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

  const vendor_db = await vendorDbConnect();
  const Vendor = vendorModel(vendor_db);
  const vendor = Vendor.findOne({ referenceId: shopId })

  const payload = {
                    title,
                    image,
                    metaDescription,
                    metaTags: [],
                    
                  }


  // const auth_db = await authDbConnect()
  // const UserModel = userModel(auth_db);

  // const user = await UserModel.findOne({ referenceId: data.userReferenceId,
  //                                          isDeleted: false                  }).select('+_id +usage +phone +email');


  // if (!user)
  //   return NextResponse.json({ error: "...not authorized" }, { status: 404 });

  // Check shop limit before allowing to create
  // const currentShopUsage = user.usage?.shops;
  // const allowedShopLimit = user.subscriptionScope?.shops;

  // if (currentShopUsage >= allowedShopLimit)
  //   return NextResponse.json({ warning: `You have reached your shop limit (${allowedShopLimit}) for the current plan.`, success: false }, { status: 403 });

  // const parsed = createShopDTOSchema.safeParse(body);
  // if (!parsed.success)
  //   return NextResponse.json({ error: "Invalid Data" }, { status: 422 });

  // try {
  //   const nativeAuthDb = auth_db.db;
  //   const collections = await nativeAuthDb.listCollections({ name: 'shops' }).toArray();

  //   if (collections.length === 0)
  //     await auth_db.createCollection('shops'); // create outside transaction

  //   const _id = new mongoose.Types.ObjectId();
  //   const referenceId = cuid();
  //   const txId = cuid();
  //   const dbName = `${config.vendorDbPrefix}_${_id}_db`
  //   const bucketName = `${_id}`
  //   const primaryDomain = _id.toString() + '.' + process.env.DEFAULT_SHOP_DOMAIN;


  //   const existingShop = await vendorModel(auth_db).findOne({
  //     $or: [
  //       { primaryDomain: primaryDomain },
  //       { domains: primaryDomain }
  //     ]
  //   });

  //   if (existingShop) {
  //     return NextResponse.json({
  //       error: `Domain ${primaryDomain} already exists in the system.`,
  //     }, { status: 409 });
  //   }

   

  //   await addDNSRecord({
  //     domain: primaryDomain,
  //     zoneId: config.zoneId,
  //     template: "shop2" // this points to your Pages or proxy
  //   });


  //   const bucket = await createB2Bucket({ bucketName, createdBy: data.userId, shopId: referenceId });

  //   if (!bucket)
  //     return NextResponse.json({ message: "bucket creation failed", success: false }, { status: 400 })

  //   const shopPayload = {
  //     _id,
  //     referenceId,
  //     ownerId: data.userId,
  //     email: data.email ? data.email : undefined,
  //     phone: data.phone ? data.phone : undefined,
  //     ownerLoginSession: data.sessionId,
  //     country: parsed.data.country.trim(),
  //     industry: parsed.data.industry?.trim(),
  //     businessName: parsed.data.businessName?.trim(),
  //     location: parsed.data.location,
  //     transaction: { txId, sagaStatus: 'pending', lastTxUpdate: new Date() }
  //   }

  //   const vendorPayload = {
  //     _id,
  //     referenceId,
  //     ownerId: data.userId,
  //     email: data.email ? data.email : undefined,
  //     phone: data.phone ? data.phone : undefined,
  //     country: parsed.data.country.trim(),
  //     industry: parsed.data.industry?.trim(),
  //     businessName: parsed.data.businessName?.trim(),
  //     location: parsed.data.location,
  //     dbInfo: {
  //       dbName,
  //       dbUri: await encrypt({
  //         data: config.vendorDbDefaultUri + '/' + dbName,
  //         options: { secret: config.vendorDbUriEncryptionKey }
  //       })
  //     },
  //     bucketInfo: {
  //       accountId: bucket.accountId,
  //       bucketName: bucketName,
  //       bucketId: bucket.bucketId
  //     },
  //     secrets: {
  //       accessTokenSecret: await encrypt({
  //         data: crypto.randomBytes(32).toString('base64'),
  //         options: { secret: config.accessTokenSecretEncryptionKey }
  //       }),

  //       refreshTokenSecret: await encrypt({
  //         data: crypto.randomBytes(64).toString('hex'),
  //         options: { secret: config.refreshTokenSecretEncryptionKey }
  //       }),

  //       nextAuthSecret: await encrypt({
  //         data: crypto.randomBytes(32).toString('base64'),
  //         options: { secret: config.nextAuthSecretEncryptionKey }
  //       }),
  //     },
  //     primaryDomain,
  //     domains: [primaryDomain],
  //     transaction: { txId, sagaStatus: 'pending', lastTxUpdate: new Date() }
  //   }

  //   const userUpdateQuery = {
  //     $push: { shops: _id },
  //     $inc: { 'usage.shops': 1 }
  //   }

  //   const vendor_db = await vendorDbConnect()
  //   const authDb_session = await auth_db.startSession()
  //   const VendorModel = vendorModel(vendor_db)
  //   const ShopModel = shopModel(auth_db);
  //   await authDb_session.startTransaction()
  //   try {
  //     const [shop] = await ShopModel.create([{ ...shopPayload }], { session: authDb_session })
  //     if (!shop || !shop._id) throw new Error("Shop creation failed");
  //     await UserModel.updateOne({ _id: data.userId }, userUpdateQuery, { session: authDb_session })
  //     const vendor = await VendorModel.create({ ...vendorPayload })
  //     const updateSagaSuccess = {
  //       'transaction.sagaStatus': 'success',
  //       'transaction.lastTxUpdate': new Date()
  //     };

  //     await Promise.all([ShopModel.updateOne({ _id: shop._id }, { $set: updateSagaSuccess }, { session: authDb_session }),
  //     VendorModel.updateOne({ _id: vendor._id }, { $set: updateSagaSuccess })]);

  //     await authDb_session.commitTransaction()
  //     const result = {
  //       id: shop.referenceId,
  //       businessName: shop.businessName,
  //       country: shop.country,
  //       industry: shop.industry,
  //       location: shop.location,
  //       domains: vendor.domains
  //     }

  //     if (result)
  //       return NextResponse.json({ message: "Shop created successfully", success: true, data: result }, { status: 201 })
  //   } catch (error) {
  //     await authDb_session.abortTransaction()
  //     try {
  //       await VendorModel.updateOne({ 'transaction.txId': txId },
  //         {
  //           $set: {
  //             'transaction.sagaStatus': 'failed',
  //             'transaction.lastTxUpdate': new Date()
  //           }
  //         });
  //     } catch (e) { console.error('Failed to mark saga as failed', e) }

  //     try {
  //       await ShopModel.updateOne({ 'transaction.txId': txId },
  //         {
  //           $set: {
  //             'transaction.sagaStatus': 'failed',
  //             'transaction.lastTxUpdate': new Date()
  //           }
  //         });
  //     } catch (e) { console.error('Failed to mark saga as failed', e) }

  //     await Promise.allSettled([ShopModel.deleteOne({
  //       $and: [{ $or: [{ 'transaction.sagaStatus': 'pending' }, { 'transaction.sagaStatus': 'failed' }] },
  //       { 'transaction.txId': txId }]
  //     }),
  //     VendorModel.deleteOne({
  //       $and: [{ $or: [{ 'transaction.sagaStatus': 'pending' }, { 'transaction.sagaStatus': 'failed' }] },
  //       { 'transaction.txId': txId }]
  //     })]);
  //     return NextResponse.json({
  //       error: error.message || "Shop Not created",
  //       stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  //     }, { status: 500 });
  //   } finally {
  //     await authDb_session.endSession();
  //   }
  // } catch (error) {
  //   console.log(error)
  //   return NextResponse.json({
  //     error: error.message || "Shop Not created",
  //     stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  //   }, { status: 500 });
  // }
}
