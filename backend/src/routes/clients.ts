import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createClientSchema, updateClientSchema } from '../validations/clients';
import { env } from '../config/env-validation';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// List clients (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { search, page, pageSize, sortBy, sortOrder } = req.query;
    
    // Parse pagination parameters
    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    // Build WHERE clause
    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR contact_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM client 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM client 
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
    console.error('List clients error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching clients' } 
    });
  }
});

/**
 * @swagger
 * /api/v1/clients:
 *   post:
 *     summary: Create new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Acme Corporation"
 *               contactName:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@acme.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City"
 *               taxId:
 *                 type: string
 *                 example: "TAX123456"
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Client'
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
// Create client (tenant admin, estimator, procurement)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), validateRequest(createClientSchema), async (req, res) => {
  try {
    const { name, contactName, email, phone, address, taxId } = req.body;

    const clientId = uuidv4();
    const result = await pool.query(
      `INSERT INTO client (id, workspace_id, name, contact_name, email, phone, address, tax_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [clientId, req.workspaceId, name, contactName, email, phone, address, taxId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create client error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating client' } 
    });
  }
});

// Get client by ID (tenant)
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM client WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Client not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching client' } 
    });
  }
});

// Update client (tenant admin, estimator, procurement)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), validateRequest(updateClientSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactName, email, phone, address, taxId, isActive } = req.body;

    const result = await pool.query(
      `UPDATE client 
       SET name = COALESCE($1, name),
           contact_name = COALESCE($2, contact_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           tax_id = COALESCE($6, tax_id),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND workspace_id = $9
       RETURNING *`,
      [name, contactName, email, phone, address, taxId, isActive, id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Client not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating client' } 
    });
  }
});

// Delete client (tenant admin only)
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM client WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Client deleted successfully' } });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting client' } 
    });
  }
});

export default router;