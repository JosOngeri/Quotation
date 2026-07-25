import { Request, Response, NextFunction } from 'express';

const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
const isTest = process.env.NODE_ENV === 'test';

export const accountLockout = (req: Request, res: Response, next: NextFunction) => {
  if (isTest) {
    return next(); // Skip account lockout in test environment
  }
  
  const { email } = req.body;
  const now = Date.now();
  
  if (loginAttempts.has(email)) {
    const { lockUntil } = loginAttempts.get(email)!;
    
    if (now < lockUntil) {
      const remainingTime = Math.ceil((lockUntil - now) / 1000 / 60);
      return res.status(429).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account locked. Try again in ${remainingTime} minutes`
        }
      });
    }
  }
  
  next();
};

export const recordFailedLogin = (email: string) => {
  if (isTest) {
    return; // Skip recording in test environment
  }
  
  const now = Date.now();
  const existing = loginAttempts.get(email) || { count: 0, lockUntil: 0 };
  
  const newCount = existing.count + 1;
  
  if (newCount >= 5) {
    existing.lockUntil = now + 30 * 60 * 1000; // 30 minutes
  }
  
  loginAttempts.set(email, { count: newCount, lockUntil: existing.lockUntil });
};

export const recordSuccessfulLogin = (email: string) => {
  if (isTest) {
    return; // Skip recording in test environment
  }
  
  loginAttempts.delete(email);
};