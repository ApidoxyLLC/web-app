export const rateLimiterEmailVerification = new RateLimiterMemory({
  keyPrefix: 'rl-email-identity',
  points: 5, // max requests
  duration: 600, // per 600 seconds = 10 minutes
});
export default rateLimiterEmailVerification;