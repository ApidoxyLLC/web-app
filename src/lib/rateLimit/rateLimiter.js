import { RateLimiterRedis } from "rate-limiter-flexible";
import getRedisClient from "../redis/getRedisClient";

const redis = getRedisClient('rateLimit')

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:global',
  points: 100,      // 100 requests
  duration: 60,     // per 60 seconds
  execEvenly: false,       // Do not smooth out bursts
  blockDuration: 60 * 5, 
});

const scopeLimiters = {
  login: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:login',
    points: 5,
    duration: 60,
    blockDuration: 60 * 15,
  }),
  register: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:register',
    points: 5,
    duration: 60,
    blockDuration: 60 * 30, 
  }),
  otp: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:otp',
    points: 3,
    duration: 300,
    blockDuration: 60 * 60,
  }),
};

export async function applyRateLimit({ key, scope = null }) {
  const limiter = scope && scopeLimiters[scope] ? scopeLimiters[scope] : globalLimiter;

  try {
    const res = await limiter.consume(key);
    return { allowed: true, remaining: res.remainingPoints, retryAfter: 0,};
  } catch (rejRes) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
    };
  }
}