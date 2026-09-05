import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createQuoteSchema, updateQuoteSchema, createQuoteNodeSchema, updateQuoteNodeSchema, createQuoteItemSchema, updateQuoteItemSchema, quoteCommentSchema, approvalActionSchema } from '../validations/quotes';
import { env } from '../config/env-validation';
import { PDFGenerator } from '../services/pdf-generator';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';
import {
  buildTree,
  getRevisionNodes,
  wouldCreateCycle,
  resultingDepth,
  computeLineAmounts,
  recalcRevisionTotals,
  MAX_TREE_DEPTH
} from '../services/quote-tree';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// Initialize PDF generator
const pdfGenerator = new PDFGenerator(pool);

// List quotes (tenant)
router.get('/', authenticateTenant, async (req: any, res) => {
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
router.post('/', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(createQuoteSchema), async (req: any, res) => {
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

// List pending approvals for workspace (tenant_admin only)
// NOTE: registered before '/:id' so it is not swallowed by the id route.
router.get('/approvals/pending', authenticateTenant, requireRole(['tenant_admin']), async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, q.title as quote_title, q.status as quote_status,
              c.name as client_name, u.name as requested_by_name
       FROM quote_approval a
       JOIN quote q ON a.quote_id = q.id
       JOIN client c ON q.client_id = c.id
       LEFT JOIN users u ON a.requested_by = u.id
       WHERE q.workspace_id = $1 AND a.status = 'pending'
       ORDER BY a.requested_at DESC`,
      [req.workspaceId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List pending approvals error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching pending approvals' }
    });
  }
});

// Approve an approval request (tenant_admin only)
router.post('/approvals/:approvalId/approve', authenticateTenant, requireRole(['tenant_admin']), validateRequest(approvalActionSchema), async (req: any, res) => {
  try {
    const { approvalId } = req.params;
    const { note } = req.body;

    const result = await pool.query(
      `UPDATE quote_approval a
       SET status = 'approved', decided_by = $1, decided_at = CURRENT_TIMESTAMP, note = COALESCE($2, a.note)
       FROM quote q
       WHERE a.id = $3 AND a.quote_id = q.id AND q.workspace_id = $4 AND a.status = 'pending'
       RETURNING a.*`,
      [req.userId, note, approvalId, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pending approval not found' }
      });
    }

    // Decision is recorded on the approval only; quote status is managed separately.
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Approve approval error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred approving the request' }
    });
  }
});

// Reject an approval request (tenant_admin only)
router.post('/approvals/:approvalId/reject', authenticateTenant, requireRole(['tenant_admin']), validateRequest(approvalActionSchema), async (req: any, res) => {
  try {
    const { approvalId } = req.params;
    const { note } = req.body;

    const result = await pool.query(
      `UPDATE quote_approval a
       SET status = 'rejected', decided_by = $1, decided_at = CURRENT_TIMESTAMP, note = COALESCE($2, a.note)
       FROM quote q
       WHERE a.id = $3 AND a.quote_id = q.id AND q.workspace_id = $4 AND a.status = 'pending'
       RETURNING a.*`,
      [req.userId, note, approvalId, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Pending approval not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Reject approval error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred rejecting the request' }
    });
  }
});

// Get quote by ID (tenant)
router.get('/:id', authenticateTenant, async (req: any, res) => {
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
router.put('/:id', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(updateQuoteSchema), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, currency, validUntil, status } = req.body;

    // Publish gate: every item on the current revision must have a sell price
    // or a linked supplier offer before the quote can be published.
    if (status === 'published') {
      const quoteRes = await pool.query(
        'SELECT current_revision_id FROM quote WHERE id = $1 AND workspace_id = $2',
        [id, req.workspaceId]
      );
      if (quoteRes.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Quote not found' }
        });
      }
      const revisionId = quoteRes.rows[0].current_revision_id;
      if (revisionId) {
        const unpriced = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM quote_item i
           JOIN quote_node n ON i.node_id = n.id
           WHERE n.revision_id = $1
             AND i.sell_price_minor <= 0
             AND i.supplier_offer_id IS NULL`,
          [revisionId]
        );
        if (unpriced.rows[0].count > 0) {
          return res.status(400).json({
            error: { code: 'MISSING_PRICES', message: 'All items must have a sell price or supplier offer before publishing' }
          });
        }
        await pool.query(
          'UPDATE quote_revision SET published_at = CURRENT_TIMESTAMP WHERE id = $1',
          [revisionId]
        );
      }
    }

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

// Publish quote (estimator, tenant admin) — dedicated endpoint enforcing the pricing gate
router.post('/:id/publish', authenticateTenant, requireRole(['estimator', 'tenant_admin']), async (req: any, res) => {
  try {
    const { id } = req.params;

    const quoteRes = await pool.query(
      'SELECT current_revision_id, status FROM quote WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quote not found' }
      });
    }

    const revisionId = quoteRes.rows[0].current_revision_id;
    if (revisionId) {
      const unpriced = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM quote_item i
         JOIN quote_node n ON i.node_id = n.id
         WHERE n.revision_id = $1
           AND i.sell_price_minor <= 0
           AND i.supplier_offer_id IS NULL`,
        [revisionId]
      );
      if (unpriced.rows[0].count > 0) {
        return res.status(400).json({
          error: { code: 'MISSING_PRICES', message: 'All items must have a sell price or supplier offer before publishing' }
        });
      }
      await pool.query(
        'UPDATE quote_revision SET published_at = CURRENT_TIMESTAMP WHERE id = $1',
        [revisionId]
      );
    }

    const result = await pool.query(
      `UPDATE quote SET status = 'published', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND workspace_id = $2 RETURNING *`,
      [id, req.workspaceId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Publish quote error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred publishing quote' }
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
router.get('/:id/pdf', authenticateTenant, async (req: any, res) => {
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
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req: any, res) => {
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

// ---------------------------------------------------------------------------
// Quote hierarchy endpoints
// ---------------------------------------------------------------------------

// Helper: verify quote belongs to workspace, return the quote row or null.
const findQuote = async (id: string, workspaceId: string) => {
  const result = await pool.query(
    'SELECT * FROM quote WHERE id = $1 AND workspace_id = $2',
    [id, workspaceId]
  );
  return result.rows[0] || null;
};

// Helper: verify revision belongs to quote, return revision row or null.
const findRevision = async (revisionId: string, quoteId: string) => {
  const result = await pool.query(
    'SELECT * FROM quote_revision WHERE id = $1 AND quote_id = $2',
    [revisionId, quoteId]
  );
  return result.rows[0] || null;
};

// List revisions of a quote
router.get('/:id/revisions', authenticateTenant, async (req: any, res) => {
  try {
    const quote = await findQuote(req.params.id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    const result = await pool.query(
      'SELECT * FROM quote_revision WHERE quote_id = $1 ORDER BY version DESC',
      [req.params.id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List revisions error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching revisions' } });
  }
});

// Get nested node tree + totals for a revision
router.get('/:id/revisions/:revisionId/tree', authenticateTenant, async (req: any, res) => {
  try {
    const { id, revisionId } = req.params;
    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const revision = await findRevision(revisionId, id);
    if (!revision) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Revision not found' } });
    }

    const tree = await buildTree(revisionId, pool);
    res.json({
      data: {
        revision,
        tree,
        totals: {
          subtotal_amount_minor: revision.subtotal_amount_minor,
          tax_amount_minor: revision.tax_amount_minor,
          total_amount_minor: revision.total_amount_minor
        }
      }
    });
  } catch (error) {
    console.error('Get revision tree error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching the quote tree' } });
  }
});

// Create a node in a revision
router.post('/:id/revisions/:revisionId/nodes', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(createQuoteNodeSchema), async (req: any, res) => {
  try {
    const { id, revisionId } = req.params;
    const { parentNodeId, nodeType, title, description, ordinal } = req.body;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const revision = await findRevision(revisionId, id);
    if (!revision) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Revision not found' } });
    }

    const allNodes = await getRevisionNodes(revisionId, pool);

    if (parentNodeId) {
      const parent = allNodes.find(n => n.id === parentNodeId);
      if (!parent) {
        return res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'Parent node does not belong to this revision' } });
      }
      // 'item' nodes cannot have children
      if (parent.node_type === 'item') {
        return res.status(400).json({ error: { code: 'INVALID_PARENT', message: "Item nodes cannot have children" } });
      }
      // Depth check: new node depth = parent depth + 1
      if (resultingDepth(null, parentNodeId, allNodes) > MAX_TREE_DEPTH) {
        return res.status(400).json({ error: { code: 'MAX_DEPTH_EXCEEDED', message: `Maximum tree depth of ${MAX_TREE_DEPTH} exceeded` } });
      }
    }

    const nodeId = uuidv4();
    const result = await pool.query(
      `INSERT INTO quote_node (id, revision_id, parent_node_id, node_type, title, description, ordinal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nodeId, revisionId, parentNodeId || null, nodeType, title, description || null, ordinal ?? 0]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create quote node error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating the node' } });
  }
});

