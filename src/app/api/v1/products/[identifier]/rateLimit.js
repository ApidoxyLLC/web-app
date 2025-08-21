import { LRUCache } from "lru-cache";

const RATE_LIMIT = {
  POINTS: 100,                   // Max 100 requests
  DURATION: 60 * 1000,           // per 60 seconds
  BLOCK_DURATION: 10 * 60 * 1000, // Block for 10 minutes
  CACHE_MAX: 10000,
  CACHE_TTL: 15 * 60 * 1000,     // Cache TTL (15 mins)
};

const rateLimitCache = new LRUCache({
  max: RATE_LIMIT.CACHE_MAX,
  ttl: RATE_LIMIT.CACHE_TTL,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

function generateUserKey(userId, ip) {
  if (userId) return `user:${userId}`;
  if (ip) return `ip:${ip}`;
  return 'unknown';
}

export default function rateLimit({ userId, ip }) {
  const now = Date.now();
  const key = generateUserKey(userId, ip);

  let entry = rateLimitCache.get(key) || {
    count: 0,
    startTime: now,
    isBlocked: false,
    blockUntil: 0,
  };

  // Unblock if block duration expired
  if (entry.isBlocked && now > entry.blockUntil) {
    entry = {
      count: 0,
      startTime: now,
      isBlocked: false,
      blockUntil: 0,
    };
  }

  // Reset count if duration window expired
  if (now - entry.startTime > RATE_LIMIT.DURATION) {
    entry.count = 0;
    entry.startTime = now;
  }

  // Block if rate exceeded
  if (entry.count >= RATE_LIMIT.POINTS) {
    if (!entry.isBlocked) {
      entry.isBlocked = true;
      entry.blockUntil = now + RATE_LIMIT.BLOCK_DURATION;
    }
    rateLimitCache.set(key, entry);

    return {
      allowed: false,
      headers: {
        'Retry-After': Math.ceil((entry.blockUntil - now) / 1000),
        'X-RateLimit-Limit': RATE_LIMIT.POINTS,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(entry.blockUntil).toISOString(),
      },
    };
  }

  // Allow request and update count
  entry.count += 1;
  rateLimitCache.set(key, entry);

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': RATE_LIMIT.POINTS,
      'X-RateLimit-Remaining': RATE_LIMIT.POINTS - entry.count,
      'X-RateLimit-Reset': new Date(entry.startTime + RATE_LIMIT.DURATION).toISOString(),
    },
  };
}