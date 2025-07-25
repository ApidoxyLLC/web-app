import   mongoose   from 'mongoose';
import { LRUCache } from 'lru-cache';
import   AsyncLock  from 'async-lock';
import     dns      from 'dns/promises';
import   config     from './config';
import { setMaxListeners } from 'events';

process.setMaxListeners(50);
const lock = new AsyncLock();
const cache = new LRUCache({ max: config.maxDbConnections,
                             ttl: config.connectionTtl,
                  updateAgeOnGet: true,
                      allowStale: false,
                         dispose: async (connection, dbKey) => {
                                            try {
                                                if (connection?.readyState === 1) {
                                                    connection.removeAllListeners();
                                                    await connection.close();
                                                    console.log(`🧹 Connection closed for ${dbKey} due to inactivity`);
                                                }
                                            } catch (err) { console.log(`🧹 Eviction failed for ${dbKey}: ${err.message}`) }
                                        }
                        });

setInterval(async () => {
  const connectionKeys = [...cache.keys()];
  try {
    await Promise.all(connectionKeys.map(async key =>{
      const connection = cache.get(key);
      if (!connection) return;

      // Check if it's a connection object
      if (connection && typeof connection.readyState === 'number') {
        if (connection.readyState !== 1) {
          connection.close?.().catch(() => {});
          cache.delete(key);
          console.log(`♻️ Purged dead connection: ${key}`);
        } else {
          if(connection.db && typeof connection.db.admin === 'function'){
            try {
              await connection.db.admin().ping();
            } catch (pingErr) {
              console.log(`⚠️ Ping failed for ${key}, closing and purging connection.`);
              connection.close?.().catch(() => {});
              cache.delete(key);
            }
          }        
        }
      }  
      // Check if it's an error object
      else if (connection?.status === "error") {
        const errorAge = Date.now() - connection.timestamp;

        if (errorAge > config.errCacheTtl) {
            cache.delete(key); // ❌ Too old — just remove
            return
        }

        if (errorAge > config.errRetryInterval && connection.dbUri) {
          const hasInternet = await isInternetAvailable(); // see helper below
          if (hasInternet) {
            console.log(`🔁 Retrying failed connection for ${key}...`);
            try {
              await dbConnect({ dbKey: key, dbUri: connection.dbUri }); // You must define getUriForKey
              console.log(`✅ Retry successful for ${key}`);
            } catch (retryError) {
              console.log(`🚫 Retry failed for ${key}: ${retryError.message}`);
            }
          } else {
            console.log(`🌐 Skipping retry for ${key}, no internet.`);
          }
        }
      }
    }))
  } catch (err) {
    console.error('Health check interval error:', err);
  }
}, config.connectionHealthCheckInterval);

export async function dbConnect({dbKey, dbUri}) {
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);

  if (typeof dbKey !== 'string' || !/^mongodb(\+srv)?:\/\//.test(dbUri) || !/^[a-z0-9_-]{3,50}$/i.test(dbKey)) 
    throw new Error(`Invalid dbKey or dbUri for ${dbKey}`);

  const cachedConnection = cache.get(dbKey);
  if (cachedConnection?.readyState === 1){ 
    console.log(`[CACHE HIT] Returning existing connection for: ${dbKey}`);
    if (cachedConnection.meta) cachedConnection.meta.lastUsed = Date.now();
    return cachedConnection;
  }
  

  try {
    return await lock.acquire(dbKey, async ()=> {
      const lockedConnection = cache.get(dbKey);
      if (lockedConnection) {
        // Connection is already ready
        if (lockedConnection.readyState === 1) {
          console.log(`♻️ Reusing existing connection for ${dbKey}`);
          if (lockedConnection.meta) lockedConnection.meta.lastUsed = Date.now();
          return lockedConnection;
        }

        // Connection is in connecting state - wait with timeout
        if (lockedConnection.readyState === 2) { // 2 = connecting
          console.log(`⏳ Waiting for existing connection (${dbKey}) to become ready...`);
          
          const startTime = Date.now();
          try {
            await new Promise((resolve, reject) => {
              const checkReady = () => {
                if (lockedConnection.readyState === 1) {
                  resolve();
                } else if (lockedConnection.readyState === 0 || // 0 = disconnected
                         Date.now() - startTime > config.maxWait) {
                  reject(new Error('Connection not ready within timeout'));
                } else {
                  setTimeout(checkReady, config.waitInterval);
                }
              };
              checkReady();
            });
            
            console.log(`✅ Existing connection became ready for ${dbKey}`);
            return lockedConnection;
          } catch (waitError) {
            console.log(`⌛ Timeout waiting for connection (${dbKey}), creating new one...`);
            cache.delete(dbKey);
            try {
              await lockedConnection.close();
            } catch (closeError) {
              console.log(`⚠️ Error closing stale connection: ${closeError.message}`);
            }
          }
        }
      }

      try {
        if (isRecentErrorConnection(lockedConnection)) 
          throw new Error(`❌ Recent connection failure for ${dbKey}`);
          
        cache.set(dbKey, { readyState: 2 });
        const newConnection = await mongoose.createConnection(dbUri, {  dbName: dbKey,
                                                            maxPoolSize: (dbKey === 'auth_db') 
                                                                            ? config.maxAuthDbConnections 
                                                                            : config.maxTenantConnections,
                                                        socketTimeoutMS: 20000,
                                                serverSelectionTimeoutMS: 10000 }).asPromise();
        newConnection.removeAllListeners();
        newConnection.on('error', (err) => {
          console.error(`Connection error for ${dbKey}:`, err);
          cache.delete(dbKey);
          newConnection.close().catch(() => {});
        });
        newConnection.on('disconnected', () => {
          console.log(`Connection disconnected for ${dbKey}`);
          cache.delete(dbKey);
          // newConnection.close().catch(() => {});
        });
        
        newConnection.meta = {
                createdAt: Date.now(),
                dbKey: dbKey,
                lastUsed: Date.now()
              };
        cache.set(dbKey, newConnection, { ttl: config.connectionTtl});
        
        console.log(`✅ Connected: ${dbKey}`);
        return newConnection;

      } catch (error) {
          const isNetworkDown = !(await isInternetAvailable());

          if (isNetworkDown) console.log(`⚠️ Network issue detected while connecting to ${dbKey}. Will retry on next interval.`);
          else console.log(`❌ Connection Failed for ${dbKey}: ${error.message}`);

          cache.set(dbKey, { status: "error", timestamp: Date.now(), dbUri: dbUri  }, { ttl: config.errCacheTtl });
          console.log(`❌ Connection Failed: ${dbKey}`, error.message)
          throw error;
        }
    },  { timeout: config.connectionLockTimeout })
  } catch (err) {
    if (err.message.includes("timeout")) 
      throw new Error(`⌛ DB lock timeout for ${dbKey}`);
    throw err;
  }
}