// Update a node (title/description/ordinal/parentNodeId)
router.put('/:id/revisions/:revisionId/nodes/:nodeId', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(updateQuoteNodeSchema), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id, revisionId, nodeId } = req.params;
    const { title, description, ordinal, parentNodeId } = req.body;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const revision = await findRevision(revisionId, id);
    if (!revision) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Revision not found' } });
    }

    const allNodes = await getRevisionNodes(revisionId, client);
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Node not found' } });
    }

    if (parentNodeId !== undefined && parentNodeId !== node.parent_node_id) {
      if (parentNodeId) {
        const parent = allNodes.find(n => n.id === parentNodeId);
        if (!parent) {
          return res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'Parent node does not belong to this revision' } });
        }
        if (parent.node_type === 'item') {
          return res.status(400).json({ error: { code: 'INVALID_PARENT', message: "Item nodes cannot have children" } });
        }
        if (wouldCreateCycle(nodeId, parentNodeId, allNodes)) {
          return res.status(400).json({ error: { code: 'CYCLE_DETECTED', message: 'Cannot move a node into itself or its descendants' } });
        }
        if (resultingDepth(nodeId, parentNodeId, allNodes) > MAX_TREE_DEPTH) {
          return res.status(400).json({ error: { code: 'MAX_DEPTH_EXCEEDED', message: `Maximum tree depth of ${MAX_TREE_DEPTH} exceeded` } });
        }
      }
    }

    const result = await client.query(
      `UPDATE quote_node
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           ordinal = COALESCE($3, ordinal),
           parent_node_id = CASE WHEN $4::uuid IS NULL AND $5::boolean THEN NULL ELSE COALESCE($4::uuid, parent_node_id) END
       WHERE id = $6 AND revision_id = $7
       RETURNING *`,
      [
        title,
        description,
        ordinal,
        parentNodeId ?? null,
        parentNodeId === null, // explicit null clears the parent (move to root)
        nodeId,
        revisionId
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update quote node error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating the node' } });
  } finally {
    client.release();
  }
});

