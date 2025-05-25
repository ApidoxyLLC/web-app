
import Session from "@/models/auth/Session";
import { getUserSessionsIdById, updateUserLoginSession } from "./user.service";
import { encrypt } from "@/app/utils/encryption";


export async function getSessionTokenById(sessionId) {
    return await Session.findOne({ _id: String(sessionId) })
                                         .select(   '+accessToken ' +
                                                    '+accessTokenExpiresAt ' +
                                                    '+refreshToken ' +
                                                    '+refreshTokenExpiresAt ' +
                                                    '+revoked' ).lean();
}

export async function createLoginSession(params) {
    console.log(params)

    const {     id, 
                                              user, 
                                          provider, 
                                       accessToken, 
                                //   accessTokenNonce,  
                              accessTokenExpiresAt,
                                      refreshToken,
                                //  refreshTokenNonce,
                             refreshTokenExpiresAt,
                                                ip,
                                         userAgent,
                                transactionSession } = params
    const newSession = new Session({
                                _id: id.toString(),
                                userId: user._id,
                                provider,
                                accessToken,
                                // accessTokenNonce,
                                accessTokenExpiresAt,
                                refreshToken,
                                // refreshTokenNonce,
                                refreshTokenExpiresAt,
                                ip,
                                userAgent
                            });

    const savedSession =  await newSession.save({ session: transactionSession });
    console.log(savedSession)
    await updateUserLoginSession({user, loginSession: savedSession, transactionSession })
    return savedSession;
}

export async function cleanInvalidSessions({ activeSessions, userId, currentSessionId, sessionLimit, transactionSession}) {
    if (!userId || !currentSessionId || !Array.isArray(activeSessions)) return;
    if (sessionLimit < 1) return;
    const sessionIds = activeSessions.map(id => id.toString());
    const allSessionIds = [...new Set([...sessionIds, currentSessionId])];
    const keepIds = allSessionIds.slice(-sessionLimit);

    await Session.deleteMany(
        {
        userId,
        _id: { $nin: keepIds },
        },
        { session: transactionSession }
    );
}

export async function updateSessionToken({sessionId, accessToken, refreshToken}) {
        const       ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY  || ''
        const      REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''

        const  accessTokenCipherText = await encrypt({        data: accessToken,
                                                           options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }      });
        const refreshTokenCipherText = await encrypt({        data: refreshToken,
                                                           options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }     });

        await Session.updateOne(
                            { _id: sessionId },
                            {
                                $set: {  "accessToken": accessTokenCipherText,
                                        "refreshToken": refreshTokenCipherText        }
                            }
                        );
}