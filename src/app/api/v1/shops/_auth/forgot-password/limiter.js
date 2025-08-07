export const rateLimiterForgetPassword = new RateLimiterMemory({
  keyPrefix: 'fp-email',
  points: 5, // max requests
  duration: 600, // per 600 seconds = 10 minutes
});
export default rateLimiterForgetPassword;