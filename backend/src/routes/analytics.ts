import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const analyticsService = new AnalyticsService(pool);

/**
 * @swagger
 * /api/v1/analytics/quotes:
 *   get:
 *     summary: Get quote analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Quote analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/quotes', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getQuoteAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    res.json({
      data: analytics
    });
  } catch (error) {
    console.error('Get quote analytics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve quote analytics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/projects:
 *   get:
 *     summary: Get project analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Project analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/projects', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getProjectAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    res.json({
      data: analytics
    });
  } catch (error) {
    console.error('Get project analytics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve project analytics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/clients:
 *   get:
 *     summary: Get client analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Client analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/clients', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getClientAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    res.json({
      data: analytics
    });
  } catch (error) {
    console.error('Get client analytics error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve client analytics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/summary:
 *   get:
 *     summary: Get analytics summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: YYYY-MM
 *     responses:
 *       200:
 *         description: Analytics summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/summary', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { month } = req.query;

    const summary = await analyticsService.getAnalyticsSummary(
      workspaceId,
      month as string
    );

    res.json({
      data: summary
    });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve analytics summary'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/run-etl:
 *   post:
 *     summary: Run analytics ETL pipeline
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ETL pipeline executed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/run-etl', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;

    await analyticsService.runETLPipeline(workspaceId);

    res.json({
      message: 'ETL pipeline executed successfully'
    });
  } catch (error) {
    console.error('Run ETL pipeline error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to run ETL pipeline'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/conversion-rates:
 *   get:
 *     summary: Get quote conversion rates
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Conversion rates retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/conversion-rates', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getQuoteAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    // Calculate conversion rates
    const totalQuotes = analytics.length;
    const convertedQuotes = analytics.filter(a => a.converted_to_project).length;
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

    res.json({
      data: {
        totalQuotes,
        convertedQuotes,
        conversionRate,
        analytics
      }
    });
  } catch (error) {
    console.error('Get conversion rates error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve conversion rates'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/average-values:
 *   get:
 *     summary: Get average quote values
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Average values retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/average-values', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getQuoteAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    // Calculate average values
    const totalAmount = analytics.reduce((sum, a) => sum + parseFloat(a.total_amount_minor), 0);
    const averageValue = analytics.length > 0 ? totalAmount / analytics.length : 0;

    res.json({
      data: {
        totalAmount,
        averageValue,
        totalQuotes: analytics.length
      }
    });
  } catch (error) {
    console.error('Get average values error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve average values'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/analytics/win-loss-ratios:
 *   get:
 *     summary: Get win/loss ratios
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Win/loss ratios retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/win-loss-ratios', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getQuoteAnalytics(
      workspaceId,
      startDate as string,
      endDate as string
    );

    // Calculate win/loss ratios
    const wonQuotes = analytics.filter(a => a.status === 'accepted').length;
    const lostQuotes = analytics.filter(a => a.status === 'rejected').length;
    const pendingQuotes = analytics.filter(a => a.status === 'pending').length;
    const totalQuotes = analytics.length;

    const winRate = totalQuotes > 0 ? (wonQuotes / totalQuotes) * 100 : 0;
    const lossRate = totalQuotes > 0 ? (lostQuotes / totalQuotes) * 100 : 0;

    res.json({
      data: {
        wonQuotes,
        lostQuotes,
        pendingQuotes,
        totalQuotes,
        winRate,
        lossRate
      }
    });
  } catch (error) {
    console.error('Get win/loss ratios error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve win/loss ratios'
      }
    });
  }
});

export default router;