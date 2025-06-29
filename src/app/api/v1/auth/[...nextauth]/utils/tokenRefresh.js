import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { createAccessToken, createRefreshToken } from "@/services/auth/user.service";
import { updateSessionToken } from "@/services/auth/session.service";

export async function tokenRefresh({token, accessTokenSecret, refreshTokenKey, accessTokenExpire, refreshTokenExpire}) {
  if (!token) {
      console.error("No refresh token available.");
      return null;
    }
  try {
    if (token.provider === 'google' || token.provider === 'facebook' || token.provider === "local-email" || token.provider === "local-phone") {
        const data = jwt.decode(token.accessToken, accessTokenSecret)
        const { sessionId } = data
        if ( !sessionId ) return null 

        const        auth_db = await authDbConnect();
        const        Session = sessionModel(auth_db)  
        const expiredSession = await Session.findOneAndDelete({ _id: sessionId,
                                              refreshTokenExpiresAt: { $lt: new Date() } });
        if (expiredSession) return null;

        const session = await Session.findOne({ _id: sessionId })
                                     .select('+refreshToken +revoked' ).lean();
        if(!session || session.revoked)  return null

        const oldRefreshToken = await decrypt({  cipherText: session.refreshToken, 
                                                    options: { secret: refreshTokenKey } })
                                                  
        if( oldRefreshToken !== token.refreshToken ) return null

        const {    token: accessToken, 
                expireAt: accessTokenExpAt  } = createAccessToken({user: { ...data}, sessionId, secret: accessTokenSecret, expire: accessTokenExpire })

        const {    token: refreshToken,
                expireAt: refreshTokenExpAt  } = createRefreshToken({ expire: refreshTokenExpire })

        await updateSessionToken({db: auth_db, sessionId, accessToken, refreshToken})

        return {    accessToken, accessTokenExpAt,
                   refreshToken, refreshTokenExpAt  }
    } 

    throw new Error("Unsupported provider or missing refresh token");
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}

export default tokenRefresh;