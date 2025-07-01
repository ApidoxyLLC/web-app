import { sessionModel } from "@/models/auth/Session";
import { addLoginSession as addUserLoginSession } from "./user.service";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import config from "../../../config";


export async function getSessionTokenById({db, sessionId}) {
    const Session = sessionModel(db)  
    return await Session.findOne({ _id: String(sessionId) })
                                    .select('+accessToken '             +
                                            '+accessTokenExpiresAt '    +
                                            '+refreshToken '            +
                                            '+refreshTokenExpiresAt '   +
                                            '+revoked' ).lean();
}

export async function getSessionById({db, sessionId}) {
    const Session = sessionModel(db)  
    return await Session.findOne({ _id: String(sessionId) })
                                    .select('+_id '                     +
                                            '+userId'                   +
                                            '+provider '                + 
                                            '+accessToken '             +
                                            '+accessTokenExpiresAt '    +
                                            '+refreshToken '            +
                                            '+refreshTokenExpiresAt '   +
                                            '+fingerprint '             +
                                            '+ip '                      +
                                            '+role '                    +
                                            '+revoked' ).lean();
}

export async function createLoginSession({ id, user, provider, 
                                                  accessToken, 
                                         accessTokenExpiresAt,
                                                 refreshToken,
                                        refreshTokenExpiresAt,
                                                ip, userAgent,
                                                fingerprint,
                                                role,
                                            db, db_session }) {

    const Session = sessionModel(db)                              
    const newSession = new Session({
                                _id: id.toString(),
                                userId: user._id,
                                provider,
                                fingerprint,
                                accessToken,
                                accessTokenExpiresAt,
                                refreshToken,
                                refreshTokenExpiresAt,
                                role,
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
        const  accessTokenCipherText = await encrypt({        data: accessToken,
                                                           options: { secret: config.accessTokenEncryptionKey }      });
        const refreshTokenCipherText = await encrypt({        data: refreshToken,
                                                           options: { secret: config.refreshTokenEncryptionKey }     });
        
        const Session = sessionModel(db)  
        await Session.updateOne(
                            { _id: sessionId },
                            {
                                $set: {  "accessToken": accessTokenCipherText,
                                        "refreshToken": refreshTokenCipherText        }
                            }
                        );
}

export async function getSessionUser({db, session, data}) {
    const Session = sessionModel(db);
    const { sessionId } = data || {};

    const query = await Session.aggregate([
                                            {
                                                $match: { _id: sessionId }
                                            },
                                            {
                                                $lookup: {
                                                from: 'users',
                                                localField: 'userId',
                                                foreignField: '_id',
                                                as: 'user'
                                                }
                                            },
                                            {
                                                $unwind: '$user'
                                            },
                                            {
                                                $project: {
                                                    _id: 1,
                                                    provider: 1,
                                                    accessTokenExpiresAt: 1,
                                                    refreshTokenExpiresAt: 1,
                                                    ip: 1,
                                                    userAgent: 1,
                                                    lastUsedAt: 1,
                                                    createdAt: 1,
                                                    revoked: 1,
                                                    // include only selected user fields
                                                    user: {
                                                        _id: 1,
                                                        name: 1,
                                                        email: 1,
                                                        phone: 1,
                                                        avatar: 1,
                                                        plan: 1,
                                                        role: 1,
                                                        theme: 1,
                                                        language: 1
                                                    }
                                                }
                                            }
                                            ]);
    if (session) query.session(session);
    return await query;                                        
}
