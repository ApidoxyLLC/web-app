import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import { userModel } from "@/models/auth/User";
import updateToken from "@/services/auth/updateToken";
import jwt from "jsonwebtoken";
import generateToken from "@/lib/generateToken";
import bcrypt from "bcryptjs";
import config from "../../../../../../config";
import { setSession } from "@/lib/redis/helpers/session";
import generateTokenId from "./generateTokenId";
 
export async function tokenRefresh({ token }) {
  console.log("from inside tokenRefresh() function******************")
  // console.log(token)
if (!token?.accessToken || !token?.refreshToken) 
            return null;
        
  try { 
      const { sessionId } = jwt.verify(token.accessToken, config.accessTokenSecret, { ignoreExpiration: true });
      
      if (!sessionId) 
        return null
      const auth_db = await authDbConnect();
      const Session = sessionModel(auth_db);
      const session = await Session.findOne({ _id: sessionId })
                                    .select('+refreshToken +userReference +revoked +refreshTokenExpiry +createdAt' ).lean();
      if(!session)  return null;
      if(Date.now() > session.refreshTokenExpiry || session.revoked == true ){
          await Session.deleteOne({  _id: sessionId  });
          return null;
      }

      // token.refreshToken --> from user request
      // session.refreshToken --> from database
      const isRefreshTokenValid = await bcrypt.compare(token.refreshToken, session.refreshToken);

      if (!isRefreshTokenValid) return null;

      const totalLifetime = config.refreshTokenExpireMinutes * 60 * 1000;
      const remainingLifetime = session.refreshTokenExpiry - Date.now();
      const usedLifetime = totalLifetime - remainingLifetime;
      const refreshAccessToken = usedLifetime < totalLifetime * 0.75;
      if(refreshAccessToken){
          const tokenId = generateTokenId()
          const payload = {     sub: session.userReference,
                          sessionId,
                            tokenId,
                          tokenType: "access",
                                iat: Math.floor(Date.now() / 1000), 
                  ...(token.email && { email: token.email }),
                  ...(token.phone && { phone: token.phone })};
          const accessTokenExpiry = Date.now() + (config.accessTokenExpireMinutes * 60 * 1000);
          const accessToken = jwt.sign( payload, config.accessTokenSecret, 
                                              { expiresIn: config.accessTokenExpireMinutes * 60,
                                                algorithm: 'HS256' });
          await setSession({ sessionId: session._id, tokenId,
                             payload: { sub: session.userReference, role: session.role } })
          return { accessToken, accessTokenExpiry, refreshToken: token?.refreshToken, tokenId  }
      }

      const User = userModel(auth_db);
      const user = await User.findOne({ referenceId: token.sub})
                              .select('email phone referenceId role' )
      if(!user)  return null;
      const { accessToken,
              refreshToken,
              tokenId,
              accessTokenExpiry,
              refreshTokenExpiry } = await generateToken({     user: {        email: user.email || '',
                                                                              phone: user.phone || '',
                                                                        referenceId: user.referenceId }, 
                                                                sessionId });
      // await setSession({ sessionId, tokenId,
      //                      payload: { sub: user.referenceId, role: user.role } })
      await Promise.all([ updateToken({        db: auth_db,
                                        sessionId, 
                                             data: {      refreshToken, 
                                                    refreshTokenExpiry  }}),
                          setSession({ sessionId, tokenId,
                                      payload: { sub: user.referenceId, role: user.role } })
                        ])
      return { accessToken, accessTokenExpiry, refreshToken, tokenId  }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}

export default tokenRefresh;

// , config.accessTokenSecret