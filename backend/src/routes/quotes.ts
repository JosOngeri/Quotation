import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createQuoteSchema, updateQuoteSchema } from '../validations/quotes';
import { env } from '../config/env-validation';
import { PDFGenerator } from '../services/pdf-generator';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// Initialize PDF generator
const pdfGenerator = new PDFGenerator(pool);

// List quotes (tenant)
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
    let whereClause = 'WHERE q.workspace_id = $1';
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND q.status = $${paramCount}`;
      params.push(status);
    }

    if (clientId) {
      paramCount++;
      whereClause += ` AND q.client_id = $${paramCount}`;
      params.push(clientId);
    }

    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM quote q 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT q.*, c.name as client_name 
      FROM quote q 
      JOIN client c ON q.client_id = c.id 
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
    console.error('List quotes error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching quotes' } 
    });
  }
});

/**
 * @swagger
 * /api/v1/quotes:
 *   post:
 *     summary: Create new quote
 *     tags: [Quotes]
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
 *               title:
 *                 type: string
 *                 example: "Project Quote"
 *               currency:
 *                 type: string
 *                 default: "KES"
 *               validUntil:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *     responses:
 *       201:
 *         description: Quote created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Quote'
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
// Create quote (estimator, tenant admin)
router.post('/', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(createQuoteSchema), async (req, res) => {
  try {
    const { clientId, title, currency, validUntil } = req.body;

    const quoteId = uuidv4();
    const result = await pool.query(
      `INSERT INTO quote (id, workspace_id, client_id, title, currency, valid_until, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [quoteId, req.workspaceId, clientId, title, currency || 'KES', validUntil, req.userId]
    );

    // Create initial revision
    const revisionId = uuidv4();
    await pool.query(
      `INSERT INTO quote_revision (id, quote_id, version, total_amount_minor, tax_amount_minor, subtotal_amount_minor, created_by) 
       VALUES ($1, $2, 1, 0, 0, 0, $3)`,
      [revisionId, quoteId, req.userId]
    );

    await pool.query(
      'UPDATE quote SET current_revision_id = $1 WHERE id = $2',
      [revisionId, quoteId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating quote' } 
    });
  }
});

// Get quote by ID (tenant)
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT q.*, c.name as client_name 
       FROM quote q 
       JOIN client c ON q.client_id = c.id 
       WHERE q.id = $1 AND q.workspace_id = $2`,
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Quote not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching quote' } 
    });
  }
});

// Update quote (estimator, tenant admin)
router.put('/:id', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(updateQuoteSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, currency, validUntil, status } = req.body;

    const result = await pool.query(
      `UPDATE quote 
       SET title = COALESCE($1, title),
           currency = COALESCE($2, currency),
           valid_until = COALESCE($3, valid_until),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND workspace_id = $6
       RETURNING *`,
      [title, currency, validUntil, status, id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Quote not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating quote' } 
    });
  }
});

/**
 * @swagger
 * /api/v1/quotes/{id}/pdf:
 *   get:
 *     summary: Generate PDF for quote
 *     tags: [Quotes]
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
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Quote not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/pdf', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;

    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateQuotePDF(id, workspaceId);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quote-${id.substring(0, 8)}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: {
        code: 'PDF_GENERATION_ERROR',
        message: 'Failed to generate PDF'
      }
    });
  }
});

// Delete quote (tenant admin only)
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM quote WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Quote deleted successfully' } });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting quote' } 
    });
  }
});

export default router;
