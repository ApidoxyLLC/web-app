import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import { userModel } from "@/models/auth/User";
import updateToken from "@/services/auth/updateToken";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../../../../../config";
import { setSession } from "@/lib/redis/helpers/session";
import crypto from 'crypto';
import generateTokenId from "./generateTokenId";
 

export async function refreshAccessToken({ token }) {
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
        const    user = await User.findOne({ referenceId: token.sub})
        if(!session || !user)  return null;

        if(Date.now() > session.refreshTokenExpiry || session.revoked == true ){
            await Session.deleteOne({  _id: sessionId  });
            return null;
        }
        const isRefreshTokenValid = await bcrypt.compare(token.refreshToken, session.refreshToken);
        if (!isRefreshTokenValid) return null;
        const                 now = Math.floor(Date.now() / 1000);
        const   accessTokenExpiry = Date.now() + (config.accessTokenExpireMinutes * 60 * 1000);
        const             tokenId = generateTokenId()
        const payload = {     sub: token.sub,
                        sessionId,
                          tokenId,
                        tokenType: "access",
                              iat: now, 
                ...(token.email && { email: token.email }),
                ...(token.phone && { phone: token.phone })};

        const accessToken = jwt.sign( payload, config.accessTokenSecret, 
                                                { expiresIn: config.accessTokenExpireMinutes * 60,
                                                  algorithm: 'HS256' });
        await setSession({ sessionId, tokenId,
                      payload: { sub: user.referenceId, role: user.role, userId: user._id } })
        // await Promise.all([ updateToken({        db: auth_db,
        //                                   sessionId,
        //                                        data: {           tokenId, 
        //                                                accessTokenExpiry }}),
        //                     setSession({ sessionId, tokenId,
        //                                  payload: { sub: user.referenceId, role: user.role } })
        //                     ])
        return { accessToken, accessTokenExpiry }
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return null
    }
}

export default refreshAccessToken;