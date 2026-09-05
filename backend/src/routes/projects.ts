import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createProjectSchema, updateProjectSchema } from '../validations/projects';
import { env } from '../config/env-validation';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

// List projects (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { status, clientId, page, pageSize, sortBy, sortOrder } = req.query;

    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    let whereClause = 'WHERE p.workspace_id = $1';
    const params: any[] = [((req as AuthRequest).workspaceId as string)];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (clientId) {
      paramCount++;
      whereClause += ` AND p.client_id = $${paramCount}`;
      params.push(clientId);
    }

    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM project p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT p.*, c.name as client_name
      FROM project p
      JOIN client c ON p.client_id = c.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(dataQuery, params);

    const paginatedResult = buildPaginationResult(result.rows, total, pagination);

    res.json(paginatedResult);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching projects' }
    });
  }
});

// Create project (tenant admin, estimator, project manager)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'project_manager']), validateRequest(createProjectSchema), async (req, res) => {
  try {
    const { clientId, quoteId, title, status, startDate, targetEndDate, quotedTotalMinor } = req.body;

    const projectId = uuidv4();
    const result = await pool.query(
      `INSERT INTO project (id, workspace_id, client_id, quote_id, title, status, start_date, target_end_date, quoted_total_minor, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [projectId, ((req as AuthRequest).workspaceId as string), clientId, quoteId, title, status || 'planning', startDate, targetEndDate, quotedTotalMinor, ((req as AuthRequest).userId as string)]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating project' }
    });
  }
});

// Get project by ID (tenant)
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.name as client_name
       FROM project p
       JOIN client c ON p.client_id = c.id
       WHERE p.id = $1 AND p.workspace_id = $2`,
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching project' }
    });
  }
});

// Update project (tenant admin, project manager)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'project_manager']), validateRequest(updateProjectSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, startDate, targetEndDate, actualEndDate, actualTotalMinor } = req.body;

    const result = await pool.query(
      `UPDATE project
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           start_date = COALESCE($3, start_date),
           target_end_date = COALESCE($4, target_end_date),
           actual_end_date = COALESCE($5, actual_end_date),
           actual_total_minor = COALESCE($6, actual_total_minor),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND workspace_id = $8
       RETURNING *`,
      [title, status, startDate, targetEndDate, actualEndDate, actualTotalMinor, id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating project' }
    });
  }
});

// Delete project (tenant admin only)
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM project WHERE id = $1 AND workspace_id = $2',
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    res.json({ data: { message: 'Project deleted successfully' } });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting project' }
    });
  }
});

// Get cost events for project (tenant)
router.get('/:id/cost-events', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ce.*, s.name as supplier_name
       FROM cost_event ce
       LEFT JOIN supplier s ON ce.supplier_id = s.id
       WHERE ce.project_id = $1
       ORDER BY ce.created_at DESC`,
      [id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Get cost events error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching cost events' }
    });
  }
});

// Create cost event (tenant admin, project manager, procurement)
router.post('/:id/cost-events', authenticateTenant, requireRole(['tenant_admin', 'project_manager', 'procurement']), async (req, res) => {
  try {
    const { id } = req.params;
    const { quoteItemId, eventType, description, quantity, unit, unitCostMinor, currency, totalCostMinor, supplierId, invoiceReference, documentUrl, reason } = req.body;

    const costEventId = uuidv4();
    const result = await pool.query(
      `INSERT INTO cost_event (id, project_id, quote_item_id, event_type, description, quantity, unit, unit_cost_minor, currency, total_cost_minor, supplier_id, invoice_reference, document_url, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [costEventId, id, quoteItemId, eventType, description, quantity, unit, unitCostMinor, currency || 'KES', totalCostMinor, supplierId, invoiceReference, documentUrl, reason, ((req as AuthRequest).userId as string)]
    );

    try {
      const { getWebSocketService } = require('../index');
      getWebSocketService()?.notifyProjectUpdate(id, ((req as AuthRequest).workspaceId as string) as string, { type: 'cost_event' });
    } catch {}

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create cost event error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating cost event' }
    });
  }
});

/**
 * @swagger
 * /api/v1/projects/{id}/cost-summary:
 *   get:
 *     summary: Get project cost summary
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cost summary retrieved successfully
 */
router.get('/:id/cost-summary', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const projectResult = await pool.query(
      `SELECT quoted_total_minor FROM project WHERE id = $1 AND workspace_id = $2`,
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    const quotedTotalMinor = projectResult.rows[0].quoted_total_minor || 0;

    const costResult = await pool.query(
      `SELECT event_type, COALESCE(SUM(total_cost_minor), 0) as total
       FROM cost_event
       WHERE project_id = $1
       GROUP BY event_type`,
      [id]
    );

    const byEventType: Record<string, number> = {
      actual: 0,
      substitution: 0,
      addition: 0
    };

    let actualTotalMinor = 0;
    for (const row of costResult.rows) {
      const total = parseInt(row.total);
      byEventType[row.event_type] = total;
      actualTotalMinor += total;
    }

    await pool.query(
      `UPDATE project SET actual_total_minor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [actualTotalMinor, id]
    );

    res.json({
      data: {
        quoted_total_minor: quotedTotalMinor,
        actual_total_minor: actualTotalMinor,
        variance_minor: quotedTotalMinor - actualTotalMinor,
        by_event_type: byEventType
      }
    });
  } catch (error) {
    console.error('Get cost summary error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching cost summary' }
    });
  }
});

/**
 * @swagger
 * /api/v1/projects/{id}/cost-events/{eventId}/approve:
 *   post:
 *     summary: Approve a cost event
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cost event approved successfully
 */
router.post('/:id/cost-events/:eventId/approve', authenticateTenant, requireRole(['tenant_admin', 'project_manager']), async (req, res) => {
  try {
    const { id, eventId } = req.params;

    const result = await pool.query(
      `UPDATE cost_event
       SET approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND project_id = $3
         AND EXISTS (
           SELECT 1 FROM project p
           WHERE p.id = cost_event.project_id AND p.workspace_id = $4
         )
       RETURNING *`,
      [((req as AuthRequest).userId as string), eventId, id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Cost event not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Approve cost event error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred approving cost event' }
    });
  }
});

export default router;
