import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { cookies } from "next/headers";

export async function POST(request) {
  // Get vendor identification
  const vendorId = request.headers.get('x-vendor-identifier');
  const     host = request.headers.get('host');

  if (!vendorId && !host) 
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 } );

  // Get tokens from cookies
  const  cookieStore = cookies();
  const  accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!accessToken || !refreshToken) 
    return clearTokensAndRespond({ success: true, message: "Already logged out" }, 200);

  try {
    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Get shop configuration
    const shop = await ShopModel.findOne({ $or: [ { vendorId }, { "domains": { $elemMatch: { domain: host } } }]})
                                .select( "+dbInfo.uri +dbInfo.prefix " +
                                        "+keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET" )
                                .lean();
    if (!shop) 
      return clearTokensAndRespond({ error: "Authentication failed" }, 400);
    
    // Decrypt token secrets
    const AT_SECRET_KEY = process.env.END_USER_ACCESS_TOKEN_SECRET_ENCRYPTION_KEY;
    const RT_SECRET_KEY = process.env.END_USER_REFRESH_TOKEN_SECRET_ENCRYPTION_KEY;
    if (!AT_SECRET_KEY || !RT_SECRET_KEY) 
      return NextResponse.json({ error: "Server configuration error" },{ status: 500 });
    
    const  ACCESS_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.ACCESS_TOKEN_SECRET,
                                                    options: { secret: AT_SECRET_KEY } });

    const REFRESH_TOKEN_SECRET = await decrypt({ cipherText: shop.keys.REFRESH_TOKEN_SECRET,
                                                    options: { secret: RT_SECRET_KEY } });
    // Decrypt DB URI
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) 
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                     options: { secret: DB_URI_ENCRYPTION_KEY } });

    // Connect to vendor DB
    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const SessionModel = sessionModel(vendor_db);
    const UserModel = userModel(vendor_db);

    try {        
        const  accessTokenPayload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, { ignoreExpiration: true });
        const refreshTokenPayload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, { ignoreExpiration: true });
        
        if((accessTokenPayload.session == refreshTokenPayload.session) && accessTokenPayload.tokenId && refreshTokenPayload.tokenId){
            const      sessionId = accessTokenPayload.session
            const  accessTokenId = accessTokenPayload.tokenId
            const refreshTokenId = refreshTokenPayload.tokenId
            const      dbSession = await vendor_db.startSession();

            try {
                await dbSession.withTransaction(async () => {
                    const deletedSession = await SessionModel.findOneAndDelete({ $or: [ { _id: new mongoose.Types.ObjectId(sessionId) },
                                                                                        { accessTokenId  },
                                                                                        { refreshTokenId } ] })
                                                            .session(dbSession);
                    if (deletedSession && deletedSession.userId) 
                        await UserModel.updateOne({ _id: deletedSession.userId }, { $pull: { activeSessions: { sessionId: deletedSession._id } } }, { session: dbSession });          
                });
            } finally { await dbSession.endSession() }
            return clearTokensAndRespond({ success: true, message: "Successfully logged out" }, 200 );
            }
        else { return clearTokensAndRespond( { error: "Logout failed" }, 500) }
    } catch (error) {
        return clearTokensAndRespond( { error: "Logout failed" }, 500);
    }
  } catch (error) {
    console.error(`Logout Error: ${error.message}`);
    return clearTokensAndRespond( { error: "Logout failed" }, 500);
  }
}

// Helper to clear cookies and set security headers
function clearTokensAndRespond(data, status) {
  const response = NextResponse.json(data, { status });
  
  // Clear cookies
  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 0
  });

  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 0
  });

  // Security headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  return response;
}