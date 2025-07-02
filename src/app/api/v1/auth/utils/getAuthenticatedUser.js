import { getToken } from "next-auth/jwt";
import config from "../../../../../../config";
import jwt from "jsonwebtoken";
import { getSession } from "@/lib/redis/helpers/session";

export async function getAuthenticatedUser(req) {
    const nextAuthtoken = await getToken({ req, secret: config.nextAuthSecret });
    if (!nextAuthtoken?.accessToken) 
        return null;
    try {
        const  accessTokenData = jwt.verify(nextAuthtoken.accessToken, config.accessTokenSecret);
        const          tokenId = accessTokenData.tokenId; 
        const redisSessionData = await getSession(tokenId)
        return redisSessionData || null;

    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}

export default getAuthenticatedUser;