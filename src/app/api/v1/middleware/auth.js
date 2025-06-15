import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import mongoose from 'mongoose'
import { decrypt } from '@/lib/encryption/cryptoEncryption'
import { shopModel } from '@/models/auth/Shop'
import { sessionModel } from '@/models/shop/shop-user/Session'
import centralDbConnect from '@/app/lib/mongodb/authDbConnect'
import { dbConnect } from '@/app/lib/mongodb/db'
import crypto from 'crypto';
import securityHeaders from '../utils/securityHeaders'
import minutesToExpiresIn from '@/app/utils/shop-user/minutesToExpiresIn'
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp'
// Wrokable version 


export async function getVendorShop(request) {
    const vendorId = request.headers.get('x-vendor-identifier');
    const     host = request.headers.get('host');
    if (!vendorId && !host)
      return { success: false, error: "Missing host" };
    const central_db = await centralDbConnect();
    const  ShopModel = shopModel(central_db);

    const shop = await ShopModel.findOne({ $or: [ { vendorId },
                                                  { "domains": { $elemMatch: { domain: host } } } ] })
                                .select("+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET "+
                                        "+dbInfo +dbInfo.provider +dbInfo.uri +dbInfo.prefix" + 
                                        "+timeLimitations +timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES +timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES").lean();
    if (!shop)
      return { success: false, data: null , error: "No vendor shop found" };
    return { success: true, data: shop };   
}

export async function authenticationStatus(request) {
  const  cookieStore = cookies();
  const  accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
  const  fingerprint = request.headers.get('x-fingerprint') || null;

  if (!accessToken || !refreshToken || !fingerprint)
    return { success: false, error: "Invalid request..." };

  try {
    const shopFetchResult  = await getVendorShop(request)
    if (!shopFetchResult.success)
      return { success: false, error: "Missing host" };

    const shop = shopFetchResult.data;
      // return NextResponse.json({ success: false, error: "Unable to proceed..." }, { status: 500, headers: securityHeaders })

    const ACCESS_TOKEN_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    if (!ACCESS_TOKEN_SECRET_KEY){
      console.log('missing ACCESS_TOKEN_SECRET_KEY')
      return { success: false, error: "Failed to load encryption secrets" };
    }
    const     ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
                                                       options: { secret: ACCESS_TOKEN_SECRET_KEY } });    
    
    try {
      const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
      if (decoded.fingerprint !== fingerprint)
        return { success: false, error: "Fingerprint mismatch" };
      return { success: true, isTokenRefreshed: true, data: decoded, shop };
    } catch (accessTokenError) {
      if (accessTokenError.name === 'TokenExpiredError' && refreshToken) {
          const          ACCESS_TOKEN_EXPIRY = Number(shop.timeLimitations?.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
          const         REFRESH_TOKEN_EXPIRY = Number(shop.timeLimitations?.REFRESH_TOKEN_EXPIRE_MINUTES) || 1440;
          const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY
          if (!REFRESH_TOKEN_ENCRYPTION_KEY){
            console.log('missing REFRESH_TOKEN_ENCRYPTION_KEY')
            return { success: false, error: "Failed to load encryption secrets" };
          }
          const         REFRESH_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.REFRESH_TOKEN_SECRET,
                                                                  options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY } })

          const        DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
          if (!DB_URI_ENCRYPTION_KEY) {
            console.log('missing VENDOR_DB_URI_ENCRYPTION_KEY');
            return { success: false, error: "Failed to load DB URI encryption key" };
          }
          const                        dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
                                                                  options: { secret: DB_URI_ENCRYPTION_KEY }});
          const                    vendor_db = await dbConnect({ dbKey: `${shop.dbInfo.prefix}${shop._id}`, dbUri })
          const                refreshResult =  await handleRefreshToken({ db:vendor_db, token: refreshToken, access_secret: ACCESS_TOKEN_SECRET, accessExpireMin: ACCESS_TOKEN_EXPIRY, refresh_secret:REFRESH_TOKEN_SECRET, refreshExpireMin: REFRESH_TOKEN_EXPIRY,  fingerprint})
          if(!refreshResult.success)
            return { success: false, error: "Authorization Failed...", shop };          
        return { ...refreshResult, shop };
      }

      const knownErrors = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'];
      if (knownErrors.includes(accessTokenError.name)) {
        return { success: false, error: "Unauthorized", shop };
      }
      return { success: false, error: "Unauthorized", shop };
    }

  } catch (error) {
    console.error("authenticationStatus error:", error);
    return { success: false, error: error.message || "unknown" };
  }
}

