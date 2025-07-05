

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


// login type --> 'oauth' | 'password' | 'otp'
// provider --> 'google', 'facebook', 'local-email', 'local-phone', etc.
export async function handleSuccessfulLogin({ user, loginType, provider, identifierName, ip, userAgent, timezone, fingerprint, account,
    session,
    oauthProfile = null // Only for OAuth (contains profile/account data)
}) {
    const           db = authDbConnect()
    const    sessionId = new mongoose.Types.ObjectId();
    const         User = userModel(db);
    const      Session = sessionModel(db);
    const LoginHistory = loginHistoryModel(db);

    // 1. Token Generation (Common for all login types)
    const { accessToken,
            refreshToken,
            tokenId,
            accessTokenExpiry,
            refreshTokenExpiry,
            refreshTokenCipherText } = await generateToken({ user, sessionId });

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
                        provider: loginType === 'password' 
                                    ? `local-${identifierName}` 
                                    : loginType === 'otp' 
                                        ? 'local-phone' 
                                        : provider,
                        
                         tokenId: crypto.createHash('sha256').update(tokenId).digest('hex'),
               accessTokenExpiry,
                    refreshToken: refreshTokenCipherText,
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
    const promiseArray = [ 
                            setSession({    sessionId, tokenId,
                                            payload: { sub: user.referenceId, role: user.role } }),
                            Session.create([sessionPayload], { session }),
                               User.updateOne({ _id: user._id }, userUpdate, { session }),
                       LoginHistory.create([loginHistoryPayload], { session })
                        ];
    

    // 6. Session Cleanup (Temporary)
    const updatedUser = await User.findOne({ _id: user._id }, { activeSessions: 1 });
    await Session.deleteMany({  userId: user._id,
                                   _id: { $nin: updatedUser.activeSessions }
                             }, { session: session });
    return { accessToken, accessTokenExpiry, refreshToken, sessionId, user: updatedUser };
}

export default handleSuccessfulLogin;