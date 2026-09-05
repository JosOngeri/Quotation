import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createProductSchema, updateProductSchema } from '../validations/products';
import { env } from '../config/env-validation';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// Verify a category or variety belongs to the workspace
async function belongsToWorkspace(table: 'product_category' | 'product_variety', id: string, workspaceId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM ${table} WHERE id = $1 AND workspace_id = $2`,
    [id, workspaceId]
  );
  return result.rows.length > 0;
}

// List products (tenant)
router.get('/', authenticateTenant, async (req: AuthRequest, res) => {
  try {
    const { search, category, categoryId, varietyId, page, pageSize, sortBy, sortOrder } = req.query;

    // Parse pagination parameters
    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    let whereClause = 'WHERE p.workspace_id = $1';
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    if (categoryId) {
      paramCount++;
      whereClause += ` AND p.category_id = $${paramCount}`;
      params.push(categoryId);
    }

    if (varietyId) {
      paramCount++;
      whereClause += ` AND p.variety_id = $${paramCount}`;
      params.push(varietyId);
    }

    // Prefix sort column with p. to avoid ambiguity with joined tables
    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder)
      .replace(/^ORDER BY /, 'ORDER BY p.');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT p.*, pc.name as category_name, pv.name as variety_name
      FROM product p
      LEFT JOIN product_category pc ON p.category_id = pc.id
      LEFT JOIN product_variety pv ON p.variety_id = pv.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(dataQuery, params);
    const paginatedResult = buildPaginationResult(result.rows, total, pagination);

    res.json(paginatedResult);
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching products' } 
    });
  }
});

// Create product (tenant admin, procurement)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createProductSchema), async (req: AuthRequest, res) => {
  try {
    const { sku, name, description, unit, category, specification, categoryId, varietyId } = req.body;

    if (categoryId && !(await belongsToWorkspace('product_category', categoryId, req.workspaceId!))) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Category not found in workspace' }
      });
    }
    if (varietyId && !(await belongsToWorkspace('product_variety', varietyId, req.workspaceId!))) {
      return res.status(400).json({
        error: { code: 'INVALID_VARIETY', message: 'Variety not found in workspace' }
      });
    }

    const productId = uuidv4();
    const result = await pool.query(
      `INSERT INTO product (id, workspace_id, sku, name, description, unit, category, specification, category_id, variety_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [productId, req.workspaceId, sku, name, description, unit, category, specification, categoryId || null, varietyId || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: { code: 'DUPLICATE_SKU', message: 'Product SKU already exists in workspace' } 
      });
    }
    console.error('Create product error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating product' } 
    });
  }
});

// Get product by ID (tenant)
router.get('/:id', authenticateTenant, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM product WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Product not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching product' } 
    });
  }
});

// Update product (tenant admin, procurement)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateProductSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, unit, category, specification, isActive, categoryId, varietyId } = req.body;

    if (categoryId && !(await belongsToWorkspace('product_category', categoryId, req.workspaceId!))) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Category not found in workspace' }
      });
    }
    if (varietyId && !(await belongsToWorkspace('product_variety', varietyId, req.workspaceId!))) {
      return res.status(400).json({
        error: { code: 'INVALID_VARIETY', message: 'Variety not found in workspace' }
      });
    }

    const categoryIdProvided = categoryId !== undefined;
    const varietyIdProvided = varietyId !== undefined;
    const result = await pool.query(
      `UPDATE product 
       SET sku = COALESCE($1, sku),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           unit = COALESCE($4, unit),
           category = COALESCE($5, category),
           specification = COALESCE($6, specification),
           is_active = COALESCE($7, is_active),
           category_id = CASE WHEN $8 THEN $9 ELSE category_id END,
           variety_id = CASE WHEN $10 THEN $11 ELSE variety_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND workspace_id = $13
       RETURNING *`,
      [
        sku, name, description, unit, category, specification, isActive,
        categoryIdProvided, categoryIdProvided ? categoryId : null,
        varietyIdProvided, varietyIdProvided ? varietyId : null,
        id, req.workspaceId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Product not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: { code: 'DUPLICATE_SKU', message: 'Product SKU already exists in workspace' } 
      });
    }
    console.error('Update product error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating product' } 
    });
  }
});

// Delete product (tenant admin only)
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM product WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Product deleted successfully' } });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting product' } 
    });
  }
});

export default router;