export async function handleRefreshToken({ db, token, access_secret, refresh_secret, accessExpireMin, refreshExpireMin, fingerprint }) {
  try {
    const   decoded = jwt.verify(token, refresh_secret)
    if (decoded.fingerprint !== fingerprint)
        return { success: false, error: "Fingerprint mismatch" };
    if(!decoded.session)
      return { success: false, error: "unknown" };

    const   SessionModel = sessionModel(db)
    
    const  accessTokenId = crypto.randomBytes(16).toString('hex');
    const refreshTokenId = crypto.randomBytes(16).toString('hex');

    const payload = { session: decoded.session,              
                      name: decoded.name,
                     email: decoded.email,
                     phone: decoded.phone,
                      role: decoded.role,
                isVerified: decoded.isVerified,
               fingerprint, };

    const accessToken = jwt.sign( { ...payload, 
                                      tokenId: accessTokenId },
                                      access_secret,
                                      { expiresIn: minutesToExpiresIn(accessExpireMin) } );
    
    const refreshToken = jwt.sign( { ...payload, 
                                        tokenId: refreshTokenId },
                                      refresh_secret,
                                      { expiresIn: minutesToExpiresIn(refreshExpireMin) } );

    const session = await SessionModel.findOneAndUpdate({            _id: decoded.session,
                                                          refreshTokenId: decoded.tokenId,
                                                             fingerprint,
                                                      refreshTokenExpiry: { $gt: Date.now()  }    },

                                                                  { $set: {  accessTokenId,
                                                                            refreshTokenId,
                                                                         accessTokenExpiry: minutesToExpiryTimestamp(accessExpireMin),
                                                                        refreshTokenExpiry: minutesToExpiryTimestamp(refreshExpireMin),
                                                                          } 
                                                                        },
                                                        { new: true }
                                                      );    
    if (!session ) return { success: false, error: "Unauthorized" };
    return {  success: true, 
              isTokenRefreshed: true,
              data: {     session: session._id,
                      fingerprint,
                             name: decoded.name,
                            email: decoded.email,
                            phone: decoded.phone,
                             role: decoded.role,
                       isVerified: decoded.isVerified,
                    },
              token: {          accessToken, 
                               refreshToken, 
                        accessTokenExpireAt: new Date(session.accessTokenExpiry).toISOString(),
                       refreshTokenExpireAt: new Date(session.refreshTokenExpiry).toISOString() 
                      }
              }

  } catch (error) {
    console.error('handleRefreshToken error:', error);
    return { success: false, error: error.message || "unknown error" };
  }
}




// export async function validateAuth(request) {
//   // 1. Get tokens from cookies
//   const cookieStore = cookies()
//   const accessToken = cookieStore.get('access_token')?.value
//   const refreshToken = cookieStore.get('refresh_token')?.value

//   if (!accessToken && !refreshToken) {
//     return { error: 'Unauthorized', status: 401 }
//   }

//   // 2. Get vendor/shop info from headers
//   const vendorId = request.headers.get('x-vendor-identifier')
//   const     host = request.headers.get('host')

//   if (!vendorId && !host) 
//     return { error: 'Missing vendor identifier', status: 400 }
  

//   try {
//     // 3. Connect to auth DB and get shop config (similar to login route)
//     const auth_db = await authDbConnect()
//     const ShopModel = shopModel(auth_db)
    
//     const shop = await ShopModel.findOne({ 
//       $or: [{ vendorId }, { "domains": { $elemMatch: { domain: host } } }]
//     }).select("+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET").lean()

//     if (!shop) {
//       return { error: 'Invalid vendor configuration', status: 400 }
//     }

//     // 4. Decrypt token secrets
//     const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY
//     const ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
//                                                    options: { secret: AT_SECRET_KEY }       })

//     // 5. Verify access token
//     try {
//       const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET)
//       return { user: decoded, shop }
//     } catch (accessTokenError) {
//       if (accessTokenError.name === 'TokenExpiredError' && refreshToken) {
//         return await handleRefreshToken(refreshToken, shop, response)
//       }
//       return { error: 'Invalid token', status: 401 }
//     }
//   } catch (error) {
//     console.error('Authorizaiton error:', error)
//     return { error: 'Authentication failed', status: 500 }
//   }
// }