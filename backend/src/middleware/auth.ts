import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env-validation';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  workspaceId?: string;
  roles?: string[];
  userType?: string;
  userRole?: string;
  clientId?: string;
  clientUserId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;

    req.userId = decoded.userId;
    req.email = decoded.email;
    req.userType = decoded.userType;
    req.workspaceId = decoded.workspaceId;
    req.roles = decoded.roles || [];
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

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

export const authenticateClient = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;

    if (decoded.userType !== 'client_user') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Client portal access required' } });
    }

    req.clientId = decoded.clientId;
    req.clientUserId = decoded.userId;
    req.email = decoded.email;
    req.userType = decoded.userType;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

// Postgres enum arrays are serialized as "{a,b}" strings by the pg driver;
// normalize them (or any non-array value) into a real array.
export const normalizeRoles = (roles: any): string[] => {
  if (Array.isArray(roles)) return roles;
  if (typeof roles === 'string') {
    return roles.replace(/^\{|\}$/g, '').split(',').map(r => r.trim()).filter(Boolean);
  }
  return [];
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRoles = normalizeRoles(req.roles);
    if (!userRoles.some(role => roles.includes(role))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
};
