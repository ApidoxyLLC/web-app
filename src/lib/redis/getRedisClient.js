import Redis from "ioredis";
import urls from "./urls";

const clients = {};

function getRedisClient(purpose) {
    if (!purpose)         throw new Error("Redis client purpose is required.");
    if (clients[purpose]) return clients[purpose];

    const url = urls[purpose];
    if (!url) throw new Error(`Missing Redis URL for purpose: ${purpose}`);

    const client = new Redis(url, {        retryStrategy: (times) => Math.min(50 * Math.pow(2, times), 5000) + Math.floor(Math.random() * 200) ,
                                    maxRetriesPerRequest: 3,
                                          connectTimeout: 10000,
                                    enableAutoPipelining: true,
                                });
    // client.on('error', (err) => { logger.error(`Redis (${purpose}) error`, { error: err.message, 
    //                                                                           code: err.code,
    //                                                                          stack: err.stack       });
                                    
    //                                 if (['ECONNREFUSED', 'ENOTFOUND'].includes(err.code)) { delete clients[purpose];}
    //                             });

    client.on('error', (err) => { console.error(`Redis (${purpose}) error:`, err.message);
                                    // if (['ECONNREFUSED', 'ENOTFOUND'].includes(err.code)) { delete clients[purpose];}
                                  if (err.code === 'ENOTFOUND') console.error(`DNS lookup failed for: ${url}`);
                                });

    client.on('connect', () => { console.log(`Redis: connected to ${purpose}`); });

    client.on('ready', () => {console.log(`Redis: ${purpose} is ready`)} );

    client.on('close', () => { console.log(`Redis (${purpose}) connection closed`); });

    client.on('reconnecting', (time) => { console.log(`Redis (${purpose}) reconnecting in ${time}ms`) });

    clients[purpose] = client;
    return client;
}
export default getRedisClient;

async function clearRedisClients() {
  try {
    await Promise.all(
      Object.values(clients).map(client => 
        client.quit().catch(err => logger.error('Redis disconnect error', err))
      )
    );
  } finally {
    for (const key in clients) delete clients[key];
  }
}

// process.on('SIGINT', clearRedisClients);
// process.on('SIGTERM', clearRedisClients);
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, async () => {
    await clearRedisClients();
    process.exit(0);
  });
});
