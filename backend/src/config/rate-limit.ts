import rateLimit from 'express-rate-limit';

const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
const isTest = process.env.NODE_ENV === 'test';

const createLimiter = (options: any) => {
  if (isTest) {
    // Return a no-op middleware in test environment
    return (req: any, res: any, next: any) => next();
  }
  
  return rateLimit({
    ...options,
    skip: (req) => {
      const clientIP = req.ip;
      return trustedIPs.includes(clientIP);
    }
  });
};

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

export const writeLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations per minute
  message: 'Too many write operations, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});