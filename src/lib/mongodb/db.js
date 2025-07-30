import   mongoose   from 'mongoose';
import { LRUCache } from 'lru-cache';
import   AsyncLock  from 'async-lock';
import     dns      from 'dns/promises';
import   config     from './config';
import     retry    from 'async-retry';
import { setMaxListeners } from 'events';


async function cleanupConnection(connection) {
  if (!connection) return;
  
  try {
    // Remove all event listeners
    if (typeof connection.removeAllListeners === 'function') {
      connection.removeAllListeners();
    }
    
    // Close connection if it's open or connecting
    if (typeof connection.readyState !== 'undefined' && 
        (connection.readyState === 1 || connection.readyState === 2)) {
      await connection.close();
    }
  } catch (closeError) {
    console.warn('Cleanup close error:', closeError.message);
  } finally {
    // Ensure we remove any remaining references
    // if (connection && typeof connection.destroy === 'function') {
    //   connection.destroy();
    // }
  }
}

function estimateConnSize(connection) {
  if (!connection || typeof connection !== 'object') return 0;

  try {
    let size = 1024; // base

    const models = Object.values(connection.models || {});
    size += models.length * 2048;

    for (const model of models) {
      if (model?.schema?.paths) {
        size += Object.keys(model.schema.paths).length * 128;
      }
    }

    const collections = Object.keys(connection.collections || {});
    size += collections.length * 1536;

    if (connection.host) size += connection.host.length * 10;
    if (connection.name) size += connection.name.length * 10;

    return size;
  } catch (err) {
    console.warn('Failed to estimate connection size:', err.message);
    return 1024;
  }
}

