import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { sessionModel } from "@/models/shop/shop-user/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { cookies } from "next/headers";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import config from "../../../../../../config";

export async function POST(request) {
  // Get vendor identification
  const vendorId = request.headers.get('x-vendor-identifier');
  const host = request.headers.get('host');

  if (!vendorId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  // Get tokens from cookies
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  console.log(accessToken)
  console.log(refreshToken)

  if (!accessToken || !refreshToken)
    return clearTokensAndRespond({ success: true, message: "Already logged out" }, 200);

  try {
    const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
    if (!vendor) return NextResponse.json({ error: "Invalid vendor or host" }, { status: 404 });

    // Decrypt token secrets
    const ACCESS_TOKEN_SECRET = await decrypt({
      cipherText: vendor.secrets.accessTokenSecret,
      options: { secret: config.accessTokenSecretEncryptionKey }
    });

    const REFRESH_TOKEN_SECRET = await decrypt({
      cipherText: vendor.secrets.refreshTokenSecret,
      options: { secret: config.refreshTokenSecretEncryptionKey }
    });
    const vendor_db = await dbConnect({ dbKey: dbName, dbUri });
    const Session = sessionModel(vendor_db);
    const User = userModel(vendor_db);

    try {
      const accessTokenPayload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, { ignoreExpiration: true });
      const refreshTokenPayload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, { ignoreExpiration: true });

      if ((accessTokenPayload.sub == refreshTokenPayload.sub) && accessTokenPayload.tokenId && refreshTokenPayload.tokenId) {
        const sessionId = accessTokenPayload.sub
        const accessTokenId = accessTokenPayload.tokenId
        const refreshTokenId = refreshTokenPayload.tokenId
        const dbSession = await vendor_db.startSession();

        try {
          await dbSession.withTransaction(async () => {
            const deletedSession = await Session.findOneAndDelete({
              $or: [{ _id: new mongoose.Types.ObjectId(sessionId) },
              { accessTokenId },
              { refreshTokenId }]
            })
              .session(dbSession);
            if (deletedSession && deletedSession.userId)
              await User.updateOne({ _id: deletedSession.userId }, { $pull: { activeSessions: { sessionId: deletedSession._id } } }, { session: dbSession });
          });
        } finally { await dbSession.endSession() }
        return clearTokensAndRespond({ success: true, message: "Successfully logged out" }, 200);
      }
      else { return clearTokensAndRespond({ error: "Logout failed" }, 500) }
    } catch (error) {
      return clearTokensAndRespond({ error: "Logout failed" }, 500);
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