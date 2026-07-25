import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env-validation';

export interface AuthRequest extends Request {
  userId?: string;
  workspaceId?: string;
  roles?: string[];
  userRole?: string;
}

export const authenticatePlatformAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;
    
    if (decoded.userType !== 'platform_admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Platform admin access required' } });
    }

    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

export const authenticateTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;
    
    req.userId = decoded.userId;
    req.workspaceId = decoded.workspaceId;
    req.roles = decoded.roles;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.roles || !req.roles.some(role => roles.includes(role))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
};