process.setMaxListeners(50);
const lock = new AsyncLock();
const cache = new LRUCache({ maxSize: 50 * 1024 * 1024, 
                     sizeCalculation: (conn) => estimateConnSize(conn),
                             max: config.maxDbConnections,
                             ttl: config.connectionTtl,
                  updateAgeOnGet: true,
                      allowStale: false,
                         dispose: async (connection, dbKey) => {
                                            try {
                                              await lock.acquire(dbKey, async () => {
                                                const current = cache.get(dbKey);
                                                // If cache was re-added before lock, don't clean up
                                                if (current !== connection) {
                                                  console.log(`⚠️ Skipping cleanup for ${dbKey} — already replaced`);
                                                  return;
                                                }

                                                await cleanupConnection(connection);
                                                console.log('🧹 Connection closed for', dbKey, 'due to inactivity');
                                              }, {
                                                timeout: config.connectionLockTimeout,
                                                maxOccupationTime: config.connectionLockTimeout * 2,
                                                onCompromised: (err) => {
                                                  console.warn(`⚠️ Lock compromised for ${dbKey}:`, err.message);
                                                }
                                              } );
                                            } catch (err) {
                                              console.log('🧹 Eviction failed for', dbKey, ':', err.message);
                                            }

                                            // try {
                                            //     if (connection?.readyState === 1) {
                                            //         connection.removeAllListeners();
                                            //         await connection.close();
                                            //         console.log(`🧹 Connection closed for ${dbKey} due to inactivity`);
                                            //     }
                                            // } catch (err) { console.log(`🧹 Eviction failed for ${dbKey}: ${err.message}`) }
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
          // connection.close?.().catch(() => {});
          await cleanupConnection(connection);
          cache.delete(key);
          console.log(`♻️ Purged dead connection: ${key}`);
        } else {
          if(connection.db && typeof connection.db.admin === 'function'){
            try {
              await connection.db.admin().ping();
            } catch (pingErr) {
              console.log(`⚠️ Ping failed for ${key}, closing and purging connection.`);
              // connection.close?.().catch(() => {});
              await cleanupConnection(connection);
              cache.delete(key);
              return 
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
  // Input validation (keep this outside lock as it's cheap)
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);
  if (typeof dbKey !== 'string' || !/^mongodb(\+srv)?:\/\//.test(dbUri) || !/^[a-z0-9_-]{3,50}$/i.test(dbKey)) {
    throw new Error(`Invalid dbKey or dbUri for ${dbKey}`);
  }

  try {
    return await lock.acquire(dbKey, async () => {
      // Single cache lookup for the entire operation
      const existingConnection = cache.get(dbKey);
      
      // Handle error state first
      if (isRecentErrorConnection(existingConnection)) {
        throw new Error(`Recent connection failure for ${dbKey}`);
      }

      // Handle healthy cached connection
      if (existingConnection?.readyState === 1) {
        try {
          await existingConnection.db.admin().ping({serverSelectionTimeoutMS: 1000});
          if (existingConnection.meta) {
            existingConnection.meta.lastUsed = Date.now();
          }
          console.log(`[CACHE HIT] Healthy connection for: ${dbKey}`);
          return existingConnection;
        } catch (pingError) {
          console.error(`Cached connection failed ping for ${dbKey}:`, pingError.message);
          await cleanupConnection(existingConnection);
          cache.delete(dbKey);
          // Continue to create new connection
        }
      }

      // Handle connecting state
      if (existingConnection?.readyState === 2) {
        console.log(`⏳ Waiting for connecting state (${dbKey})...`);
        const startTime = Date.now();
        try {
          await new Promise((resolve, reject) => {
            const checkReady = () => {
              if (existingConnection.readyState === 1) {
                resolve();
              } else if (existingConnection.readyState === 0 || 
                       Date.now() - startTime > config.maxWait) {
                reject(new Error('Connection not ready within timeout'));
              } else {
                setTimeout(checkReady, config.waitInterval);
              }
            };
            checkReady();
          });
          console.log(`✅ Connection became ready for ${dbKey}`);
          return existingConnection;
        } catch (waitError) {
          console.error(`Timeout waiting for connection (${dbKey}):`, waitError.message);
          await cleanupConnection(existingConnection);
          cache.delete(dbKey);
          // Continue to create new connection
        }
      }

      // Create new connection
      console.log(`🛠️ Creating new connection for ${dbKey}`);
      cache.set(dbKey, { readyState: 2 }); // Mark as connecting

      const newConnection = await retry(async () => 
        await mongoose.createConnection(dbUri, {
          dbName: dbKey,
          maxPoolSize: (dbKey === 'auth_db') ? config.maxAuthDbConnections : config.maxTenantConnections,
          socketTimeoutMS: 20000,
          serverSelectionTimeoutMS: 15000
        }).asPromise(),
        { 
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 3000,
          onRetry: (err, attempt) => {
            console.warn(`🔁 Retry ${attempt} for ${dbKey}: ${err.message}`);
          }
        }
      );

      // Setup connection handlers
      newConnection.removeAllListeners();
      newConnection.on('error', async (err) => {
        console.error(`🚨 Connection error for ${dbKey}:`, err);
        await cleanupConnection(newConnection);
        cache.delete(dbKey);
      });
      
      newConnection.on('disconnected', async () => {
        console.warn(`⚠️ Connection disconnected for ${dbKey}`);
        await cleanupConnection(newConnection);
        cache.delete(dbKey);
      });

      // Set metadata
      newConnection.meta = {
        createdAt: Date.now(),
        dbKey: dbKey,
        lastUsed: Date.now(),
        version: 1 // Useful for future migrations
      };

      cache.set(dbKey, newConnection, { ttl: config.connectionTtl });
      console.log(`✅ Successfully connected: ${dbKey}`);
      return newConnection;

    }, { 
      timeout: config.connectionLockTimeout, 
      maxOccupationTime: config.connectionLockTimeout * 2, 
      maxPending: 10
    });
  } catch (err) {
    if (err.message.includes("timeout")) {
      const pending = lock.getPendingQueue();
      console.error(`⏱️ Lock timeout for ${dbKey}, pending requests:`, pending.length);
      throw new Error(`Database operation timeout for ${dbKey} (${pending.length} pending)`);
    }

    // Handle network errors
    if (err.name === 'MongoNetworkError') {
      const isNetworkDown = !(await isInternetAvailable().catch(() => false));
      cache.set(dbKey, { 
        status: "error", 
        timestamp: Date.now(), 
        dbUri: dbUri, 
        reason: isNetworkDown ? 'network_down' : 'database_error',
        errorMessage: err.message
      }, { ttl: config.errCacheTtl });
    }

    console.error(`❌ Connection failed for ${dbKey}:`, err.message);
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
        await cleanupConnection(conn);
        // if (conn?.close) {
        //     try {
        //       conn.removeAllListeners?.();
        //       await conn.close();
        //     } catch (e) {
        //       console.warn(`⚠️ Shutdown failed for ${key}:`, e.message);
        //     }
        //   }
      })
    );
    cache.clear();
    process.exit(err ? 1 : 0);
}

if (!process.__gracefulExitListenersAdded) {
  ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => gracefulExit(sig)));

  // Fatal error handlers (add these after the above)
  process.on('uncaughtException', (err) => gracefulExit('uncaughtException', err));
  process.on('unhandledRejection', (err) => gracefulExit('unhandledRejection', err));

  if (process.platform !== 'win32'){
    process.once('SIGUSR2', async () => {
      await gracefulExit('SIGUSR2');
      process.kill(process.pid, 'SIGUSR2');
    });
  }
  
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









