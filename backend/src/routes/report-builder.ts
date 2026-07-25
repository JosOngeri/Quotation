import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { ReportBuilderService } from '../services/report-builder';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const reportBuilderService = new ReportBuilderService(pool);

/**
 * @swagger
 * /api/v1/reports/data-sources:
 *   get:
 *     summary: Get available data sources for reports
 *     tags: [ReportBuilder]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data sources retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/data-sources', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const dataSources = reportBuilderService.getAvailableDataSources();

    res.json({
      data: dataSources
    });
  } catch (error) {
    console.error('Get data sources error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve data sources'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/fields:
 *   get:
 *     summary: Get available fields for a data source
 *     tags: [ReportBuilder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dataSource
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fields retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       400:
 *         description: Invalid request
 */
router.get('/fields', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { dataSource } = req.query;

    if (!dataSource) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'dataSource is required'
        }
      });
    }

    const fields = reportBuilderService.getAvailableFields(dataSource as string);

    res.json({
      data: fields
    });
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve fields'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports:
 *   get:
 *     summary: List report definitions
 *     tags: [ReportBuilder]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report definitions listed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const reports = await reportBuilderService.listReportDefinitions(workspaceId);

    res.json({
      data: reports
    });
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list reports'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports:
 *   post:
 *     summary: Create report definition
 *     tags: [ReportBuilder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - dataSource
 *               - fields
 *               - visualization
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               dataSource:
 *                 type: object
 *               fields:
 *                 type: array
 *               filters:
 *                 type: array
 *               grouping:
 *                 type: array
 *               visualization:
 *                 type: object
 *     responses:
 *       201:
 *         description: Report created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       400:
 *         description: Invalid request
 */
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'estimator']), async (req, res) => {
  try {
    const userId = (req as any).userId;
    const workspaceId = (req as any).workspaceId;
    const report = req.body;

    const reportId = await reportBuilderService.saveReportDefinition(report, userId, workspaceId);

    res.status(201).json({
      data: {
        id: reportId,
        message: 'Report created successfully'
      }
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create report'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   get:
 *     summary: Get report definition
 *     tags: [ReportBuilder]
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
 *         description: Report retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get('/:id', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { id } = req.params;
    const report = await reportBuilderService.getReportDefinition(id);

    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json({
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get report'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   delete:
 *     summary: Delete report definition
 *     tags: [ReportBuilder]
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
 *         description: Report deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Report not found
 */
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await reportBuilderService.deleteReportDefinition(id);

    res.json({
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete report'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{id}/execute:
 *   post:
 *     summary: Execute report
 *     tags: [ReportBuilder]
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
 *         description: Report executed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.post('/:id/execute', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;

    const result = await reportBuilderService.executeReport(id, workspaceId);

    res.json({
      data: result
    });
  } catch (error) {
    console.error('Execute report error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to execute report'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/reports/{id}/export:
 *   get:
 *     summary: Export report
 *     tags: [ReportBuilder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json, pdf]
 *     responses:
 *       200:
 *         description: Report exported successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get('/:id/export', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'csv';
    const workspaceId = (req as any).workspaceId;

    const result = await reportBuilderService.exportReport(id, format, workspaceId);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);
      res.send(result);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.json`);
      res.send(result);
    } else {
      res.json({
        data: result
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export report'
      }
    });
  }
});

export default router;