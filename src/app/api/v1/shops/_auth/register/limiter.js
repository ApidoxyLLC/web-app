export const rateLimiterRegisterUser = new RateLimiterMemory({
  keyPrefix: 'register-ip',  // More descriptive prefix
  points: 3,                 // 3 attempts
  duration: 3600,            // Per 1 hour (3600 seconds)
});
export default rateLimiterRegisterUser;