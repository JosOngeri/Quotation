import { Request, Response, NextFunction } from 'express';

const tokenBlacklist = new Set<string>();

export const revokeToken = (token: string) => {
  tokenBlacklist.add(token);
};

export const checkTokenRevocation = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && tokenBlacklist.has(token)) {
    return res.status(401).json({
      error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' }
    });
  }
  
  next();
};