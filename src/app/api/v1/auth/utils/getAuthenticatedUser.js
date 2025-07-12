import jwt from "jsonwebtoken";
import { getToken, encode } from "next-auth/jwt";
import { validateSession } from "@/lib/redis/helpers/session";
import tokenRefresh from "./tokenRefresh";
import config from "../../../../../../config";
import { cookies } from "next/headers";

export async function getAuthenticatedUser(req) {
    try {
        const currentToken = await getToken({ req, secret: config.nextAuthSecret});
        if (!currentToken || !currentToken.accessToken) 
            return { authenticated: false, error: "Authtication Error..."  };

        try {
            const decoded = jwt.verify(currentToken.accessToken, config.accessTokenSecret);
            if (!decoded?.tokenId) 
                return { authenticated: false, error: "Invalid token"  };
            
            let redisSession;
            try { redisSession = await validateSession({ sessionId: currentToken.sessionId, tokenId: decoded.tokenId });} 
            catch (err) { return { authenticated: false, error: " session check failed" };}
            
            if(!redisSession) 
                return { authenticated: false, error: "Invalid Memory Session"  };

            // sub role tokenId
            const data =  formatUserResponse({ ...currentToken, 
                                                sub: redisSession.sub, 
                                               user: { ...currentToken.user, role: redisSession.role } });

            return { authenticated: true, data };

        } catch (error) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError'){
                if (!currentToken.refreshToken)
                    return { authenticated: false, data: null, error: "Missing refresh token" }  
                
                const { accessToken,
                        refreshToken,
                        accessTokenExpiry }  = await tokenRefresh({ token: currentToken })
            
                const updatedToken = {   ...currentToken,
                                             accessToken,
                                       accessTokenExpiry,
                                            refreshToken    };

                const encodedToken = await encode({  token: updatedToken,
                                                    secret: config.nextAuthSecret });

                const cookieStore = await cookies();                                              
                      cookieStore.set({     name: 'next-auth.session-token',
                                           value: encodedToken,
                                            path: '/',
                                        httpOnly: true,
                                          secure: process.env.NODE_ENV === 'production',
                                          maxAge:  24 * 60 * 60,
                                        sameSite: 'lax' });

                const data = formatUserResponse(updatedToken);  
                return { authenticated: true, data }                                                                                        
            }
            return { authenticated: false, error: `Initial auth error: ${error.message || "Unknown"}` };
        }
    } catch (error) {
        return { authenticated: false, error: `Initial auth error: ${error.message || "Unknown"}` };
    }

}

// Extracted helper for consistent return
function formatUserResponse(token) {
    return {       sessionId: token.sessionId,
             userReferenceId: token.sub,
                        name: token.name,
                       email: token.email,
                       phone: token.user?.phone,
                        role: token.user?.role,
                  isVerified: token.user?.isVerified,
                    timezone: token.user?.timezone,
                       theme: token.user?.theme,
                    language: token.user?.language,
                    currency: token.user?.currency      };
    }

export default getAuthenticatedUser;