// export async function dbConnect({dbKey, dbUri}) {
//   if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);

//   if (typeof dbKey !== 'string' || !/^mongodb(\+srv)?:\/\//.test(dbUri) || !/^[a-z0-9_-]{3,50}$/i.test(dbKey)) 
//     throw new Error(`Invalid dbKey or dbUri for ${dbKey}`);

//   const cachedConnection = cache.get(dbKey);
//   if (cachedConnection?.readyState === 1){ 
//     console.log(`[CACHE HIT] Returning existing connection for: ${dbKey}`);
//     // return cachedConnection;
//     try {
//       await cachedConnection.db.admin().ping({serverSelectionTimeoutMS: 1000});
//       if (cachedConnection.meta) cachedConnection.meta.lastUsed = Date.now();
//       return cachedConnection;
//     } catch {
//       // Continue to create new connection
//       cache.delete(dbKey);
//     }


//   }
  

//   try {
//     return await lock.acquire(dbKey, async ()=> {
//       // const recentError = cache.get(dbKey)?.status === 'error' && 
//       //                Date.now() - cache.get(dbKey).timestamp < config.errRetryInterval;
//       if (isRecentErrorConnection(cache.get(dbKey))) {
//         throw new Error(`Recent connection failure for ${dbKey}`);
//       }


//       const lockedConnection = cache.get(dbKey);
//       if (lockedConnection) {
//         // Connection is already ready
//         if (lockedConnection.readyState === 1) {
//           console.log(`♻️ Reusing existing connection for ${dbKey}`);

//           try {
//             await lockedConnection.db.admin().ping({serverSelectionTimeoutMS: 1000});
//             if (lockedConnection.meta) lockedConnection.meta.lastUsed = Date.now();
            
//             console.log(`[CACHE HIT] Returning existing connection for: ${dbKey}`);
//             return lockedConnection;
//           } catch (pingError) {
//             console.error(`Cached connection ping failed for ${dbKey}:`, pingError.message);
//             await cleanupConnection(lockedConnection);
//             cache.delete(dbKey);
//             // Continue to create new connection
//           }
//         }

//         // Connection is in connecting state - wait with timeout
//         if (lockedConnection.readyState === 2) { // 2 = connecting
//           console.log(`⏳ Waiting for existing connection (${dbKey}) to become ready...`);
          
//           const startTime = Date.now();
//           try {
//             await new Promise((resolve, reject) => {
//               const checkReady = () => {
//                 if (lockedConnection.readyState === 1) {
//                   resolve();
//                 } else if (lockedConnection.readyState === 0 || // 0 = disconnected
//                          Date.now() - startTime > config.maxWait) {
//                   reject(new Error('Connection not ready within timeout'));
//                 } else {
//                   setTimeout(checkReady, config.waitInterval);
//                 }
//               };
//               checkReady();
//             });
            
//             console.log(`✅ Existing connection became ready for ${dbKey}`);
//             return lockedConnection;
//           } catch (waitError) {
//             console.log(`⌛ Timeout waiting for connection (${dbKey}), creating new one...`);
//             cache.delete(dbKey);
//             try {
//               await lockedConnection.close();
//             } catch (closeError) {
//               console.log(`⚠️ Error closing stale connection: ${closeError.message}`);
//             }
//           }
//         }
//       }

