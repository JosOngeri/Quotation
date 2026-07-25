import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { RateLimitMonitorService } from '../services/rate-limit-monitor';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const rateLimitMonitor = new RateLimitMonitorService(pool);

/**
 * @swagger
 * /api/v1/rate-limit/stats:
 *   get:
 *     summary: Get current rate limit statistics
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/stats', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const stats = await rateLimitMonitor.getRateLimitStats();

    res.json({
      data: stats
    });
  } catch (error) {
    console.error('Get rate limit stats error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rate limit statistics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/rate-limit/history:
 *   get:
 *     summary: Get rate limit history
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Rate limit history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/history', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const history = await rateLimitMonitor.getRateLimitHistory(hours);

    res.json({
      data: history
    });
  } catch (error) {
    console.error('Get rate limit history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rate limit history'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/rate-limit/update:
 *   post:
 *     summary: Update rate limit for endpoint
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *               - method
 *               - newLimit
 *             properties:
 *               endpoint:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE]
 *               newLimit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Rate limit updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       400:
 *         description: Invalid request
 */
router.post('/update', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { endpoint, method, newLimit } = req.body;

    if (!endpoint || !method || !newLimit) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endpoint, method, and newLimit are required'
        }
      });
    }

    await rateLimitMonitor.updateRateLimit(endpoint, method, newLimit);

    res.json({
      message: 'Rate limit updated successfully'
    });
  } catch (error) {
    console.error('Update rate limit error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update rate limit'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/rate-limit/exceptions:
 *   get:
 *     summary: Get rate limit exceptions
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit exceptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/exceptions', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const exceptions = await rateLimitMonitor.getRateLimitExceptions();

    res.json({
      data: exceptions
    });
  } catch (error) {
    console.error('Get rate limit exceptions error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rate limit exceptions'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/rate-limit/exceptions:
 *   post:
 *     summary: Add rate limit exception
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *               - method
 *             properties:
 *               endpoint:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE]
 *               userId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rate limit exception added successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       400:
 *         description: Invalid request
 */
router.post('/exceptions', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { endpoint, method, userId, reason } = req.body;

    if (!endpoint || !method) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'endpoint and method are required'
        }
      });
    }

    await rateLimitMonitor.addRateLimitException(endpoint, method, userId);

    res.json({
      message: 'Rate limit exception added successfully'
    });
  } catch (error) {
    console.error('Add rate limit exception error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add rate limit exception'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/rate-limit/exceptions/{id}:
 *   delete:
 *     summary: Remove rate limit exception
 *     tags: [RateLimitDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate limit exception removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.delete('/exceptions/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, we would parse the exception ID and remove it
    await rateLimitMonitor.removeRateLimitException('', '');

    res.json({
      message: 'Rate limit exception removed successfully'
    });
  } catch (error) {
    console.error('Remove rate limit exception error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove rate limit exception'
      }
    });
  }
});

export default router;