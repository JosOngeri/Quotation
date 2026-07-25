import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
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
    
    // Parse pagination parameters
    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    // Build WHERE clause
    let whereClause = 'WHERE p.workspace_id = $1';
    const params: any[] = [req.workspaceId];
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

    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM project p 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
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

    // Build pagination result
    const paginatedResult = buildPaginationResult(result.rows, total, pagination);

    res.json(paginatedResult);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching projects' } 
    });
  }
});

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, title]
 *             properties:
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               quoteId:
 *                 type: string
 *                 format: uuid
 *                 example: "660e8400-e29b-41d4-a716-446655440000"
 *               title:
 *                 type: string
 *                 example: "Construction Project"
 *               status:
 *                 type: string
 *                 enum: [planning, active, on_hold, completed, cancelled]
 *                 default: "planning"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               targetEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               quotedTotalMinor:
 *                 type: integer
 *                 example: 1000000
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create project (tenant admin, estimator, project manager)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'project_manager']), validateRequest(createProjectSchema), async (req, res) => {
  try {
    const { clientId, quoteId, title, status, startDate, targetEndDate, quotedTotalMinor } = req.body;

    const projectId = uuidv4();
    const result = await pool.query(
      `INSERT INTO project (id, workspace_id, client_id, quote_id, title, status, start_date, target_end_date, quoted_total_minor, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [projectId, req.workspaceId, clientId, quoteId, title, status || 'planning', startDate, targetEndDate, quotedTotalMinor, req.userId]
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
      [id, req.workspaceId]
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
      [title, status, startDate, targetEndDate, actualEndDate, actualTotalMinor, id, req.workspaceId]
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
      [id, req.workspaceId]
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
      [costEventId, id, quoteItemId, eventType, description, quantity, unit, unitCostMinor, currency || 'KES', totalCostMinor, supplierId, invoiceReference, documentUrl, reason, req.userId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create cost event error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating cost event' } 
    });
  }
});

export default router;