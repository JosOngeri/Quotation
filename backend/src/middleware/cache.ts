import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cache';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if Redis is not connected
    if (!cacheService.isConnectedToRedis()) {
      return next();
    }

    // Skip cache if specified
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateDefaultCacheKey(req);

    try {
      // Try to get cached response
      const cachedData = await cacheService.getJSON(cacheKey);
      
      if (cachedData) {
        // Return cached response
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Cache miss - continue to handle request
      res.setHeader('X-Cache', 'MISS');
      
      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = function(this: Response, data: any) {
        // Cache the response
        cacheService.setJSON(cacheKey, data, options.ttl).catch(err => {
          console.error('Failed to cache response:', err);
        });
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

function generateDefaultCacheKey(req: Request): string {
  const url = req.originalUrl || req.url;
  const userId = (req as any).userId || 'anonymous';
  const workspaceId = (req as any).workspaceId || 'default';
  
  return `cache:${workspaceId}:${userId}:${url}`;
}

// Cache invalidation middleware for write operations
export const invalidateCache = (keyPatterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(this: Response, data: any) {
      // Invalidate cache patterns after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        keyPatterns.forEach(pattern => {
          cacheService.delPattern(pattern).catch(err => {
            console.error('Failed to invalidate cache:', err);
          });
        });
      }
      
      return originalJson(data);
    };

    next();
  };
};

// Common cache key generators
export const cacheKeys = {
  userList: (workspaceId: string, page: number, pageSize: number) => 
    `workspace:${workspaceId}:users:page:${page}:size:${pageSize}`,
  
  quoteList: (workspaceId: string, page: number, pageSize: number) => 
    `workspace:${workspaceId}:quotes:page:${page}:size:${pageSize}`,
  
  clientList: (workspaceId: string, page: number, pageSize: number) => 
    `workspace:${workspaceId}:clients:page:${page}:size:${pageSize}`,
  
  projectList: (workspaceId: string, page: number, pageSize: number) => 
    `workspace:${workspaceId}:projects:page:${page}:size:${pageSize}`,
  
  productCatalog: (workspaceId: string) => 
    `workspace:${workspaceId}:products:catalog`,
  
  user: (userId: string) => 
    `user:${userId}`,
  
  quote: (quoteId: string) => 
    `quote:${quoteId}`,
  
  project: (projectId: string) => 
    `project:${projectId}`,
  
  client: (clientId: string) => 
    `client:${clientId}`
};