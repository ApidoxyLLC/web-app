import { sessionModel } from "@/models/auth/Session";
import { addLoginSession as addUserLoginSession } from "./user.service";
import { encrypt } from "@/app/utils/encryption";


export async function getSessionTokenById({db, sessionId}) {
    const Session = sessionModel(db)  
    return await Session.findOne({ _id: String(sessionId) })
                                         .select(   '+accessToken ' +
                                                    '+accessTokenExpiresAt ' +
                                                    '+refreshToken ' +
                                                    '+refreshTokenExpiresAt ' +
                                                    '+revoked' ).lean();
}

export async function createLoginSession({ id, user, provider, 
                                                  accessToken, 
                                         accessTokenExpiresAt,
                                                 refreshToken,
                                        refreshTokenExpiresAt,
                                                ip, userAgent,
                                            db, db_session }) {

    const Session = sessionModel(db)                              
    const newSession = new Session({
                                _id: id.toString(),
                                userId: user._id,
                                provider,
                                accessToken,
                                accessTokenExpiresAt,
                                refreshToken,
                                refreshTokenExpiresAt,
                                ip,
                                userAgent
                            });

    const savedSession =  await newSession.save( db_session ? { session: db_session } : {});
    console.log(savedSession)
    await addUserLoginSession({       db, 
                                    session: db_session, 
                                       data: {      userId: user._id, 
                                                 sessionId: savedSession._id    },

                        user, loginSession: savedSession})
    return savedSession;
}

export async function cleanInvalidSessions({  activeSessions, userId, currentSessionId, sessionLimit, db, db_session}) {
    if (!userId || !currentSessionId || !Array.isArray(activeSessions)) return;
    if (sessionLimit < 1) return;
    const sessionIds = activeSessions.map(id => id.toString());
    const allSessionIds = [...new Set([...sessionIds, currentSessionId])];
    const keepIds = allSessionIds.slice(-sessionLimit);
    const Session = sessionModel(db)  
    await Session.deleteMany(
        {
        userId,
        _id: { $nin: keepIds },
        },
        { session: db_session }
    );
}

export async function updateSessionToken({db, sessionId, accessToken, refreshToken}) {
        const       ACCESS_TOKEN_ENCRYPTION_KEY = process.env.ACCESS_TOKEN_ENCRYPTION_KEY  || ''
        const      REFRESH_TOKEN_ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || ''

        const  accessTokenCipherText = await encrypt({        data: accessToken,
                                                           options: { secret: ACCESS_TOKEN_ENCRYPTION_KEY }      });
        const refreshTokenCipherText = await encrypt({        data: refreshToken,
                                                           options: { secret: REFRESH_TOKEN_ENCRYPTION_KEY }     });
        
        const Session = sessionModel(db)  
        await Session.updateOne(
                            { _id: sessionId },
                            {
                                $set: {  "accessToken": accessTokenCipherText,
                                        "refreshToken": refreshTokenCipherText        }
                            }
                        );
}