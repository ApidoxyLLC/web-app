import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/option";
import { getToken } from "next-auth/jwt";
import config from "../../../../../../config";
import jwt from "jsonwebtoken";
import { getSession } from "@/lib/redis/helpers/session";


const secret = config.nextAuthSecret;

export async function authenticateData(req, res) {
    const session = await getServerSession(req, res, authOptions);
    if(!session)  throw new Error("Unauthorized request....");

    const nextAuthtoken = await getToken({ req, secret });
    if (!nextAuthtoken?.accessToken) throw new Error("Access token missing");

    try {
        const accessTokenData = jwt.verify(nextAuthtoken.accessToken, config.accessTokenSecret); // ✅ Safe and verified
        const tokenId = accessTokenData.tokenId; 
        const redisSessionData = await getSession(tokenId)
        return redisSessionData || null;
        // if(!redisSessionData)
        //     return null; 
        // else return redisSessionData
    } catch (err) {
        console.error('Invalid token:', err);
        return null;
    }
}