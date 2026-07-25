import { Router } from 'express';
import { Pool } from 'pg';
import cacheService from '../services/cache';
import { getWebSocketService } from '../index';

const router = Router();

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 checks:
 *                   type: object
 *       503:
 *         description: System is unhealthy
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      cache: 'unknown',
      websocket: 'unknown'
    }
  };

  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
      healthCheck.checks.database = 'healthy';
    } catch (error) {
      healthCheck.checks.database = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Check cache connection
    try {
      if (cacheService.isConnectedToRedis()) {
        healthCheck.checks.cache = 'healthy';
      } else {
        healthCheck.checks.cache = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.cache = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Check WebSocket service
    try {
      const wsService = getWebSocketService();
      if (wsService) {
        healthCheck.checks.websocket = 'healthy';
      } else {
        healthCheck.checks.websocket = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.websocket = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Determine overall status
    const allHealthy = Object.values(healthCheck.checks).every(status => status === 'healthy');
    healthCheck.status = allHealthy ? 'healthy' : 'degraded';

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(status).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'unhealthy';
    res.status(503).json(healthCheck);
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is ready
 *       503:
 *         description: System is not ready
 */
router.get('/ready', async (req, res) => {
  const readinessCheck = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      cache: 'unknown'
    }
  };

  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
      readinessCheck.checks.database = 'ready';
    } catch (error) {
      readinessCheck.checks.database = 'not_ready';
      readinessCheck.status = 'not_ready';
    }

    // Check cache connection (optional for readiness)
    try {
      if (cacheService.isConnectedToRedis()) {
        readinessCheck.checks.cache = 'ready';
      } else {
        readinessCheck.checks.cache = 'not_ready';
      }
    } catch (error) {
      readinessCheck.checks.cache = 'not_ready';
    }

    // Determine overall status
    const allReady = Object.values(readinessCheck.checks).every(status => status === 'ready');
    readinessCheck.status = allReady ? 'ready' : 'not_ready';

    const statusCode = readinessCheck.status === 'ready' ? 200 : 503;
    res.status(status).json(readinessCheck);
  } catch (error) {
    readinessCheck.status = 'not_ready';
    res.status(503).json(readinessCheck);
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is alive
 *       503:
 *         description: System is not alive
 */
router.get('/live', (req, res) => {
  // Simple liveness check - just check if the server is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;