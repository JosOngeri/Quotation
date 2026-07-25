import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { AIService } from '../services/ai-service';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const aiService = new AIService(pool);

/**
 * @swagger
 * /api/v1/ai/quote-recommendation:
 *   post:
 *     summary: Get AI-powered quote value recommendations
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - productIds
 *             properties:
 *               clientId:
 *                 type: string
 *                 format: uuid
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Quote recommendations generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/quote-recommendation', authenticateTenant, requireRole(['tenant_admin', 'estimator']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { clientId, productIds } = req.body;

    if (!clientId || !productIds) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'clientId and productIds are required'
        }
      });
    }

    const recommendations = await aiService.recommendQuoteValues(workspaceId, clientId, productIds);

    res.json({
      data: recommendations
    });
  } catch (error) {
    console.error('Quote recommendation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate quote recommendations'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/ai/risk-assessment:
 *   post:
 *     summary: Get AI-powered project risk assessment
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Risk assessment completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/risk-assessment', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId is required'
        }
      });
    }

    const riskAssessment = await aiService.assessProjectRisk(projectId);

    res.json({
      data: riskAssessment
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to assess project risk'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/ai/cost-overrun-prediction:
 *   post:
 *     summary: Get AI-powered cost overrun prediction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cost overrun prediction completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/cost-overrun-prediction', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId is required'
        }
      });
    }

    const prediction = await aiService.predictCostOverrun(projectId);

    res.json({
      data: prediction
    });
  } catch (error) {
    console.error('Cost overrun prediction error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to predict cost overrun'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/ai/insights:
 *   get:
 *     summary: Get AI-powered insights
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insights generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/insights', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;

    const insights = await aiService.generateInsights(workspaceId);

    res.json({
      data: insights
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate insights'
      }
    });
  }
});

export default router;