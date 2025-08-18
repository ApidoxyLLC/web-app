import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/encryption/cryptoEncryption'
import { vendorModel } from '@/models/vendor/Vendor'
import { sessionModel } from '@/models/shop/shop-user/Session'
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect'
import { dbConnect } from '@/lib/mongodb/db'
import crypto from 'crypto';
import minutesToExpiresIn from '@/app/utils/shop-user/minutesToExpiresIn'
import minutesToExpiryTimestamp from '@/app/utils/shop-user/minutesToExpiryTimestamp'
import { getInfrastructure } from '@/services/vendor/getInfrastructure'
import { validateSession } from '@/lib/redis/helpers/endUserSession'

export async function getVendorShop(request) {

    const   vendorId = request.headers.get('x-vendor-identifier');
    const       host = request.headers.get('host');

    if (!vendorId && !host)
      return { success: false, error: "Missing host" };
    const vendor_db = await vendorDbConnect();
    const    Vendor = vendorModel(vendor_db);

    if (!vendorId && !host) return { success: false, error: "Missing host" };
        // return { success: false, data: null , error: "No vendor shop found" };

    const vendor = await Vendor.findOne({ $or: [   vendorId ? {   referenceId: vendorId }        : null,
                                                       host ? { primaryDomain: host }            : null,
                                                       host ? {       domains: { $in: [host] } } : null,
                                            ].filter(Boolean), })
                                .select("dbInfo bucketInfo secrets expirations")
                                .lean()

    if (!vendor) return { success: false, data: null , error: "No vendor shop found" };
    return { success: true, data: vendor };   
}

