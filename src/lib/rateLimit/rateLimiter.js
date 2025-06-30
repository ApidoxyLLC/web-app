import { RateLimiterRedis } from "rate-limiter-flexible";
import getRedisClient from "../redis/getRedisClient";

const redis = getRedisClient('rateLimit')

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:global',
  points: 100,      // 100 requests
  duration: 60,     // per 60 seconds
});

const scopeLimiters = {
  login: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:login',
    points: 5,
    duration: 60,
  }),
  register: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:login',
    points: 5,
    duration: 60,
  }),
  otp: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:otp',
    points: 3,
    duration: 300,
  }),
};

export async function applyRateLimit({ key, scope = null }) {
  const limiter = scope && scopeLimiters[scope] ? scopeLimiters[scope] : globalLimiter;

  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (rejRes) {
    return {
      allowed: false,
      retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
    };
  }
}