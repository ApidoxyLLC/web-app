import crypto from 'crypto';
import getRedisClient from '../getRedisClient';
import config from '../../../../config';

const sessionRedis = getRedisClient('session');
const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user:sessions:';
const TTL = config.accessTokenExpireMinutes *  60;

export async function setSession({ sessionId, tokenId, payload ={}}) {
    const { sub, role } = payload
    if (!sessionId || !tokenId || !sub) throw new Error('Missing required session data');
    const hashedTokenId = crypto.createHash('sha256').update(tokenId).digest('hex')
    const key = `${SESSION_PREFIX}${sessionId}`;
    await sessionRedis.setex( key, TTL, JSON.stringify({ sub, role, tokenId: hashedTokenId, createdAt: new Date().toISOString()}));
    await sessionRedis.sadd(`${USER_SESSIONS_PREFIX}${sub}`, sessionId);
    return key;
}

export async function validateSession({ sessionId, tokenId }) {
    if (!sessionId || !tokenId) return null;

    const key = `${SESSION_PREFIX}${sessionId}`;
    const raw = await sessionRedis.get(key);

    if (!raw) return null;

    try {
        const data = JSON.parse(raw);
        const hashedTokenId = crypto.createHash('sha256').update(tokenId).digest('hex');
        if (data.tokenId !== hashedTokenId) return null;
        return data;
    } catch (e) {
        console.error('Failed to parse session', e);
        return null;
    }
}

export async function revokeAllSessions(userId) {
    const sessionIds = await sessionRedis.smembers(`${USER_SESSIONS_PREFIX}${userId}`);
    if (!sessionIds.length) return;
    const keys = sessionIds.map(id => `session:${id}`);
    await sessionRedis.del(...keys);
    await sessionRedis.del(`${USER_SESSIONS_PREFIX}${userId}`);
}







