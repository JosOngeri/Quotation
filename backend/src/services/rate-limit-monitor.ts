import { Pool } from 'pg';

interface RateLimitStats {
  endpoint: string;
  method: string;
  totalRequests: number;
  blockedRequests: number;
  rateLimit: number;
  currentUsage: number;
  resetTime: Date;
}

export class RateLimitMonitorService {
  private pool: Pool;
  private rateLimitData: Map<string, any> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getRateLimitStats(): Promise<RateLimitStats[]> {
    try {
      // Get rate limit data from in-memory storage
      const stats: RateLimitStats[] = [];
      
      // Common endpoints to monitor
      const endpoints = [
        { path: '/api/v1/auth/login', method: 'POST', limit: 5 },
        { path: '/api/v1/quotes', method: 'GET', limit: 100 },
        { path: '/api/v1/quotes', method: 'POST', limit: 20 },
        { path: '/api/v1/clients', method: 'GET', limit: 100 },
        { path: '/api/v1/projects', method: 'GET', limit: 100 },
        { path: '/api/v1/files', method: 'POST', limit: 10 }
      ];

      for (const endpoint of endpoints) {
        const key = `${endpoint.method}:${endpoint.path}`;
        const data = this.rateLimitData.get(key) || {
          totalRequests: 0,
          blockedRequests: 0,
          resetTime: new Date(Date.now() + 60000) // 1 minute window
        };

        stats.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          totalRequests: data.totalRequests,
          blockedRequests: data.blockedRequests,
          rateLimit: endpoint.limit,
          currentUsage: data.totalRequests,
          resetTime: data.resetTime
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return [];
    }
  }

  async getRateLimitHistory(hours: number = 24): Promise<any[]> {
    try {
      // In a real implementation, this would query a rate limit log table
      // For now, return sample data
      const history = [];
      const now = new Date();
      
      for (let i = 0; i < hours; i++) {
        const timestamp = new Date(now.getTime() - (i * 3600000));
        history.push({
          timestamp,
          totalRequests: Math.floor(Math.random() * 1000),
          blockedRequests: Math.floor(Math.random() * 50),
          topEndpoints: [
            { endpoint: '/api/v1/quotes', requests: Math.floor(Math.random() * 500) },
            { endpoint: '/api/v1/projects', requests: Math.floor(Math.random() * 300) }
          ]
        });
      }

      return history;
    } catch (error) {
      console.error('Error getting rate limit history:', error);
      return [];
    }
  }

  async updateRateLimit(endpoint: string, method: string, newLimit: number): Promise<void> {
    try {
      // In a real implementation, this would update the rate limit configuration
      // For now, just log the change
      console.log(`Rate limit updated for ${method} ${endpoint}: ${newLimit} requests/minute`);
    } catch (error) {
      console.error('Error updating rate limit:', error);
    }
  }

  async addRateLimitException(endpoint: string, method: string, userId?: string): Promise<void> {
    try {
      // In a real implementation, this would add an exception to the rate limiting
      console.log(`Rate limit exception added for ${method} ${endpoint}${userId ? ` for user ${userId}` : ''}`);
    } catch (error) {
      console.error('Error adding rate limit exception:', error);
    }
  }

  async removeRateLimitException(endpoint: string, method: string, userId?: string): Promise<void> {
    try {
      // In a real implementation, this would remove an exception
      console.log(`Rate limit exception removed for ${method} ${endpoint}${userId ? ` for user ${userId}` : ''}`);
    } catch (error) {
      console.error('Error removing rate limit exception:', error);
    }
  }

  async getRateLimitExceptions(): Promise<any[]> {
    try {
      // In a real implementation, this would return configured exceptions
      return [
        {
          id: '1',
          endpoint: '/api/v1/quotes',
          method: 'GET',
          userId: 'admin-user-id',
          reason: 'Admin access',
          createdAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error getting rate limit exceptions:', error);
      return [];
    }
  }

  // Simulate rate limit tracking (in production, this would be done by the rate limiter middleware)
  trackRequest(endpoint: string, method: string, blocked: boolean = false): void {
    const key = `${method}:${endpoint}`;
    const data = this.rateLimitData.get(key) || {
      totalRequests: 0,
      blockedRequests: 0,
      resetTime: new Date(Date.now() + 60000)
    };

    data.totalRequests++;
    if (blocked) {
      data.blockedRequests++;
    }

    this.rateLimitData.set(key, data);
  }

  // Reset rate limit data (called every minute)
  resetRateLimits(): void {
    const now = new Date();
    for (const [key, data] of this.rateLimitData.entries()) {
      if (now >= data.resetTime) {
        this.rateLimitData.set(key, {
          totalRequests: 0,
          blockedRequests: 0,
          resetTime: new Date(now.getTime() + 60000)
        });
      }
    }
  }
}