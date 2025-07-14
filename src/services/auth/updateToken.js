import { sessionModel } from "@/models/auth/Session";
import bcrypt from "bcryptjs";

export async function updateToken({ db, sessionId, data }) {
    try {
        if (!db || !sessionId || !data) 
                throw new Error('Missing required parameters');
        const { refreshToken, refreshTokenExpiry } = data
        if (!refreshToken || !refreshTokenExpiry) 
            throw new Error('Missing required token data');

        // const [hashedTokenId, hashedRefreshToken] = await Promise.all([ bcrypt.hash(tokenId, 10),
        //                                                                  ]);
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)
        const Session = sessionModel(db)
        const  result = await Session.updateOne( { _id: sessionId },
                                                 { $set: {       "refreshToken": hashedRefreshToken,
                                                           "refreshTokenExpiry": refreshTokenExpiry  }  }
                                                );
        return result.modifiedCount > 0;                        
    } catch (error) {
        console.error('Failed to update token:', error);
        throw error; // Or handle differently based on your error handling strategy
    }
        
}

export default updateToken;

//  "tokenId": hashedTokenId,
//  "accessTokenExpiry": accessTokenExpiry,