import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per second
});

export const phoneVerificationLimiter = new RateLimiterMemory({
  points: 2,            // 2 requests
  duration: 300,        // per 300 seconds = 5 minutes
  keyPrefix: 'phone-verification',
});

export const emailVerificationLimiter = new RateLimiterMemory({
  points: 3,            // 2 requests
  duration: 900,        // per 300 seconds = 5 minutes
  keyPrefix: 'email-verification',
});

export default rateLimiter;