import getRedisClient from '../getRedisClient';
import config from '../../../../config';
import safeCompare from '../utils/safeCompare';
import safeCompare from '../utils/safeCompare';

const sessionRedis = getRedisClient('session');
const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user:sessions:';
const TTL = config.accessTokenExpireMinutes *  60;

export async function setSession({ sessionId, tokenId, payload ={}}) {
    const { sub, role, userId } = payload
    console.log(sessionId)
    console.log(tokenId)
    console.log(sub)
    if (!sessionId || !tokenId || !sub || !userId) throw new Error('Missing required session data');
    const hashedTokenId = hashTokenId(tokenId)
    const key = `${SESSION_PREFIX}${sessionId}`;
    const now = Date.now();
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${sub}`;

    const pipeline = sessionRedis.pipeline();
    // Set session data with TTL
    pipeline.setex( key, TTL, JSON.stringify({  sub, role, userId,
                                                  tokenId: hashedTokenId,
                                                createdAt: new Date().toISOString() }) );
    // Add to user sessions set with same TTL
    pipeline.zadd( userSessionsKey, now, sessionId );
    pipeline.expire(userSessionsKey, TTL);
    pipeline.zcard(userSessionsKey);

    const results = await pipeline.exec();
    const sessionCount = results[results.length - 1][1]; // last result = zcard count

    if (sessionCount > config.maxConcurrentSession) {
        const sessionsToRemove = await sessionRedis.zrange(userSessionsKey, 0, sessionCount - config.maxConcurrentSession - 1);
        if (sessionsToRemove.length > 0) {
        const deletePipeline = sessionRedis.pipeline();
        for (const oldId of sessionsToRemove) {
            deletePipeline.del(`${SESSION_PREFIX}${oldId}`);
            deletePipeline.zrem(userSessionsKey, oldId);
        }
        await deletePipeline.exec();
        }
    }
    return key;
}

export async function validateSession({ sessionId, tokenId }) {
    console.log('Validation attempt from Redis')
    if (!sessionId || !tokenId) return null;
    const key = `${SESSION_PREFIX}${sessionId}`;
    const raw = await sessionRedis.get(key);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        const hashedTokenId = hashTokenId(tokenId);

        if (!safeCompare(data.tokenId, hashedTokenId)) return null;
        return data;
    } catch (e) {
        console.error('Failed to parse session', e);
        return null;
    }
}

export async function revokeAllSessions(userId) {
  if (!userId) throw new Error("Missing userId");

  const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

  // 1. Get all sessionIds from ZSET
  const sessionIds = await sessionRedis.zrange(userSessionsKey, 0, -1);
  if (!sessionIds.length) return;

  // 2. Build full session keys
  const keys = sessionIds.map(id => `${SESSION_PREFIX}${id}`);

  // 3. Pipeline delete all session keys + the ZSET
  const pipeline = sessionRedis.pipeline();
  pipeline.del(...keys);
  pipeline.del(userSessionsKey);
  await pipeline.exec();
}

export async function revokeSession({ sessionId, userId }) {
    if (!sessionId || !userId) 
        return null
    // Delete the session data
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const userSessionKey = `${USER_SESSIONS_PREFIX}${userId}`;
    
    const pipeline = sessionRedis.pipeline();
    pipeline.del(sessionKey);
    pipeline.zrem(userSessionKey, sessionId);
    const results = await pipeline.exec();
    const [delSessionRes, zremRes] = results.map(r => r[1]); // extract [error, result]
    const success = delSessionRes > 0 || zremRes > 0;
    return success;
}







