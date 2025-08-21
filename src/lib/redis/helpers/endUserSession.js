import getRedisClient from '../getRedisClient';
import config from '../../../../config';
import hashTokenId from '../utils/hashTokenId';
import safeCompare from '../utils/safeCompare';

const sessionRedis = getRedisClient('session');

const TTL = config.accessTokenExpireMinutes * 60; // default fallback TTL


/**
 * Generate Redis keys for multi-tenant session storage
 */
function getKeys({ vendorId, sessionId, userId }) {
  if (!vendorId) throw new Error('Missing vendorId');
  return {
    sessionKey: `vdr:${vendorId}:ssn:${sessionId}`,
    userSessionsKey: `vdr:${vendorId}:usr:${userId}`,
  };
}

/**
 * Create/Update a session for a vendor user
 */
export async function setSession({ vendorId, sessionId, tokenId, ttlMinutes = config.accessTokenDefaultExpireMinutes,   payload = {},   }) {
  // email, phone, role,
  const { userId } = payload;
  if (!vendorId || !sessionId || !tokenId || !userId)  throw new Error('Missing required session data');
  

  const hashedTokenId = hashTokenId(tokenId);
  const { sessionKey, userSessionsKey } = getKeys({ vendorId, sessionId, userId });
  const now = Date.now();

  const ttlInSeconds = ttlMinutes * 60;

  const pipeline = sessionRedis.pipeline();
  
  // Store session with hashed tokenId
  pipeline.setex(sessionKey, ttlInSeconds, JSON.stringify({ ...payload,
                                                       userId,
                                                      tokenId: hashedTokenId,
                                                    createdAt: new Date().toISOString()      }));

  // Add sessionId to user's sorted set
  pipeline.zadd(userSessionsKey, now, sessionId);
  pipeline.expire(userSessionsKey, ttlInSeconds);
  pipeline.zcard(userSessionsKey);

  const results = await pipeline.exec();
  const sessionCount = results[results.length - 1][1];

  // Enforce max concurrent sessions per vendor user
  if (sessionCount > config.maxConcurrentSession) {
    const excessSessions = await sessionRedis.zrange( userSessionsKey, 0, sessionCount - config.maxConcurrentSession - 1 );
    if (excessSessions.length) {
      const delPipeline = sessionRedis.pipeline();
      for (const oldId of excessSessions) {
        delPipeline.del(`vendor:${vendorId}:session:${oldId}`);
        delPipeline.zrem(userSessionsKey, oldId);
      }
      await delPipeline.exec();
    }
  }

  return sessionKey;
}

/**
 * Validate session
 */
export async function validateSession({ vendorId, sessionId, tokenId }) {
  console.log(vendorId)
  console.log(sessionId)
  console.log(tokenId)

  if (!vendorId || !sessionId || !tokenId) return null;

  const { sessionKey } = getKeys({ vendorId, sessionId });
  const raw = await sessionRedis.get(sessionKey);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    const hashedTokenId = hashTokenId(tokenId);
    if (!safeCompare(data.tokenId, hashedTokenId)) return null;
    return data;
  } catch (err) {
    console.error('Failed to parse session', err);
    return null;
  }
}

/**
 * Revoke all sessions for a vendor user
 */
export async function revokeAllSessions({ vendorId, userId }) {
  if (!vendorId || !userId) throw new Error('Missing vendorId or userId');

  const { userSessionsKey } = getKeys({ vendorId, userId });
  const sessionIds = await sessionRedis.zrange(userSessionsKey, 0, -1);
  if (!sessionIds.length) return;

  const pipeline = sessionRedis.pipeline();
  for (const id of sessionIds) {
    pipeline.del(`vendor:${vendorId}:session:${id}`);
  }
  pipeline.del(userSessionsKey);
  await pipeline.exec();
}

/**
 * Revoke a specific session
 */
export async function revokeSession({ vendorId, sessionId, userId }) {
  if (!vendorId || !sessionId || !userId) return null;

  const { sessionKey, userSessionsKey } = getKeys({ vendorId, sessionId, userId });
  const pipeline = sessionRedis.pipeline();
  pipeline.del(sessionKey);
  pipeline.zrem(userSessionsKey, sessionId);

  const results = await pipeline.exec();
  const [delSessionRes, zremRes] = results.map(r => r[1]);
  return delSessionRes > 0 || zremRes > 0;
}