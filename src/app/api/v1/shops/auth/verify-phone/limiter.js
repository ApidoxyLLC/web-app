export const rateLimiterPhoneOtp = new RateLimiterMemory({
  keyPrefix: 'rl-phoneOtp',
  points: 5, // max requests
  duration: 600, // per 600 seconds = 10 minutes
});
export default rateLimiterPhoneOtp;