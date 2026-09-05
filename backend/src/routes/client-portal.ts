import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateClient, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { env } from '../config/env-validation';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const rejectQuoteSchema = z.object({
  reason: z.string().max(2000).optional()
});

const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(4000)
});

/**
 * @swagger
 * /api/v1/client-portal/quotes:
 *   get:
 *     summary: List published quotes for the authenticated client
 *     tags: [Client Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quotes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/quotes', authenticateClient, async (req, res) => {
  try {
    const clientId = (req as AuthRequest).clientId;

    const result = await pool.query(
      `SELECT q.*, qr.total_amount_minor, qr.subtotal_amount_minor, qr.tax_amount_minor
       FROM quote q
       LEFT JOIN quote_revision qr ON q.current_revision_id = qr.id
       WHERE q.client_id = $1 AND q.status IN ('published', 'accepted', 'rejected')
       ORDER BY q.created_at DESC`,
      [clientId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Client portal list quotes error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching quotes' }
    });
  }
});

/**
 * @swagger
 * /api/v1/client-portal/quotes/{id}:
 *   get:
 *     summary: Get a quote with client-facing tree for the authenticated client
 *     tags: [Client Portal]
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
 *         description: Quote retrieved successfully
 *       404:
 *         description: Quote not found
 */
router.get('/quotes/:id', authenticateClient, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = (req as AuthRequest).clientId;

    const quoteResult = await pool.query(
      `SELECT q.*, qr.total_amount_minor, qr.subtotal_amount_minor, qr.tax_amount_minor
       FROM quote q
       LEFT JOIN quote_revision qr ON q.current_revision_id = qr.id
       WHERE q.id = $1 AND q.client_id = $2 AND q.status != 'draft'`,
      [id, clientId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found' }
      });
    }

    const quote = quoteResult.rows[0];
    const revisionId = quote.current_revision_id;

    const treeResult = await pool.query(
      `SELECT qn.id as node_id, qn.node_type, qn.title, qn.description, qn.ordinal, qn.parent_node_id, qn.created_at as node_created_at,
              qi.id as item_id, qi.product_id, qi.supplier_offer_id, qi.quantity, qi.unit, qi.unit_cost_minor,
              qi.currency as item_currency, qi.pricing_rule, qi.markup_value_minor, qi.sell_price_minor,
              qi.tax_rate, qi.tax_amount_minor, qi.line_total_minor, qi.created_at as item_created_at
       FROM quote_node qn
       LEFT JOIN quote_item qi ON qi.node_id = qn.id
       WHERE qn.revision_id = $1
       ORDER BY qn.ordinal, qi.created_at`,
      [revisionId]
    );

    res.json({
      data: {
        quote,
        tree: treeResult.rows
      }
    });
  } catch (error) {
    console.error('Client portal get quote error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching quote' }
    });
  }
});

/**
 * @swagger
 * /api/v1/client-portal/quotes/{id}/approve:
 *   post:
 *     summary: Approve a published quote
 *     tags: [Client Portal]
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
 *         description: Quote approved successfully
 *       400:
 *         description: Quote cannot be approved
 *       404:
 *         description: Quote not found
 */
router.post('/quotes/:id/approve', authenticateClient, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = (req as AuthRequest).clientId;
    const clientUserId = (req as AuthRequest).clientUserId;

    const quoteResult = await pool.query(
      `SELECT * FROM quote WHERE id = $1 AND client_id = $2 AND status = 'published'`,
      [id, clientId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found or cannot be approved' }
      });
    }

    const updateResult = await pool.query(
      `UPDATE quote SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      `INSERT INTO quote_comment (id, quote_id, client_user_id, body, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [uuidv4(), id, clientUserId, 'Quote approved']
    );

    res.json({ data: updateResult.rows[0] });
  } catch (error) {
    console.error('Client portal approve quote error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred approving quote' }
    });
  }
});

/**
 * @swagger
 * /api/v1/client-portal/quotes/{id}/reject:
 *   post:
 *     summary: Reject a published quote
 *     tags: [Client Portal]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quote rejected successfully
 *       400:
 *         description: Quote cannot be rejected
 *       404:
 *         description: Quote not found
 */
router.post('/quotes/:id/reject', authenticateClient, validateRequest(rejectQuoteSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const clientId = (req as AuthRequest).clientId;
    const clientUserId = (req as AuthRequest).clientUserId;

    const quoteResult = await pool.query(
      `SELECT * FROM quote WHERE id = $1 AND client_id = $2 AND status = 'published'`,
      [id, clientId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found or cannot be rejected' }
      });
    }

    const updateResult = await pool.query(
      `UPDATE quote SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    const body = reason ? `Quote rejected: ${reason}` : 'Quote rejected';
    await pool.query(
      `INSERT INTO quote_comment (id, quote_id, client_user_id, body, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [uuidv4(), id, clientUserId, body]
    );

    res.json({ data: updateResult.rows[0] });
  } catch (error) {
    console.error('Client portal reject quote error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred rejecting quote' }
    });
  }
});

/**
 * @swagger
 * /api/v1/client-portal/quotes/{id}/comments:
 *   get:
 *     summary: List comments for a quote
 *     tags: [Client Portal]
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
 *         description: Comments retrieved successfully
 *       404:
 *         description: Quote not found
 */
router.get('/quotes/:id/comments', authenticateClient, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = (req as AuthRequest).clientId;

    const quoteResult = await pool.query(
      `SELECT id FROM quote WHERE id = $1 AND client_id = $2 AND status != 'draft'`,
      [id, clientId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found' }
      });
    }

    const result = await pool.query(
      `SELECT * FROM quote_comment WHERE quote_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Client portal list comments error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching comments' }
    });
  }
});

/**
 * @swagger
 * /api/v1/client-portal/quotes/{id}/comments:
 *   post:
 *     summary: Add a client comment to a quote
 *     tags: [Client Portal]
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
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       404:
 *         description: Quote not found
 */
router.post('/quotes/:id/comments', authenticateClient, validateRequest(createCommentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const clientId = (req as AuthRequest).clientId;
    const clientUserId = (req as AuthRequest).clientUserId;

    const quoteResult = await pool.query(
      `SELECT id FROM quote WHERE id = $1 AND client_id = $2 AND status != 'draft'`,
      [id, clientId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found' }
      });
    }

    const commentId = uuidv4();
    const result = await pool.query(
      `INSERT INTO quote_comment (id, quote_id, client_user_id, body, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [commentId, id, clientUserId, body]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Client portal create comment error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating comment' }
    });
  }
});

export default router;
