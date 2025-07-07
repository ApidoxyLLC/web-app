import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import { userModel } from "@/models/auth/User";
import updateToken from "@/services/auth/updateToken";
import jwt from "jsonwebtoken";
import generateToken from "@/lib/generateToken";
import bcrypt from "bcryptjs";
import config from "../../../../../../config";
import { setSession } from "@/lib/redis/helpers/session";
 

export async function tokenRefresh({ token }) {
if (!token?.accessToken || !token?.refreshToken) 
            return null;
        
  try { 
      const { sessionId } = jwt.decode(token.accessToken, config.accessTokenSecret)
      if (!sessionId) 
        return null
      const auth_db = await authDbConnect();
      const Session = sessionModel(auth_db);
      const    User = userModel(auth_db);
      const session = await Session.findOne({ _id: sessionId })
                                    .select('+refreshToken +revoked +refreshTokenExpiry' ).lean();
      const user = await User.findOne({ referenceId: token.sub})

      

      if(!session || !user)  return null;

      if(Date.now() > session.refreshTokenExpiry || session.revoked == true ){
          await Session.deleteOne({  _id: sessionId  });
          return null;
      }

      // token.refreshToken --> from user request
      // session.refreshToken --> from database
      const isRefreshTokenValid = await bcrypt.compare(token.refreshToken, session.refreshToken);

      if (!isRefreshTokenValid) return null;

      const { accessToken,
              refreshToken,
              tokenId,
              accessTokenExpiry,
              refreshTokenExpiry } = await generateToken({     user: {        email: token.email || '',
                                                                                  phone: token.phone || '',
                                                                            referenceId: token.sub }, 
                                                                sessionId });
      await Promise.all([ updateToken({        db: auth_db,
                                        sessionId, 
                                             data: {          tokenId, 
                                                    accessTokenExpiry, 
                                                         refreshToken, 
                                                    refreshTokenExpiry  }}),
                          setSession({ sessionId, tokenId,
                                      payload: { sub: user.referenceId, role: user.role } })
                        ])                                                                

      return { accessToken, accessTokenExpiry, refreshToken  }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null
  }
}

export default tokenRefresh;