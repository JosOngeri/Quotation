import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createProductSchema, updateProductSchema } from '../validations/products';
import { env } from '../config/env-validation';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// List products (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = `
      SELECT * FROM product 
      WHERE workspace_id = $1
    `;
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR sku ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching products' } 
    });
  }
});

// Create product (tenant admin, procurement)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createProductSchema), async (req, res) => {
  try {
    const { sku, name, description, unit, category, specification } = req.body;

    const productId = uuidv4();
    const result = await pool.query(
      `INSERT INTO product (id, workspace_id, sku, name, description, unit, category, specification) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [productId, req.workspaceId, sku, name, description, unit, category, specification]
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
router.get('/:id', authenticateTenant, async (req, res) => {
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
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateProductSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, unit, category, specification, isActive } = req.body;

    const result = await pool.query(
      `UPDATE product 
       SET sku = COALESCE($1, sku),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           unit = COALESCE($4, unit),
           category = COALESCE($5, category),
           specification = COALESCE($6, specification),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND workspace_id = $9
       RETURNING *`,
      [sku, name, description, unit, category, specification, isActive, id, req.workspaceId]
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
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
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