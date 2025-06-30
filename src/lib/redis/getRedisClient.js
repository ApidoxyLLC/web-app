import Redis from "ioredis";
// import urls from "./urls";

const clients = {};

const urls =  {
    rateLimit: process.env.REDIS_USER_RATE_LIMIT_URL,
      session: process.env.REDIS_USER_SESSION_URL,
         shop: process.env.REDIS_SHOP_URL,
}

function getRedisClient(purpose) {
    if(!purpose)
        throw new Error(`Missing Redis URL for purpose: ${purpose}`);
    if (clients[purpose]) return clients[purpose];
        const url = urls[purpose];
    if (!url) 
        throw new Error(`Missing Redis URL for purpose: ${purpose}`);
    clients[purpose] = new Redis(url);
    return clients[purpose];
}
export default getRedisClient;