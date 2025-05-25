
import LoginHistory from "@/models/auth/LoginHistory";

export async function createLoginHistory({  userId, 
                                         sessionId, 
                                          provider, 
                                                ip, 
                                         userAgent,
                                transactionSession }) {

    const newHistory = new LoginHistory({   userId,
                                            sessionId,
                                            provider,
                                            ip,
                                            userAgent       })
    return await newHistory.save({ session: transactionSession });  
}