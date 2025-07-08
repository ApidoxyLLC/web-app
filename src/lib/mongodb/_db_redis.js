import mongoose from 'mongoose';
import Redis from 'ioredis';
import AsyncLock from 'async-lock';
import Redlock from 'redlock';
import config from './config';

const redis = new Redis(config.redisUri);
const redlock = new Redlock([redis]);
const lock = new AsyncLock();
const connectionMap = new Map();

const METADATA_PREFIX = 'db-meta:';

setInterval(async () => {
  const keys = await redis.keys(`${METADATA_PREFIX}*`);
  await Promise.all(keys.map( async redisKey => {
    const dbKey = redisKey.replace(METADATA_PREFIX, '');
    const conn = connectionMap.get(dbKey);

    if (conn && typeof conn.readyState === 'number') {
      if (conn.readyState !== 1) {
        await conn.close().catch(() => {});
        connectionMap.delete(dbKey);
        await redis.del(redisKey);
        console.log(`🗑️ Deleted Redis meta for: ${dbKey}`);
      } else {
        try {
          await conn.db.admin().ping();
        } catch(err) {
          console.log(`⚠️ Ping failed for ${dbKey}`, err);
          await conn.close().catch(() => {});
          connectionMap.delete(dbKey);
          await redis.del(redisKey);
        }
      }
    } else {
      const meta = await redis.get(redisKey);
      if (!meta) return;
      const parsed = JSON.parse(meta);
      if (parsed.status === 'error' && Date.now() - parsed.timestamp > config.errCacheTtl) {
        await redis.del(redisKey);
        connectionMap.delete(dbKey);
      }
    }
  }));
}, 30000);

export async function dbConnect({ dbKey, dbUri }) {
  if (!dbUri) throw new Error(`No URI provided for database key: ${dbKey}`);
  if (typeof dbKey !== 'string' || !/^mongodb(\+srv)?:\/\//.test(dbUri) || !/^[a-z0-9_-]{3,50}$/i.test(dbKey))
    throw new Error(`Invalid dbKey or dbUri for ${dbKey}`);

  const existing = connectionMap.get(dbKey);
  if (existing?.readyState === 1) {
    existing.meta.lastUsed = Date.now();
    console.log(`[CACHE HIT] Returning existing connection for: ${dbKey}`);
    return existing;
  }

  return await lock.acquire(dbKey, async () => {
    await redlock.using([`lock:${dbKey}`], 10000, async () => {
        const metaStr = await redis.get(`${METADATA_PREFIX}${dbKey}`);
        if (metaStr) {
        const meta = JSON.parse(metaStr);
        if (meta.status === 'error' && Date.now() - meta.timestamp < config.errCacheTtl) {
            throw new Error(`❌ Recent connection failure for ${dbKey}`);
        }
        }

        const lockedConn = connectionMap.get(dbKey);
        if (lockedConn?.readyState === 1) {
        lockedConn.meta.lastUsed = Date.now();
        return lockedConn;
        }

        if (lockedConn?.readyState === 2) {
        console.log(`⏳ Waiting for existing connection (${dbKey}) to become ready...`);
        const start = Date.now();
        try {
            await new Promise((resolve, reject) => {
            const check = () => {
                if (lockedConn.readyState === 1) return resolve();
                if (lockedConn.readyState === 0 || Date.now() - start > config.maxWait) return reject();
                setTimeout(check, config.waitInterval);
            };
            check();
            });
            lockedConn.meta.lastUsed = Date.now();
            return lockedConn;
        } catch {
            console.log(`⌛ Timeout waiting, closing stale connection: ${dbKey}`);
            await lockedConn.close().catch(() => {});
            connectionMap.delete(dbKey);
        }
        }

        try {
        connectionMap.set(dbKey, { readyState: 2 }); // Mark as connecting
        const conn = await mongoose.createConnection(dbUri, {
            dbName: dbKey,
            maxPoolSize: dbKey === 'auth_db' ? config.maxAuthDbConnections : config.maxTenantConnections,
            socketTimeoutMS: 5000,
            serverSelectionTimeoutMS: 3000,
        }).asPromise();

        conn.meta = {
            dbKey,
            createdAt: Date.now(),
            lastUsed: Date.now(),
        };
        connectionMap.set(dbKey, conn);
        await redis.set(`${METADATA_PREFIX}${dbKey}`, JSON.stringify(conn.meta), 'PX', config.connectionTtl);

        console.log(`✅ Connected: ${dbKey}`);
        return conn;
        } catch (error) {
        await redis.set(`${METADATA_PREFIX}${dbKey}`, JSON.stringify({ status: 'error', timestamp: Date.now() }), 'PX', config.errCacheTtl);
        console.log(`❌ Connection Failed: ${dbKey}`, error.message);
        throw error;
        }
    });
    
  });
}

const gracefulExit = async (reason, err) => {
    console.log(`🛑 Received ${reason}, closing all DB connections...`);
    if (err) console.error(`❌ Graceful shutdown error:`, err);
    await Promise.all(Array.from(connectionMap.entries()).map(([key, conn]) =>
        conn?.readyState === 1 ? conn.close().catch(() => {}) : Promise.resolve()
    ));

    // Clean up all Redis meta keys
    const keys = await redis.keys(`${METADATA_PREFIX}*`);
    if (keys.length) {
        await redis.del(...keys);
        console.log(`🗑️ Deleted all Redis meta keys on shutdown.`);
    }

    const isError = reason === 'uncaughtException' || reason === 'unhandledRejection';
    process.exit(isError ? 1 : 0);
};

['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => gracefulExit(sig)));
process.on('uncaughtException', err => gracefulExit('uncaughtException', err));
process.on('unhandledRejection', err => gracefulExit('unhandledRejection', err));
process.once('SIGUSR2', async () => {
  await gracefulExit('SIGUSR2');
  process.kill(process.pid, 'SIGUSR2');
});
