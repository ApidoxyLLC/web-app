export const rateLimiterEmail = new RateLimiterMemory({
  keyPrefix: 'email_verification',
  points: 5,             // 5 attempts
  duration: 3600,        // per hour
});

export const rateLimiterIP = new RateLimiterMemory({
  keyPrefix: 'ip_limit',
  points: 10,            // 10 requests
  duration: 600,         // per 10 minutes
});

export const rateLimiterEmailToken = new RateLimiterMemory({
  keyPrefix: 'rl-email-identity',
  points: 5, // max requests
  duration: 600, // per 600 seconds = 10 minutes
});