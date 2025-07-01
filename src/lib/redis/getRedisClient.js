import Redis from "ioredis";
import urls from "./urls";

const clients = {};

function getRedisClient(purpose) {
    if(!purpose)
        throw new Error(`Missing Redis URL for purpose: ${purpose}`);
    if (clients[purpose]) 
        return clients[purpose];

    const url = urls[purpose];
    if (!url) 
        throw new Error(`Missing Redis URL for purpose: ${purpose}`);

    const client = new Redis(url, {
        retryStrategy: times => Math.min(times * 100, 5000),
        maxRetriesPerRequest: 3,
    });

    client.on('error', (err) => {
        console.error(`Redis (${purpose}) error:`, err.message);
        if (err.code === 'ENOTFOUND')
            console.error(`DNS lookup failed for: ${url}`);
    });

    client.on('connect', () => {
        console.log(`Redis: connected to ${purpose}`);
    });

    clients[purpose] = client;
    return client;
}
export default getRedisClient;

export function clearRedisClients() {
    Object.values(clients).forEach(client => client.disconnect());
    for (const key in clients) delete clients[key];
}