//       try {
//         if (isRecentErrorConnection(lockedConnection)) 
//           throw new Error(`❌ Recent connection failure for ${dbKey}`);
          
//         cache.set(dbKey, { readyState: 2 });
//         // const newConnection = await mongoose.createConnection(dbUri, {  dbName: dbKey,
//         //                                                     maxPoolSize: (dbKey === 'auth_db') 
//         //                                                                     ? config.maxAuthDbConnections 
//         //                                                                     : config.maxTenantConnections,
//         //                                                 socketTimeoutMS: 20000,
//         //                                         serverSelectionTimeoutMS: 15000 }).asPromise();
        
//         const newConnection = await retry(async () =>  await mongoose.createConnection(dbUri, {
//                                                           dbName: dbKey,
//                                                           maxPoolSize: (dbKey === 'auth_db') ? config.maxAuthDbConnections : config.maxTenantConnections,
//                                                           socketTimeoutMS: 20000,
//                                                           serverSelectionTimeoutMS: 15000
//                                                         }).asPromise()
//                                                       , { retries: 3,
//                                                           minTimeout: 1000,
//                                                           maxTimeout: 3000,
//                                                           onRetry: (err, attempt) => {
//                                                                           console.log(`🔁 Retry ${attempt} for ${dbKey}: ${err.message}`);
//                                                                       }
//                                                           });
//         newConnection.removeAllListeners();
//         newConnection.on('error', async function (err) {
//           console.error(`Connection error for ${dbKey}:`, err);
//           await cleanupConnection(newConnection);
//           cache.delete(dbKey);
//           // newConnection.close().catch(() => {});
//         });
//         newConnection.on('disconnected', async function() {
//           console.log(`Connection disconnected for ${dbKey}`);
//           await cleanupConnection(newConnection);
//           cache.delete(dbKey);
//           // newConnection.close().catch(() => {});
//         });
        
//         newConnection.meta = {
//                 createdAt: Date.now(),
//                 dbKey: dbKey,
//                 lastUsed: Date.now()
//               };
//         cache.set(dbKey, newConnection, { ttl: config.connectionTtl});
        
//         console.log(`✅ Connected: ${dbKey}`);
//         return newConnection;

//       } catch (error) {
//           let isNetworkDown = false;
//           let reason = 'unknown';


//           try {
//             isNetworkDown = !(await isInternetAvailable());
//           } catch (dnsError) {
//             console.warn(`⚠️ DNS check failed while checking internet connectivity:`, dnsError.message);
//             isNetworkDown = true;
//           }

//           if (isNetworkDown) {
//             reason = 'No internet or DNS issue';
//             console.log(`⚠️ Network issue detected while connecting to ${dbKey}. Will retry on next interval.`);
//           } else {
//             reason = error.code || error.name || 'Unknown Error';
//             console.log(`❌ Connection Failed for ${dbKey}: ${error.message} [${reason}]`);
//           }
//           // if (isNetworkDown) console.log(`⚠️ Network issue detected while connecting to ${dbKey}. Will retry on next interval.`);
//           // else console.log(`❌ Connection Failed for ${dbKey}: ${error.message}`);

//           cache.set(dbKey, { status: "error", timestamp: Date.now(), dbUri: dbUri, reason: reason, errorMessage: error.message }, { ttl: config.errCacheTtl });
//           console.log(`❌ Connection Failed: ${dbKey}`, error.message)
//           throw error;
//         }
//     },  {           timeout: config.connectionLockTimeout, 
//           maxOccupationTime: config.connectionLockTimeout * 2, 
//                  maxPending: 10  })
//   } catch (err) {
//     if (err.message.includes("timeout")) {
//       const pending = lock.getPendingQueue();
//       console.error(`Lock timeout for ${dbKey}, pending requests:`, pending.length);
//       throw new Error(`Database operation timeout for ${dbKey} (${pending.length} pending)`);
//     }
//     throw err;
//   }
// }









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