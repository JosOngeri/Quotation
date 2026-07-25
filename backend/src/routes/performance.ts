import { Router } from 'express';
import { authenticateTenant, requireRole } from '../middleware/auth';
import performanceMonitor from '../services/performance-monitor';
import alertingService from '../services/alerting';

const router = Router();

/**
 * @swagger
 * /api/v1/performance/metrics:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/metrics', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const summary = performanceMonitor.getPerformanceSummary();
    
    // Check for alerts
    const alerts = alertingService.checkAlerts(summary);
    
    res.json({
      data: {
        summary,
        alerts,
        alertSummary: alertingService.getAlertSummary()
      }
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve performance metrics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/metrics/requests:
 *   get:
 *     summary: Get request metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/metrics/requests', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const { url } = req.query;
    const metrics = performanceMonitor.getRequestMetrics();
    
    const filteredMetrics = url
      ? metrics.filter(m => m.url === url)
      : metrics;

    res.json({
      data: filteredMetrics
    });
  } catch (error) {
    console.error('Get request metrics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve request metrics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/metrics/slow:
 *   get:
 *     summary: Get slow requests
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 1000
 *     responses:
 *       200:
 *         description: Slow requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/metrics/slow', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 1000;
    const slowRequests = performanceMonitor.getSlowRequests(threshold);
    
    res.json({
      data: slowRequests
    });
  } catch (error) {
    console.error('Get slow requests error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve slow requests'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/metrics/clear:
 *   delete:
 *     summary: Clear performance metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.delete('/metrics/clear', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    performanceMonitor.clearMetrics();
    res.json({
      message: 'Performance metrics cleared'
    });
  } catch (error) {
    console.error('Clear performance metrics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear performance metrics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts:
 *   get:
 *     summary: Get alert history
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Alert history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/alerts', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const alerts = alertingService.getAlertHistory(limit);
    
    res.json({
      data: alerts
    });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve alert history'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts/rules:
 *   get:
 *     summary: Get alert rules
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert rules retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/alerts/rules', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const rules = alertingService.getAlertRules();
    
    res.json({
      data: rules
    });
  } catch (error) {
    console.error('Get alert rules error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve alert rules'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts/rules/{name}:
 *   put:
 *     summary: Update alert rule
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert rule updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/alerts/rules/:name', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;
    
    alertingService.updateAlertRule(name, updates);
    
    res.json({
      message: 'Alert rule updated'
    });
  } catch (error) {
    console.error('Update alert rule error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update alert rule'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts/rules/{name}/enable:
 *   post:
 *     summary: Enable alert rule
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert rule enabled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/alerts/rules/:name/enable', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const { name } = req.params;
    alertingService.enableAlertRule(name);
    
    res.json({
      message: 'Alert rule enabled'
    });
  } catch (error) {
    console.error('Enable alert rule error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to enable alert rule'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts/rules/{name}/disable:
 *   post:
 *     summary: Disable alert rule
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert rule disabled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/alerts/rules/:name/disable', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    const { name } = req.params;
    alertingService.disableAlertRule(name);
    
    res.json({
      message: 'Alert rule disabled'
    });
  } catch (error) {
    console.error('Disable alert rule error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to disable alert rule'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/alerts/clear:
 *   delete:
 *     summary: Clear alert history
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert history cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.delete('/alerts/clear', authenticateTenant, requireRole(['tenant_admin']), (req, res) => {
  try {
    alertingService.clearAlertHistory();
    res.json({
      message: 'Alert history cleared'
    });
  } catch (error) {
    console.error('Clear alert history error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear alert history'
      }
    });
  }
});

export default router;