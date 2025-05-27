import { loginHistoryModel } from "@/models/auth/LoginHistory";

export async function createLoginHistory({  userId, sessionId, provider, 
                                                ip, userAgent,
                                                db, db_session }) {
    const LoginHistory = loginHistoryModel(db)    
    const newHistory = new LoginHistory({   userId,
                                            sessionId,
                                            provider,
                                            ip,
                                            userAgent       })
    return await newHistory.save({ session: db_session });  
}