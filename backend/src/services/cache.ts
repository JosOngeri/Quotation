import { createClient, RedisClientType } from 'redis';
import logger from '../config/logging';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private defaultTTL: number = 3600; // 1 hour in seconds

  async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error({ error: err }, 'Redis client error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis');
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  private checkConnection(): void {
    if (!this.isConnected || !this.client) {
      logger.warn('Redis not connected, cache operations will be skipped');
    }
  }

  async get(key: string): Promise<string | null> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const expiration = ttl || this.defaultTTL;
      await this.client.setEx(key, expiration, value);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error({ error, pattern }, 'Cache delete pattern error');
      return 0;
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Cache getJSON error');
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    this.checkConnection();
    
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const stringValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      await this.client.setEx(key, expiration, stringValue);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache setJSON error');
      return false;
    }
  }

  // Cache invalidation helpers
  async invalidateUser(userId: string): Promise<void> {
    await this.delPattern(`user:${userId}:*`);
    await this.delPattern(`workspace:*:user:${userId}`);
  }

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    await this.delPattern(`workspace:${workspaceId}:*`);
  }

  async invalidateQuote(quoteId: string): Promise<void> {
    await this.delPattern(`quote:${quoteId}:*`);
  }

  async invalidateProject(projectId: string): Promise<void> {
    await this.delPattern(`project:${projectId}:*`);
  }

  async invalidateClient(clientId: string): Promise<void> {
    await this.delPattern(`client:${clientId}:*`);
  }

  // Cache key generators
  static userKey(userId: string): string {
    return `user:${userId}`;
  }

  static workspaceKey(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  static quoteKey(quoteId: string): string {
    return `quote:${quoteId}`;
  }

  static projectKey(projectId: string): string {
    return `project:${projectId}`;
  }

  static clientKey(clientId: string): string {
    return `client:${clientId}`;
  }

  static userListKey(workspaceId: string, page: number, pageSize: number): string {
    return `workspace:${workspaceId}:users:page:${page}:size:${pageSize}`;
  }

  static quoteListKey(workspaceId: string, page: number, pageSize: number): string {
    return `workspace:${workspaceId}:quotes:page:${page}:size:${pageSize}`;
  }

  static productCatalogKey(workspaceId: string): string {
    return `workspace:${workspaceId}:products:catalog`;
  }

  // Cache statistics
  async getStats(): Promise<{ connected: boolean; keys: number }> {
    if (!this.client || !this.isConnected) {
      return { connected: false, keys: 0 };
    }

    try {
      const info = await this.client.info('keyspace');
      const keysMatch = info.match(/keys=(\d+)/);
      const keys = keysMatch ? parseInt(keysMatch[1]) : 0;
      
      return {
        connected: this.isConnected,
        keys
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return { connected: false, keys: 0 };
    }
  }

  isConnectedToRedis(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;