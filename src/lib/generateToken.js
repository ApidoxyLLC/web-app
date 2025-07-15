import crypto from 'crypto'; 
import jwt from 'jsonwebtoken'
import config from "../../config";
import generateTokenId from '@/app/api/v1/auth/utils/generateTokenId';

export async function generateToken({ user, sessionId }) {
    if (!user?.referenceId || !sessionId )
        throw new Error("MISSING_REQUIRED_PARAMS");

    if (!config.accessTokenSecret  || !config.accessTokenExpireMinutes || !config.refreshTokenExpireMinutes) 
        throw new Error('MISSING_TOKEN_CONFIGURATION');
    
    const            tokenId = generateTokenId()
    const       refreshToken = crypto.randomBytes(64).toString("hex")
    const  accessTokenExpiry = Date.now() + (config.accessTokenExpireMinutes * 60 * 1000);
    const refreshTokenExpiry = Date.now() + (config.refreshTokenExpireMinutes * 60 * 1000);
    const                now = Math.floor(Date.now() / 1000);

    const payload = {     sub: user.referenceId,
                    sessionId,
                      tokenId,
                    tokenType: "access",
                          iat: now, 
    ...(user.email && { email: user.email }),
    ...(user.phone && { phone: user.phone })};
                           
    const accessToken = jwt.sign(            payload, 
                            config.accessTokenSecret, 
                                        { expiresIn: config.accessTokenExpireMinutes * 60,
                                          algorithm: 'HS256' });

    return {           tokenId,
                   accessToken,
                  refreshToken,
             accessTokenExpiry,
            refreshTokenExpiry  };
}

export default generateToken;


// || !config.refreshTokenEncryptionKey