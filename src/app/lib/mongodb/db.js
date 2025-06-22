import   mongoose   from 'mongoose';
import { LRUCache } from 'lru-cache';
import   AsyncLock  from 'async-lock';

const        MAX_CONNECTIONS = Number(process.env.DB_MAX_CONNECTION);
const         CONNECTION_TTL = Number(process.env.DB_CONNECTION_TTL_MINUTES   || 15) * 60 * 1000; // 15 min
const MAX_TENANT_CONNECTIONS = Number(process.env.DB_MAX_TENANT_CONNECTIONS)  || 20; 
const   MAX_AUTH_CONNECTIONS = Number(process.env.DB_MAX_AUTH_CONNECTIONS)    || 20;
const                   lock = new AsyncLock();

const cache = new LRUCache({ max: MAX_CONNECTIONS,
                             ttl: CONNECTION_TTL,
                  updateAgeOnGet: true,
                      allowStale: false,
                         dispose: async (dbKey, connection) => {
                                                try {
                                                  if (connection?.readyState === 1) {
                                                    await connection.close();
                                                    console.log(`🧹 Connection closed for ${dbKey} due to inactivity`);
                                                  }
                                                } 
                                                catch (err) { console.log(`🧹 Eviction failed for ${dbKey}: ${err.message}`) }
                                              }
                  });

setInterval(() => {
  const connectionKeys = [...cache.keys()];
  connectionKeys.forEach(key => {
    const connection = cache.get(key);
    if (!connection) return;

    // Check if it's a connection object
    if (connection && typeof connection.readyState === 'number') {
      if (connection.readyState !== 1) {
        connection.close?.().catch(() => {});
        cache.delete(key);
        console.log(`♻️ Purged dead connection: ${key}`);
      }
    } 
    // Check if it's an error object
    else if (connection?.status === "error" && Date.now() - connection.timestamp > 10_000) {
      cache.delete(key);
      return;
    }
  });
}, 30_000);

export async function dbConnect({dbKey, dbUri}) {
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);

  if (typeof dbKey !== 'string' || !/^mongodb(\+srv)?:\/\//.test(dbUri) || !/^[a-z0-9_-]{3,50}$/i.test(dbKey)) 
    throw new Error(`Invalid dbKey or dbUri for ${dbKey}`);
  

  const cachedConnection = cache.get(dbKey);
  if (cachedConnection?.readyState ===    1   ) return cachedConnection;
  if (cachedConnection?.status     === "error"){
    const isExpired = Date.now() - cachedConnection.timestamp > 10_000;
    if (!isExpired) throw new Error(`❌ Recent connection failure for ${dbKey}`);
    else cache.delete(dbKey);
  }

  try {
    return await lock.acquire(dbKey, async ()=> {
      const lockedConnection = cache.get(dbKey);
      if (lockedConnection?.readyState ===    1    ) return lockedConnection; // Valid connection
      if (lockedConnection?.status     === "error" ) throw new Error("❌ Recent connection failure");

      try {
        const newConnection = await mongoose.createConnection(dbUri, {  dbName: dbKey,
                                                                   maxPoolSize: (dbKey === 'auth_db') 
                                                                                  ? MAX_AUTH_CONNECTIONS 
                                                                                  : MAX_TENANT_CONNECTIONS,
                                                               socketTimeoutMS: 5000,
                                                      serverSelectionTimeoutMS: 3000    }).asPromise();

        newConnection.createdAt = Date.now(); 
        cache.set(dbKey, newConnection);
        console.log(`✅ Connected: ${dbKey}`);
        return newConnection;

      } catch (error) {
        cache.set(dbKey, { status: "error", timestamp: Date.now() }, { ttl: 10_000 });
        console.log(`❌ Connection Failed: ${dbKey}`, error.message)
        throw error;
      }
  },  { timeout: 5000 })
  } catch (err) {
    if (err.message.includes("timeout")) 
      throw new Error(`⌛ DB lock timeout for ${dbKey}`);
    throw err;
  }
} 

['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, async () => {
    console.log(`🛑 Received ${sig}, closing all DB connections...`)
    await Promise.all(Array.from(cache.entries())
                           .map(([key, conn]) => 
                              conn?.readyState === 1 
                                  ? conn.close().catch(err => console.log({ err, key }, "Shutdown close failed")) 
                                  : Promise.resolve()
                    ));
    process.exit(0);
  });
});
