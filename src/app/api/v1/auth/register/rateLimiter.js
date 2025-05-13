import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per second
});

export default rateLimiter;