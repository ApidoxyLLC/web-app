// // lib/redis/helpers.js
// import { getRedisClient } from './client';

// export async function setCache(key, value, ttl = 3600) {
//   const redis = getRedisClient();
//   await redis.set(key, JSON.stringify(value), 'EX', ttl);
// }

// export async function getCache(key) {
//   const redis = getRedisClient();
//   const raw = await redis.get(key);
//   return raw ? JSON.parse(raw) : null;
// }

// export async function deleteCache(key) {
//   const redis = getRedisClient();
//   await redis.del(key);
// }