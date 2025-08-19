import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { cookies } from "next/headers";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import config from "../../../../../../config";
import { validateSession } from "@/lib/redis/helpers/endUserSession";
import safeCompare from "@/lib/redis/utils/safeCompare";
import hashTokenId from "@/lib/redis/utils/hashTokenId";

export async function POST(request) {
  // Get vendor identification
  const referenceId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');
  // const   fingerprint = request.headers.get('x-fingerprint') || null;

  if (!referenceId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  // Get tokens from cookies
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];

  const   accessToken = tokenFromCookie || tokenFromHeader || null;
  const isUsingBearerToken = (tokenFromHeader && !tokenFromCookie);

  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!accessToken)
    return clearTokensAndRespond({ success: false, message: "Already logged out" }, 400);

  try {
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if(!vendor) return clearTokensAndRespond({ success: false, message: "Failed to logout...Something went wrong" }, 400);

    const accessSecret = await decrypt({ cipherText: vendor.secrets.accessTokenSecret, 
                                            options: { secret: config.accessTokenSecretEncryptionKey } });
    
    const db = await dbConnect({ dbKey: dbName, dbUri });

    let cachedSession;
    let accessTokenData
    try {
      accessTokenData = jwt.verify(accessToken, accessSecret);
      cachedSession = await validateSession({ vendorId: vendor.id, sessionId: accessTokenData.sub, tokenId: accessTokenData.tokenId })
      
      console.log(accessTokenData)
      console.log(cachedSession)

      if (!cachedSession || accessTokenData.tokenId.toString() !== cachedSession.tokenId.toString())
          return clearTokensAndRespond({ success: false, message: "Unauthorized" }, 400);
    } catch (error) {

      if (isUsingBearerToken) return clearTokensAndRespond({ success: false, message: "Unauthorized" }, 400);

      if (error.name === 'TokenExpiredError' && refreshToken) {
              const refreshSecret = await decrypt({ cipherText: vendor.secrets.refreshTokenSecret, 
                                                            options: { secret: config.refreshTokenSecretEncryptionKey } });
              let decodedRefreshToken
              try { decodedRefreshToken = jwt.verify(refreshToken, refreshSecret) } 
              catch (error) { return clearTokensAndRespond({ success: false, message: "Unauthorized" }, 400); }

              // if (!decodedRefreshToken) return clearTokensAndRespond({ success: false, message: "Unauthorized" }, 400);

              const { sub: sessionId, tokenId: refreshTokenId } = decodedRefreshToken
              

              return NextResponse.json({ success: "test response "}, { status: 200 });
              const Session = sessionModel(db)
              const    User = userModel(db);
              const session = await Session.findOne({                _id: sessionId,
                                                      refreshTokenExpiry: { $gt: Date.now()  }  })
              const hashedTokenId = hashTokenId(refreshTokenId)
              if (!session) return clearTokensAndRespond({ success: false, message: "failed" }, 400);
              if (!safeCompare(session.refreshTokenId, hashedTokenId)) return NextResponse.json({ error: "Unauthorized..." }, { status: 400 });

              const dbSession = await db.startSession();

              try {
                await dbSession.withTransaction(async () => {
                  const deletedSession = await Session.deleteOne({ _id: session._id }).session(dbSession);
                  if (deletedSession.deletedCount == 1 && session.userId)
                    await User.updateOne({ _id: session.userId }, { $pull: { activeSessions: { sessionId: session._id } } }, { session: dbSession });
                });
              } catch {
                return clearTokensAndRespond({ success: false, message: "failed" }, 400);
              }
              
              
              finally { await dbSession.endSession() }
              return clearTokensAndRespond({ success: true, message: "Successfully logged out" }, 200);
            }
      return clearTokensAndRespond({ success: false, message: "failed" }, 400);
    }
  } catch (error) {
    console.error(`Logout Error: ${error.message}`);
    return clearTokensAndRespond({ error: "Logout failed" }, 500);
  }
}

// Helper to clear cookies and set security headers
function clearTokensAndRespond(data, status) {
  const response = NextResponse.json(data, { status });

  // Clear cookies
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 0
  });

  response.cookies.set('refresh_token', '', {
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