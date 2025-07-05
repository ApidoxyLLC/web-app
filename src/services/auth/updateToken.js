import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";
import crypto from 'crypto'

export async function updateToken({ sessionId, data }) {
    try {
        if (!sessionId || !data) 
                throw new Error('Missing required parameters');
        const { tokenId, accessTokenExpiry, refreshToken, refreshTokenExpiry } = data
        if (!tokenId || !accessTokenExpiry || !refreshToken || !refreshTokenExpiry) 
            throw new Error('Missing required token data');
        
        const      db = authDbConnect()
        const Session = sessionModel(db)
        const  result = await Session.updateOne(
                            { _id: sessionId },
                            {
                                $set: {           "tokenId": crypto.createHash('sha256').update(tokenId).digest('hex'),
                                        "accessTokenExpiry": accessTokenExpiry,
                                             "refreshToken": refreshToken,
                                       "refreshTokenExpiry": refreshTokenExpiry       }
                            }
                        );
        return result.modifiedCount > 0;                        
    } catch (error) {
        console.error('Failed to update token:', error);
        throw error; // Or handle differently based on your error handling strategy
    }
        
}

export default updateToken;