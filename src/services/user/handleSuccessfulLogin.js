

import crypto                from 'crypto';
import config                from "../../../config";
import authDbConnect         from "@/lib/mongodb/authDbConnect";
import mongoose              from "mongoose";
import { userModel }         from "@/models/auth/User";
import { sessionModel }      from "@/models/auth/Session";
import { loginHistoryModel } from "@/models/auth/LoginHistory";
import { encrypt }           from "@/lib/encryption/cryptoEncryption";
import { setSession }        from "@/lib/redis/helpers/session";
import generateToken         from "@/lib/generateToken";
import moment                from 'moment-timezone';
import bcrypt                from "bcryptjs";


// login type --> 'oauth' | 'password' | 'otp'
// provider --> 'google', 'facebook', 'local-email', 'local-phone', etc.
export async function handleSuccessfulLogin({ auth_db, session, user, loginType, provider, identifierName, ip, userAgent, timezone, fingerprint,  oauthProfile = null }) {
    const    sessionId = new mongoose.Types.ObjectId();
    console.log(`inside handleSuccessfulLogin() function session: ${sessionId}`)
    // const           db = await authDbConnect()
    const         User = userModel(auth_db);
    const      Session = sessionModel(auth_db);
    const LoginHistory = loginHistoryModel(auth_db);

    // 1. Token Generation (Common for all login types)
    const { accessToken,
            refreshToken,
            tokenId,
            accessTokenExpiry,
            refreshTokenExpiry } = await generateToken({ user, sessionId });

    // 2. Encrypt IP (Common)
    const ipAddressCipherText = await encrypt({    data: ip, 
                                                options: { secret: config.ipAddressEncryptionKey }  });

    // 3. Dynamic User Updates Based on Login Type
    const userUpdate = {
                            $set: { 
                                "security.failedAttempts": 0,
                                    "lock.lockUntil"     : null,
                                "security.lastLogin"     : new Date(),
                                ...(timezone && !user.timezone && moment.tz.zone(timezone) && { timezone }),
                                
                                // OAuth-specific updates
                                ...(loginType === 'oauth' && {
                                                                [`oauth.${provider}`]: {
                                                                    id: provider === 'google' ? oauthProfile.sub : oauthProfile.id,
                                                                    accessToken: oauthProfile.access_token,
                                                                    refreshToken: oauthProfile.refresh_token,
                                                                    tokenExpiresAt: oauthProfile.expires_at ? new Date(oauthProfile.expires_at * 1000) : null
                                                                }
                                                            }),

                                // OTP-specific updates
                                ...(loginType === 'otp' && { isPhoneVerified: true })
                                },
                            $push: { 
                                activeSessions: {
                                                    $each: [sessionId],
                                                    $slice: -config.maxSessionsAllowed
                                                }
                                },

                        };
    if (loginType === 'otp'){  
        userUpdate.$unset = {
                            'verification.otp': "",
                            'verification.otpExpiry': "",
                            'verification.otpAttempts': ""
                            } 
        }
    // 4. Session/History Payloads
    const sessionPayload = { _id: sessionId,
                          userId: user._id,
                   userReference: user.referenceId,
                        provider: loginType === 'password' 
                                    ? `local-${identifierName}` 
                                    : loginType === 'otp' 
                                        ? 'local-phone' 
                                        : provider,
                        
                        //  tokenId: await bcrypt.hash(tokenId, 10),
            //    accessTokenExpiry,
                    refreshToken: await bcrypt.hash(refreshToken, 10),
              refreshTokenExpiry,
                            role: user.role,
                              ip: ipAddressCipherText,
                       userAgent,
                        timezone,
                 ...(fingerprint && { fingerprint }), // Optional for password/OTP
            };

    const loginHistoryPayload = {    userId: user._id,
                                  sessionId,
                                   provider: sessionPayload.provider,                                    
                                         ip: ipAddressCipherText,
                                  userAgent,
                            ...(fingerprint && { fingerprint }) };

    // 5. Execute All DB Operations
        const redisSessionResult = await setSession({ sessionId, tokenId,
                             payload: { sub: user.referenceId, role: user.role, userId: user._id, } })
        const dbSessionResult = await Session.create([sessionPayload], { session });
        const updatedUser = await User.findOneAndUpdate( { _id: user._id }, userUpdate, { new: true, session }).select('activeSessions ');
        const historyResult = await LoginHistory.create([loginHistoryPayload], { session })

    const activeSessions = new Set([...updatedUser.activeSessions, sessionId].map(id => id.toString()))
    // 2. Delete orphaned sessions in bulk
    const deleteResult = await Session.deleteMany( { 
                                                        userId: user._id,
                                                        _id: { $nin: [...activeSessions] } // MongoDB compares ObjectIds natively
                                                    },
                                                    { session });
    console.log(deleteResult)  
    // throw new Error("something went wrong...")
    return { accessToken, accessTokenExpiry, refreshToken, sessionId };
}

export default handleSuccessfulLogin;