// Delete a node (DB cascade removes children + items)
router.delete('/:id/revisions/:revisionId/nodes/:nodeId', authenticateTenant, requireRole(['estimator', 'tenant_admin']), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id, revisionId, nodeId } = req.params;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    await client.query('BEGIN');
    const result = await client.query(
      'DELETE FROM quote_node WHERE id = $1 AND revision_id = $2 RETURNING id',
      [nodeId, revisionId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Node not found' } });
    }
    await recalcRevisionTotals(revisionId, client);
    await client.query('COMMIT');

    res.json({ data: { message: 'Node deleted successfully' } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete quote node error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting the node' } });
  } finally {
    client.release();
  }
});

// Create an item under a node
router.post('/:id/revisions/:revisionId/nodes/:nodeId/items', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(createQuoteItemSchema), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id, revisionId, nodeId } = req.params;
    const { productId, supplierOfferId, quantity, unit, unitCostMinor, sellPriceMinor, taxRate, currency, pricingRule, markupValueMinor } = req.body;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    const nodeRes = await client.query(
      'SELECT id FROM quote_node WHERE id = $1 AND revision_id = $2',
      [nodeId, revisionId]
    );
    if (nodeRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Node not found in this revision' } });
    }

    const { sellPriceMinor: sell, taxAmountMinor, lineTotalMinor } = computeLineAmounts(
      quantity, unitCostMinor, sellPriceMinor, markupValueMinor, taxRate ?? 0.16
    );

    await client.query('BEGIN');
    const itemId = uuidv4();
    const result = await client.query(
      `INSERT INTO quote_item
         (id, node_id, product_id, supplier_offer_id, quantity, unit, unit_cost_minor, currency, pricing_rule, markup_value_minor, sell_price_minor, tax_rate, tax_amount_minor, line_total_minor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [itemId, nodeId, productId || null, supplierOfferId || null, quantity, unit, unitCostMinor, currency || 'KES', pricingRule || null, markupValueMinor ?? null, sell, taxRate ?? 0.16, taxAmountMinor, lineTotalMinor]
    );
    await recalcRevisionTotals(revisionId, client);
    await client.query('COMMIT');

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create quote item error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating the item' } });
  } finally {
    client.release();
  }
});

// Update an item + recalc
router.put('/:id/revisions/:revisionId/items/:itemId', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(updateQuoteItemSchema), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id, revisionId, itemId } = req.params;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    const existing = await client.query(
      `SELECT i.* FROM quote_item i
       JOIN quote_node n ON i.node_id = n.id
       WHERE i.id = $1 AND n.revision_id = $2`,
      [itemId, revisionId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not found' } });
    }
    const cur = existing.rows[0];
    const b = req.body;

    const quantity = b.quantity ?? cur.quantity;
    const unitCostMinor = b.unitCostMinor ?? cur.unit_cost_minor;
    const markupValueMinor = b.markupValueMinor !== undefined ? b.markupValueMinor : cur.markup_value_minor;
    const sellPriceMinor = b.sellPriceMinor !== undefined ? b.sellPriceMinor : cur.sell_price_minor;
    const taxRate = b.taxRate !== undefined ? b.taxRate : parseFloat(cur.tax_rate);

    const { sellPriceMinor: sell, taxAmountMinor, lineTotalMinor } = computeLineAmounts(
      quantity, unitCostMinor, sellPriceMinor, markupValueMinor, taxRate
    );

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE quote_item
       SET product_id = $1, supplier_offer_id = $2, quantity = $3, unit = $4,
           unit_cost_minor = $5, currency = $6, pricing_rule = $7,
           markup_value_minor = $8, sell_price_minor = $9, tax_rate = $10,
           tax_amount_minor = $11, line_total_minor = $12
       WHERE id = $13
       RETURNING *`,
      [
        b.productId !== undefined ? b.productId : cur.product_id,
        b.supplierOfferId !== undefined ? b.supplierOfferId : cur.supplier_offer_id,
        quantity,
        b.unit ?? cur.unit,
        unitCostMinor,
        b.currency ?? cur.currency,
        b.pricingRule !== undefined ? b.pricingRule : cur.pricing_rule,
        markupValueMinor,
        sell,
        taxRate,
        taxAmountMinor,
        lineTotalMinor,
        itemId
      ]
    );
    await recalcRevisionTotals(revisionId, client);
    await client.query('COMMIT');

    res.json({ data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update quote item error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating the item' } });
  } finally {
    client.release();
  }
});

