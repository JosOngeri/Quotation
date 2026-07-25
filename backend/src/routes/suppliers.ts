import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createSupplierSchema, updateSupplierSchema } from '../validations/suppliers';
import { env } from '../config/env-validation';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// List suppliers (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT * FROM supplier 
      WHERE workspace_id = $1
    `;
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR contact_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List suppliers error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching suppliers' } 
    });
  }
});

// Create supplier (tenant admin, procurement)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createSupplierSchema), async (req, res) => {
  try {
    const { name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId } = req.body;

    const supplierId = uuidv4();
    const result = await pool.query(
      `INSERT INTO supplier (id, workspace_id, name, contact_name, email, phone, address, payment_terms, lead_time_days, tax_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [supplierId, req.workspaceId, name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create supplier error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating supplier' } 
    });
  }
});

// Get supplier by ID (tenant)
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM supplier WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Supplier not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching supplier' } 
    });
  }
});

// Update supplier (tenant admin, procurement)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateSupplierSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId, isActive } = req.body;

    const result = await pool.query(
      `UPDATE supplier 
       SET name = COALESCE($1, name),
           contact_name = COALESCE($2, contact_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           payment_terms = COALESCE($6, payment_terms),
           lead_time_days = COALESCE($7, lead_time_days),
           tax_id = COALESCE($8, tax_id),
           is_active = COALESCE($9, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND workspace_id = $11
       RETURNING *`,
      [name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId, isActive, id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Supplier not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating supplier' } 
    });
  }
});

// Delete supplier (tenant admin only)
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM supplier WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Supplier deleted successfully' } });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting supplier' } 
    });
  }
});

export default router;