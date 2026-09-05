import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateTenant, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createSupplierSchema, updateSupplierSchema } from '../validations/suppliers';
import { env } from '../config/env-validation';
import cacheService from '../services/cache';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const createOfferSchema = z.object({
  productId: z.string().uuid(),
  unitAmountMinor: z.number().int().positive(),
  currency: z.string().max(3).optional(),
  unit: z.string().min(1).max(50),
  effectiveFrom: z.string().or(z.date()),
  effectiveTo: z.string().or(z.date()).optional().nullable(),
  minimumQuantity: z.number().int().positive().optional(),
  source: z.string().max(255).optional()
});

const updateOfferSchema = z.object({
  unitAmountMinor: z.number().int().positive().optional(),
  currency: z.string().max(3).optional(),
  unit: z.string().max(50).optional(),
  effectiveFrom: z.string().or(z.date()).optional(),
  effectiveTo: z.string().or(z.date()).optional().nullable(),
  minimumQuantity: z.number().int().positive().optional(),
  source: z.string().max(255).optional(),
  isActive: z.boolean().optional()
});

// List suppliers (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const workspaceId = ((req as AuthRequest).workspaceId as string);
    const cacheKey = `suppliers:${workspaceId}:${JSON.stringify(req.query)}`;

    if (cacheService.isConnectedToRedis()) {
      const cached = await cacheService.getJSON(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const { search } = req.query;

    let query = `
      SELECT * FROM supplier
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR contact_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const payload = { data: result.rows };

    if (cacheService.isConnectedToRedis()) {
      await cacheService.setJSON(cacheKey, payload, 60);
    }

    res.json(payload);
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
      [supplierId, ((req as AuthRequest).workspaceId as string), name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId]
    );

    if (cacheService.isConnectedToRedis()) {
      await cacheService.delPattern(`suppliers:${((req as AuthRequest).workspaceId as string)}:*`);
    }

    try {
      const { getWebSocketService } = require('../index');
      getWebSocketService()?.notifyWorkspace(((req as AuthRequest).workspaceId as string) as string, 'supplier:created', result.rows[0]);
    } catch {}

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating supplier' }
    });
  }
});

/**
 * @swagger
 * /api/v1/suppliers/offers/for-product/{productId}:
 *   get:
 *     summary: Get cheapest active offer per supplier for a product
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Offers retrieved successfully
 */
router.get('/offers/for-product/:productId', authenticateTenant, requireRole(['tenant_admin', 'estimator', 'procurement']), async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT ON (so.supplier_id) so.*, s.name as supplier_name, p.name as product_name
       FROM supplier_offer so
       JOIN supplier s ON so.supplier_id = s.id
       JOIN product p ON so.product_id = p.id
       WHERE so.product_id = $1
         AND p.workspace_id = $2
         AND so.is_active = true
         AND so.effective_from <= CURRENT_DATE
         AND (so.effective_to IS NULL OR so.effective_to >= CURRENT_DATE)
       ORDER BY so.supplier_id, so.unit_amount_minor ASC, so.created_at DESC`,
      [productId, ((req as AuthRequest).workspaceId as string)]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Get offers for product error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching offers' }
    });
  }
});

/**
 * @swagger
 * /api/v1/suppliers/{id}/offers:
 *   post:
 *     summary: Create a supplier offer
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, unitAmountMinor, unit, effectiveFrom]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               unitAmountMinor:
 *                 type: integer
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               minimumQuantity:
 *                 type: integer
 *               source:
 *                 type: string
 *     responses:
 *       201:
 *         description: Offer created successfully
 */
router.post('/:id/offers', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createOfferSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, unitAmountMinor, currency, unit, effectiveFrom, effectiveTo, minimumQuantity, source } = req.body;

    const supplierResult = await pool.query(
      'SELECT id, workspace_id FROM supplier WHERE id = $1 AND workspace_id = $2',
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Supplier not found' }
      });
    }

    const offerId = uuidv4();
    const result = await pool.query(
      `INSERT INTO supplier_offer (id, supplier_id, product_id, unit_amount_minor, currency, unit, effective_from, effective_to, minimum_quantity, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [offerId, id, productId, unitAmountMinor, currency || 'KES', unit, effectiveFrom, effectiveTo || null, minimumQuantity || 1, source || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create supplier offer error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating offer' }
    });
  }
});

/**
 * @swagger
 * /api/v1/suppliers/{id}/offers:
 *   get:
 *     summary: List offers for a supplier
 *     tags: [Suppliers]
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
 *         description: Offers retrieved successfully
 */
router.get('/:id/offers', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT so.*, p.name as product_name
       FROM supplier_offer so
       JOIN product p ON so.product_id = p.id
       WHERE so.supplier_id = $1
       ORDER BY so.created_at DESC`,
      [id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('List supplier offers error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching offers' }
    });
  }
});

/**
 * @swagger
 * /api/v1/suppliers/offers/{offerId}:
 *   put:
 *     summary: Update a supplier offer
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unitAmountMinor:
 *                 type: integer
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               minimumQuantity:
 *                 type: integer
 *               source:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Offer updated successfully
 */
router.put('/offers/:offerId', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateOfferSchema), async (req, res) => {
  try {
    const { offerId } = req.params;
    const { unitAmountMinor, currency, unit, effectiveFrom, effectiveTo, minimumQuantity, source, isActive } = req.body;

    const result = await pool.query(
      `UPDATE supplier_offer
       SET unit_amount_minor = COALESCE($1, unit_amount_minor),
           currency = COALESCE($2, currency),
           unit = COALESCE($3, unit),
           effective_from = COALESCE($4, effective_from),
           effective_to = COALESCE($5, effective_to),
           minimum_quantity = COALESCE($6, minimum_quantity),
           source = COALESCE($7, source),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
         AND EXISTS (
           SELECT 1 FROM supplier s
           WHERE s.id = supplier_offer.supplier_id AND s.workspace_id = $10
         )
       RETURNING *`,
      [unitAmountMinor, currency, unit, effectiveFrom, effectiveTo, minimumQuantity, source, isActive, offerId, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Offer not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update supplier offer error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating offer' }
    });
  }
});

/**
 * @swagger
 * /api/v1/suppliers/offers/{offerId}:
 *   delete:
 *     summary: Delete a supplier offer
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Offer deleted successfully
 */
router.delete('/offers/:offerId', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { offerId } = req.params;

    const result = await pool.query(
      `DELETE FROM supplier_offer
       WHERE id = $1
         AND EXISTS (
           SELECT 1 FROM supplier s
           WHERE s.id = supplier_offer.supplier_id AND s.workspace_id = $2
         )
       RETURNING id`,
      [offerId, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Offer not found' }
      });
    }

    res.json({ data: { message: 'Offer deleted successfully' } });
  } catch (error) {
    console.error('Delete supplier offer error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting offer' }
    });
  }
});

// Get supplier by ID (tenant)
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM supplier WHERE id = $1 AND workspace_id = $2',
      [id, ((req as AuthRequest).workspaceId as string)]
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
      [name, contactName, email, phone, address, paymentTerms, leadTimeDays, taxId, isActive, id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Supplier not found' }
      });
    }

    if (cacheService.isConnectedToRedis()) {
      await cacheService.delPattern(`suppliers:${((req as AuthRequest).workspaceId as string)}:*`);
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
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (cacheService.isConnectedToRedis()) {
      await cacheService.delPattern(`suppliers:${((req as AuthRequest).workspaceId as string)}:*`);
    }

    res.json({ data: { message: 'Supplier deleted successfully' } });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting supplier' }
    });
  }
});

export default router;