export async function authenticationStatus(request) {
  const   fingerprint = request.headers.get('x-fingerprint') || null;

  const cookieStore = await cookies();

  const tokenFromCookie = cookieStore.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];

  const   accessToken = tokenFromCookie || tokenFromHeader || null;
  const isUsingBearerToken = (tokenFromHeader && !tokenFromCookie);

  const referenceId = request.headers.get('x-vendor-identifier');
  const        host = request.headers.get('host');

  if (!accessToken) return { success: false, error: "Invalid request: missing token or fingerprint" };

  try {
      const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
      if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // const vendorFetchResult = await getVendorShop(request);
    // if (!vendorFetchResult.success) return { success: false, error: "Missing host" };
    // const       vendor = vendorFetchResult.data;

    const accessSecret = await decrypt({ cipherText: vendor.secrets.accessTokenSecret, 
                                            options: { secret: process.env.END_USER_ACCESS_TOKEN_ENCRYPTION_KEY } });
    try {
      const decoded = jwt.verify(accessToken, accessSecret);
    let cachedSession;
      try { 
        cachedSession = await validateSession({ vendorId: vendor._id, sessionId: decoded.sub, tokenId: decoded.tokenId });
        return { success: true, isTokenRefreshed: false, data: { ...decoded, ...cachedSession}, vendor };
      } catch (err) { return { success: false, error: "Unauthorized", vendor };}

    } catch (err) {
      if (isUsingBearerToken) return { success: false, error: "Unauthorized", vendor };

        const  refreshToken = cookieStore.get('refresh_token')?.value || null;
      
      if (err.name === 'TokenExpiredError' && refreshToken) {
        const       accessExpire = Number(vendor.expirations?.accessTokenExpireMinutes  ||   15);
        const      refreshExpire = Number(vendor.expirations?.refreshTokenExpireMinutes || 1440);
        const      refreshSecret = await decrypt({ cipherText: vendor.secrets.refreshTokenSecret, 
                                                      options: { secret: process.env.END_USER_REFRESH_TOKEN_ENCRYPTION_KEY } });

        // const              dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri, 
        //                                               options: { secret: process.env.VENDOR_DB_URI_ENCRYPTION_KEY } });
        // const        dbName = vendor.dbInfo.dbName
        
        const            db = await dbConnect({ dbKey: dbName, dbUri });

        const        result = await handleRefreshToken({        db: db,
                                                             token: refreshToken,
                                                     access_secret: accessSecret,
                                                   accessExpireMin: accessExpire,
                                                    refresh_secret: refreshSecret,
                                                  refreshExpireMin: refreshExpire,
                                                       fingerprint                
                                                      });

        if(result.isTokenRefreshed ){
          const { accessToken, refreshToken, accessTokenExpireAt, refreshTokenExpireAt }  =  result.token 
          const now = Date.now();

          cookieStore.set({   name: 'access_token',
                             value: accessToken,
                              path: '/',
                          httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            maxAge:  Math.floor((new Date(accessTokenExpireAt).getTime() - now) / 1000),
                          sameSite: 'lax' });

          cookieStore.set({   name: 'refresh_token',
                             value: refreshToken,
                              path: '/',
                          httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            maxAge: Math.floor((new Date(refreshTokenExpireAt).getTime() - now) / 1000),
                          sameSite: 'lax' });
        }

        if (!result.success) return { success: false, error: "Authorization Failed", vendor };
          return { ...result, vendor };
      }

      return { success: false, error: "Unauthorized", vendor };
    }
  } catch (error) {
    console.error("authenticationStatus error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

export async function handleRefreshToken({ db, token, access_secret, refresh_secret, accessExpireMin, refreshExpireMin, fingerprint }) {
  try {
    const   decoded = jwt.verify(token, refresh_secret)
    if (decoded.fingerprint !== fingerprint)
        return { success: false, error: "Fingerprint mismatch" };
    if(!decoded.session) {
      console.warn('Session not found or expired for session ID:', decoded.session);
      return { success: false, error: "Unauthorized" };
    }

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
                                      { expiresIn: accessExpireMin * 60 } );
    
    const refreshToken = jwt.sign( { ...payload, 
                                        tokenId: refreshTokenId },
                                      refresh_secret,

                                      
                                      { expiresIn: refreshExpireMin * 60 } );

    if (!decoded.tokenId) return { success: false, error: "Invalid refresh token" };
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






// version 0 
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

// version 1
// export async function authenticationStatus(request) {
//   const  cookieStore = cookies();
//   const  accessToken = cookieStore.get('access_token')?.value;
//   const refreshToken = cookieStore.get('refresh_token')?.value;
//   const  fingerprint = request.headers.get('x-fingerprint') || null;


//   // Fallback to Authorization: Bearer <token>
//   const    authHeader = request.headers.get('authorization');
//   const isUsingBearer = !accessToken && authHeader?.startsWith('Bearer ');
//   // if (isUsingBearer) { accessToken = authHeader.split(' ')[1] }

//   if(isUsingBearer){
//     const token = authHeader.split(' ')[1];
//     if (!token)
//       return { success: false, error: "Invalid request..." };
      
//     try {
//       const shopFetchResult  = await getVendorShop(request)
//       if (!shopFetchResult.success)
//         return { success: false, error: "Missing host" };

//       const shop = shopFetchResult.data;
//       // return NextResponse.json({ success: false, error: "Unable to proceed..." }, { status: 500, headers: securityHeaders })

//       const ACCESS_TOKEN_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
//       if (!ACCESS_TOKEN_SECRET_KEY){
//         console.log('missing ACCESS_TOKEN_SECRET_KEY')
//         return { success: false, error: "Failed to load encryption secrets" };
//       }
//       const ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
//                                                      options: { secret: ACCESS_TOKEN_SECRET_KEY } });
//       const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
//       if (decoded.fingerprint !== fingerprint)
//         return { success: false, error: "Fingerprint mismatch" };
//       return { success: true, isTokenRefreshed: false, data: decoded, shop };                                                     
//     } catch (error) {
//       return { success: false, error: "Unauthorized" };
//     }
//   }

//   if (!accessToken || !fingerprint ||  !refreshToken)
//     return { success: false, error: "Invalid request..." };

//   try {
//     const shopFetchResult  = await getVendorShop(request)
//     if (!shopFetchResult.success)
//       return { success: false, error: "Missing host" };

//     const shop = shopFetchResult.data;
//       // return NextResponse.json({ success: false, error: "Unable to proceed..." }, { status: 500, headers: securityHeaders })

//     const ACCESS_TOKEN_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
//     if (!ACCESS_TOKEN_SECRET_KEY){
//       console.log('missing ACCESS_TOKEN_SECRET_KEY')
//       return { success: false, error: "Failed to load encryption secrets" };
//     }
//     const     ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
//                                                        options: { secret: ACCESS_TOKEN_SECRET_KEY } });    
    



//     try {
//       const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
//       if (decoded.fingerprint !== fingerprint)
//         return { success: false, error: "Fingerprint mismatch" };
//       return { success: true, isTokenRefreshed: false, data: decoded, shop };
//     } catch (accessTokenError) {
//       if (accessTokenError.name === 'TokenExpiredError' && refreshToken) {
//           const          ACCESS_TOKEN_EXPIRY = Number(shop.timeLimitations?.ACCESS_TOKEN_EXPIRE_MINUTES) || 15;
//           const         REFRESH_TOKEN_EXPIRY = Number(shop.timeLimitations?.REFRESH_TOKEN_EXPIRE_MINUTES) || 1440;
//           const REFRESH_TOKEN_ENCRYPTION_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY
//           if (!REFRESH_TOKEN_ENCRYPTION_KEY){
//             console.log('missing REFRESH_TOKEN_ENCRYPTION_KEY')
//             return { success: false, error: "Failed to load encryption secrets" };
//           }
//           const         REFRESH_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.REFRESH_TOKEN_SECRET,
//                                                                   options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY } })

//           const        DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
//           if (!DB_URI_ENCRYPTION_KEY) {
//             console.log('missing VENDOR_DB_URI_ENCRYPTION_KEY');
//             return { success: false, error: "Failed to load DB URI encryption key" };
//           }
//           const                        dbUri = await decrypt({ cipherText: shop.dbInfo.uri, 
//                                                                   options: { secret: DB_URI_ENCRYPTION_KEY }});
//           const                    vendor_db = await dbConnect({ dbKey: `${shop.dbInfo.prefix}${shop._id}`, dbUri })
//           const                refreshResult =  await handleRefreshToken({ db:vendor_db, token: refreshToken, access_secret: ACCESS_TOKEN_SECRET, accessExpireMin: ACCESS_TOKEN_EXPIRY, refresh_secret:REFRESH_TOKEN_SECRET, refreshExpireMin: REFRESH_TOKEN_EXPIRY,  fingerprint})
//           if(!refreshResult.success)
//             return { success: false, error: "Authorization Failed...", shop };          
//         return { ...refreshResult, shop };
//       }

//       const knownErrors = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'];
//       if (knownErrors.includes(accessTokenError.name)) {
//         return { success: false, error: "Unauthorized", shop };
//       }
//       return { success: false, error: "Unauthorized", shop };
//     }

//   } catch (error) {
//     console.error("authenticationStatus error:", error);
//     return { success: false, error: error.message || "unknown" };
//   }
// }