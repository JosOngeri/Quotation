import { Request, Response, NextFunction } from 'express';
import logger from '../config/logging';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  workspaceId?: string;
  ip?: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private maxMetricsPerKey: number = 1000;
  private maxRequestMetrics: number = 10000;

  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only the most recent metrics
    if (metrics.length > this.maxMetricsPerKey) {
      metrics.shift();
    }

    logger.debug({ metric }, 'Performance metric recorded');
  }

  recordRequestMetric(req: Request, res: Response, responseTime: number): void {
    const metric: RequestMetrics = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userId: (req as any).userId,
      workspaceId: (req as any).workspaceId,
      ip: req.ip
    };

    this.requestMetrics.push(metric);

    // Keep only the most recent request metrics
    if (this.requestMetrics.length > this.maxRequestMetrics) {
      this.requestMetrics.shift();
    }
  }

  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return this.metrics;
  }

  getRequestMetrics(): RequestMetrics[] {
    return this.requestMetrics;
  }

  getAverageResponseTime(url?: string): number {
    const filteredMetrics = url
      ? this.requestMetrics.filter(m => m.url === url)
      : this.requestMetrics;

    if (filteredMetrics.length === 0) {
      return 0;
    }

    const total = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / filteredMetrics.length;
  }

  getPercentileResponseTime(percentile: number, url?: string): number {
    const filteredMetrics = url
      ? this.requestMetrics.filter(m => m.url === url)
      : this.requestMetrics;

    if (filteredMetrics.length === 0) {
      return 0;
    }

    const sorted = [...filteredMetrics].sort((a, b) => a.responseTime - b.responseTime);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)].responseTime;
  }

  getErrorRate(url?: string): number {
    const filteredMetrics = url
      ? this.requestMetrics.filter(m => m.url === url)
      : this.requestMetrics;

    if (filteredMetrics.length === 0) {
      return 0;
    }

    const errors = filteredMetrics.filter(m => m.statusCode >= 400);
    return (errors.length / filteredMetrics.length) * 100;
  }

  getRequestCount(url?: string): number {
    return url
      ? this.requestMetrics.filter(m => m.url === url).length
      : this.requestMetrics.length;
  }

  getSlowRequests(threshold: number = 1000): RequestMetrics[] {
    return this.requestMetrics.filter(m => m.responseTime > threshold);
  }

  getPerformanceSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    slowRequests: number;
  } {
    return {
      totalRequests: this.getRequestCount(),
      averageResponseTime: this.getAverageResponseTime(),
      p95ResponseTime: this.getPercentileResponseTime(95),
      p99ResponseTime: this.getPercentileResponseTime(99),
      errorRate: this.getErrorRate(),
      slowRequests: this.getSlowRequests().length
    };
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.requestMetrics = [];
    logger.info('Performance metrics cleared');
  }

  clearRequestMetrics(): void {
    this.requestMetrics = [];
    logger.info('Request metrics cleared');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Middleware for automatic request tracking
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Record the original end function
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.recordRequestMetric(req, res, responseTime);
    
    // Add performance headers
    res.setHeader('X-Response-Time', responseTime.toString());
    
    originalEnd.apply(this, args);
  };

  next();
};

// Performance profiling decorator
export function profilePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    const startTime = Date.now();
    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric(
        `${target.constructor.name}.${propertyKey}`,
        duration,
        'ms',
        { status: 'success' }
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric(
        `${target.constructor.name}.${propertyKey}`,
        duration,
        'ms',
        { status: 'error' }
      );
      
      throw error;
    }
  };

  return descriptor;
}

export default performanceMonitor;