import crypto from 'crypto'; 
import jwt from 'jsonwebtoken'
import config from "../../config";
import { encrypt } from "@/lib/encryption/cryptoEncryption";

export async function generateToken({ user, sessionId }) {
    if (!user?.referenceId || !sessionId )
        throw new Error("MISSING_REQUIRED_PARAMS");

    if (!config.accessTokenSecret || !config.refreshTokenEncryptionKey || !config.accessTokenExpireMinutes || !config.refreshTokenExpireMinutes) 
        throw new Error('MISSING_TOKEN_CONFIGURATION');
    
    const            tokenId = crypto.randomBytes(32).toString("hex");
    const       refreshToken = crypto.randomBytes(64).toString("hex")
    const  accessTokenExpiry = Date.now() + (config.accessTokenExpireMinutes * 60 * 1000);
    const refreshTokenExpiry = Date.now() + (config.refreshTokenExpireMinutes * 60 * 1000);
    const                now = Math.floor(Date.now() / 1000);

    const payload = {     sub: user.referenceId,
                    sessionId,                            
                      tokenId,
                    tokenType: "access",
                          iat: now, 
                          exp: now + config.accessTokenExpireMinutes * 60,
    ...(user.email && { email: user.email }),
    ...(user.phone && { phone: user.phone })};
                           
    const accessToken = jwt.sign(            payload, 
                            config.accessTokenSecret, 
                                        { expiresIn: config.accessTokenExpireMinutes * 60,
                                          algorithm: 'HS256' });

    return {            accessToken,
                       refreshToken,
                            tokenId,
                  accessTokenExpiry,
                 refreshTokenExpiry,
             refreshTokenCipherText: await encrypt({    data: refreshToken,
                                                     options: { secret: config.refreshTokenEncryptionKey } })
        };
}

export default generateToken;
