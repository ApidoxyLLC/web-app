import crypto from 'crypto';
import getRedisClient from '../getRedisClient';
import config from '../../../../config';

const sessionRedis = getRedisClient('session');
const SESSION_PREFIX = 'session:';
const TTL = config.accessTokenExpireMinutes *  60; //default: 15 minute

export async function setSession({ tokenId, data = {}}) {
    const hashedToken = crypto.createHash('sha256').update(tokenId).digest('hex')
    const key = `${SESSION_PREFIX}${hashedToken}`;    
    await sessionRedis.setex( key, TTL, JSON.stringify({ ...data, createdAt: new Date().toISOString()}));
    return key;
}

export async function getSession(tokenId) {
  const key = `${SESSION_PREFIX}${crypto.createHash('sha256').update(tokenId).digest('hex')}`;
  const sessionData = await sessionRedis.get(key);
  if (!sessionData) throw new Error('Session not found or expired');
  return JSON.parse(sessionData);
}