// Delete an item + recalc
router.delete('/:id/revisions/:revisionId/items/:itemId', authenticateTenant, requireRole(['estimator', 'tenant_admin']), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id, revisionId, itemId } = req.params;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `DELETE FROM quote_item i
       USING quote_node n
       WHERE i.node_id = n.id AND i.id = $1 AND n.revision_id = $2
       RETURNING i.id`,
      [itemId, revisionId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not found' } });
    }
    await recalcRevisionTotals(revisionId, client);
    await client.query('COMMIT');

    res.json({ data: { message: 'Item deleted successfully' } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete quote item error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting the item' } });
  } finally {
    client.release();
  }
});

// Create a new revision by copying the current revision's nodes + items.
// Always creates the copy as a new draft version (version = max + 1) and
// points quote.current_revision_id at it. The quote status is left unchanged;
// callers typically move the quote back to 'draft' themselves if needed.
router.post('/:id/new-revision', authenticateTenant, requireRole(['estimator', 'tenant_admin']), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const quote = await findQuote(id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    if (!quote.current_revision_id) {
      return res.status(400).json({ error: { code: 'NO_REVISION', message: 'Quote has no current revision to copy' } });
    }

    await client.query('BEGIN');

    const versionRes = await client.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM quote_revision WHERE quote_id = $1',
      [id]
    );
    const nextVersion = versionRes.rows[0].next_version;

    const newRevisionId = uuidv4();
    const newRevision = await client.query(
      `INSERT INTO quote_revision (id, quote_id, version, total_amount_minor, tax_amount_minor, subtotal_amount_minor, created_by)
       VALUES ($1, $2, $3, 0, 0, 0, $4)
       RETURNING *`,
      [newRevisionId, id, nextVersion, req.userId]
    );

    // Copy nodes (two passes to preserve hierarchy) — simplest: recursive copy
    // in ordinal order mapping old id -> new id.
    const oldNodes = await getRevisionNodes(quote.current_revision_id, client);
    const idMap = new Map<string, string>();
    // Sort parents before children using a simple topo walk.
    const remaining = [...oldNodes];
    const inserted = new Set<string>();
    while (remaining.length > 0) {
      const ready = remaining.filter(n => !n.parent_node_id || inserted.has(n.parent_node_id));
      if (ready.length === 0) break; // safety: orphaned nodes
      for (const n of ready) {
        const newId = uuidv4();
        idMap.set(n.id, newId);
        await client.query(
          `INSERT INTO quote_node (id, revision_id, parent_node_id, node_type, title, description, ordinal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, newRevisionId, n.parent_node_id ? idMap.get(n.parent_node_id) : null, n.node_type, n.title, n.description, n.ordinal]
        );
        inserted.add(n.id);
        remaining.splice(remaining.indexOf(n), 1);
      }
    }

    // Copy items
    const oldItems = await client.query(
      `SELECT i.* FROM quote_item i
       JOIN quote_node n ON i.node_id = n.id
       WHERE n.revision_id = $1`,
      [quote.current_revision_id]
    );
    for (const item of oldItems.rows) {
      const newNodeId = idMap.get(item.node_id);
      if (!newNodeId) continue;
      await client.query(
        `INSERT INTO quote_item
           (id, node_id, product_id, supplier_offer_id, quantity, unit, unit_cost_minor, currency, pricing_rule, markup_value_minor, sell_price_minor, tax_rate, tax_amount_minor, line_total_minor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [uuidv4(), newNodeId, item.product_id, item.supplier_offer_id, item.quantity, item.unit, item.unit_cost_minor, item.currency, item.pricing_rule, item.markup_value_minor, item.sell_price_minor, item.tax_rate, item.tax_amount_minor, item.line_total_minor]
      );
    }

    await recalcRevisionTotals(newRevisionId, client);

    await client.query(
      'UPDATE quote SET current_revision_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newRevisionId, id]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: newRevision.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('New revision error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating the revision' } });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

router.get('/:id/comments', authenticateTenant, async (req: any, res) => {
  try {
    const quote = await findQuote(req.params.id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const result = await pool.query(
      `SELECT c.*, u.name as user_name
       FROM quote_comment c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.quote_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching comments' } });
  }
});

router.post('/:id/comments', authenticateTenant, validateRequest(quoteCommentSchema), async (req: any, res) => {
  try {
    const quote = await findQuote(req.params.id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const result = await pool.query(
      `INSERT INTO quote_comment (id, quote_id, user_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), req.params.id, req.userId, req.body.body]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating the comment' } });
  }
});

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

// Submit quote for approval (creates a pending quote_approval)
router.post('/:id/submit-for-approval', authenticateTenant, requireRole(['estimator', 'tenant_admin']), async (req: any, res) => {
  try {
    const quote = await findQuote(req.params.id, req.workspaceId);
    if (!quote) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }

    const existing = await pool.query(
      "SELECT id FROM quote_approval WHERE quote_id = $1 AND status = 'pending'",
      [req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: { code: 'ALREADY_PENDING', message: 'Quote already has a pending approval request' } });
    }

    const result = await pool.query(
      `INSERT INTO quote_approval (id, quote_id, status, requested_by)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [uuidv4(), req.params.id, req.userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred submitting for approval' } });
  }
});

export default router;
