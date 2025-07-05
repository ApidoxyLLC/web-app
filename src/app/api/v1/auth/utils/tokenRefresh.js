import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import updateToken from "@/services/auth/updateToken";
import jwt from "jsonwebtoken";
import generateToken from "@/lib/generateToken";
import crypto from 'crypto'; 
import config from "../../../../../../config";

export async function tokenRefresh({ token }) {
if (!token?.accessToken || !token?.refreshToken) 
            return null;
        
  try { 
      const { sessionId } = jwt.decode(token.accessToken, config.accessTokenSecret)
      if (!sessionId) 
        return null
      const       auth_db = await authDbConnect();
      const       Session = sessionModel(auth_db)  
      const session = await Session.findOne({ _id: sessionId })
                                    .select('+refreshToken +revoked +refreshTokenExpiry' ).lean();
      if(!session )  return null;

      if(Date.now() > session.refreshTokenExpiry || session.revoked == true ){
          await Session.deleteOne({  _id: sessionId  });
          return null;
      }

      const oldRefreshToken = await decrypt({  cipherText: session.refreshToken, 
                                                  options: { secret: config.refreshTokenEncryptionKey } })

      const isMatch = crypto.timingSafeEqual( Buffer.from(oldRefreshToken),
                                              Buffer.from(token.refreshToken) );
      if (!isMatch) return null;

      const { accessToken,
              refreshToken,
              tokenId,
              accessTokenExpiry,
              refreshTokenExpiry,
              refreshTokenCipherText } = await generateToken({     user: {        email: token.email || '',
                                                                                  phone: token.phone || '',
                                                                            referenceId: token.sub }, 
                                                                sessionId });

      await updateToken({ sessionId, 
                                data: {          tokenId, 
                                      accessTokenExpiry, 
                                            refreshToken: refreshTokenCipherText, 
                                      refreshTokenExpiry  }})

      return { accessToken, accessTokenExpiry, refreshToken  }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}

export default tokenRefresh;