function isRecentErrorConnection(conn) {
  return conn?.status === 'error' && Date.now() - conn.timestamp < config.errCacheTtl;
}


async function gracefulExit(reason, err) {
    console.log(`🛑 Received ${reason}, closing all DB connections...`);
    
    // Skip shutdown for known validation errors
    if (err?.name === 'ValidationError') {
      console.error(`⚠️ ValidationError (no shutdown):`, err.message);
      return;
    }

    if (err) console.error(`❌ Graceful shutdown error:`, err);
    await Promise.all(
      [...cache.entries()].map(async ([key, conn]) => {

        if (conn?.close) {
            try {
              conn.removeAllListeners?.();
              await conn.close();
            } catch (e) {
              console.warn(`⚠️ Shutdown failed for ${key}:`, e.message);
            }
          }
      })
    );

    process.exit(err ? 1 : 0);
}

if (!process.__gracefulExitListenersAdded) {
  ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => gracefulExit(sig)));

  // Fatal error handlers (add these after the above)
  process.on('uncaughtException', (err) => gracefulExit('uncaughtException', err));
  process.on('unhandledRejection', (err) => gracefulExit('unhandledRejection', err));

  process.once('SIGUSR2', async () => {
    await gracefulExit('SIGUSR2');
    process.kill(process.pid, 'SIGUSR2');
  });
process.__gracefulExitListenersAdded = true;
}
async function isInternetAvailable() {
  try   { await dns.lookup('cluster0.fh2lmnv.mongodb.net'); return true; }
  catch { return false; }
}

if (process.env.NODE_ENV === 'development') {
  // setInterval(() => {
  //   const stats = {
  //     total: cache.size,
  //     active: [...cache.values()].filter(c => c?.readyState === 1).length,
  //     connecting: [...cache.values()].filter(c => c?.readyState === 2).length,
  //     errors: [...cache.values()].filter(c => c?.status === 'error').length
  //   };
  //   console.debug('Connection pool stats:', stats);
  // }, 30000); // Every 30 seconds

  // Listener audit
  setInterval(() => {
    const connections = [...cache.values()];
    connections.forEach(conn => {
      if (conn?.eventNames?.()) {
        console.debug(`Active listeners for ${conn.meta?.dbKey}:`, conn.eventNames());
      }
    });
  }, 3600000); // Every hour

  // Exit listener check
  process.on('exit', () => {
    const listenerCounts = [...cache.values()]
      .filter(conn => conn?.eventNames)
      .map(conn => ({
        dbKey: conn.meta?.dbKey,
        listeners: conn.eventNames().length
      }));
    console.log('Remaining listeners on exit:', listenerCounts);
  });
}



// ['SIGINT', 'SIGTERM'].forEach(sig => {
//   process.on(sig, async () => {
//     console.log(`🛑 Received ${sig}, closing all DB connections...`)
//     await Promise.all(Array.from(cache.entries())
//                            .map(([key, conn]) => 
//                               conn?.readyState === 1 
//                                   ? conn.close().catch(err => console.log({ err, key }, "Shutdown close failed")) 
//                                   : Promise.resolve()
//                     ));
//     process.exit(0);
//   });
// });