import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Simple CSRF token generation (not using deprecated csurf)
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = (req as any).session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid CSRF token' }
    });
  }

  next();
};

export const setCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  const session = (req as any).session;
  if (!session) {
    return next();
  }

  if (!session.csrfToken) {
    session.csrfToken = generateCSRFToken();
  }

  res.setHeader('X-CSRF-Token', session.csrfToken);
  next();
};