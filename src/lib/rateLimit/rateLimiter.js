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
    points: 10000,
    duration: 60,
    blockDuration: 60 * 5,
  }),
  register: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:register',
    points: 10000,
    duration: 60,
    blockDuration: 60 * 5, 
  }),
  otpLogin: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:otp',
    points: 10000,
    duration: 300,
    blockDuration: 60 * 5,
  }),
  createShop: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:create_shop',
    points: 10000,               // max 3 project creation attempts
    duration: 3600,          // per 1 hour
    blockDuration: 60 * 5,  // if exceeded, block for 15 minutes
  }),
  getShop: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:get_shop',
    points: 10000,           // Max 60 GET requests
    duration: 60,         // per 60 seconds
    blockDuration: 60 * 5 // Block for 2 minutes if exceeded
  }),
  getShopDetail: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:get_shop_detail',
    points: 10000,           // Max 60 GET requests
    duration: 60,         // per 60 seconds
    blockDuration: 60 * 5 // Block for 2 minutes if exceeded
  }),
// checkSlug
  checkSlug: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:check_slug',
      points: 10000,           // Max 60 GET requests
      duration: 60,         // per 60 seconds
      blockDuration: 60 * 10 // Block for 2 minutes if exceeded
    }),
  uploadCategoryImage: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:uld_cat_img',
      points: 10000,           // Max 60 GET requests
      duration: 60,         // per 60 seconds
      blockDuration: 60 * 10 // Block for 2 minutes if exceeded
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