import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createQuoteTemplateSchema, updateQuoteTemplateSchema, applyQuoteTemplateSchema } from '../validations/quotes';
import { env } from '../config/env-validation';
import { computeLineAmounts, recalcRevisionTotals, MAX_TREE_DEPTH } from '../services/quote-tree';
import { PoolClient } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

// List templates for workspace
router.get('/', authenticateTenant, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quote_template WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.workspaceId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List quote templates error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching templates' } });
  }
});

// Create template
router.post('/', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(createQuoteTemplateSchema), async (req: any, res) => {
  try {
    const { name, description, structure } = req.body;
    const result = await pool.query(
      `INSERT INTO quote_template (id, workspace_id, name, description, structure, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), req.workspaceId, name, description || null, JSON.stringify(structure), req.userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create quote template error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating the template' } });
  }
});

// Update template
router.put('/:id', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(updateQuoteTemplateSchema), async (req: any, res) => {
  try {
    const { name, description, structure, isActive } = req.body;
    const result = await pool.query(
      `UPDATE quote_template
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           structure = COALESCE($3, structure),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND workspace_id = $6
       RETURNING *`,
      [name, description, structure ? JSON.stringify(structure) : null, isActive, req.params.id, req.workspaceId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update quote template error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating the template' } });
  }
});

// Delete template
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req: any, res) => {
  try {
    await pool.query(
      'DELETE FROM quote_template WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspaceId]
    );
    res.json({ data: { message: 'Template deleted successfully' } });
  } catch (error) {
    console.error('Delete quote template error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting the template' } });
  }
});

// Apply a template to a quote's current revision.
// Clones the template's structure (array of nested nodes:
// { title, node_type, description?, children?: [], items?: [{quantity, unit, unit_cost_minor, sell_price_minor, ...}] })
// into the revision, creating nodes recursively + their items, then recalcs totals.
router.post('/:id/apply', authenticateTenant, requireRole(['estimator', 'tenant_admin']), validateRequest(applyQuoteTemplateSchema), async (req: any, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { quoteId } = req.body;

    const templateRes = await client.query(
      'SELECT * FROM quote_template WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (templateRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
    }
    const template = templateRes.rows[0];

    const quoteRes = await client.query(
      'SELECT * FROM quote WHERE id = $1 AND workspace_id = $2',
      [quoteId, req.workspaceId]
    );
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quote not found' } });
    }
    const quote = quoteRes.rows[0];
    if (!quote.current_revision_id) {
      return res.status(400).json({ error: { code: 'NO_REVISION', message: 'Quote has no current revision' } });
    }
    const revisionId = quote.current_revision_id;

    // Depth check: template height must fit under the revision root.
    const templateHeight = (nodes: any[]): number => {
      if (!Array.isArray(nodes) || nodes.length === 0) return 0;
      return 1 + Math.max(...nodes.map(n => templateHeight(n.children || [])));
    };
    const structure = typeof template.structure === 'string' ? JSON.parse(template.structure) : template.structure;
    const rootNodes: any[] = Array.isArray(structure) ? structure : (structure.nodes || []);
    if (templateHeight(rootNodes) > MAX_TREE_DEPTH) {
      return res.status(400).json({ error: { code: 'MAX_DEPTH_EXCEEDED', message: `Template exceeds maximum depth of ${MAX_TREE_DEPTH}` } });
    }

    await client.query('BEGIN');

    const nextOrdinalRes = await client.query(
      'SELECT COALESCE(MAX(ordinal), -1) + 1 AS next_ordinal FROM quote_node WHERE revision_id = $1 AND parent_node_id IS NULL',
      [revisionId]
    );
    let rootOrdinal = nextOrdinalRes.rows[0].next_ordinal;

    const createNodeRecursive = async (nodeDef: any, parentNodeId: string | null, ordinal: number, client: PoolClient, depth: number): Promise<string> => {
      if (depth > MAX_TREE_DEPTH) {
        throw new Error(`Template exceeds maximum depth of ${MAX_TREE_DEPTH}`);
      }
      const nodeId = uuidv4();
      const nodeType = nodeDef.node_type || nodeDef.nodeType || 'section';
      await client.query(
        `INSERT INTO quote_node (id, revision_id, parent_node_id, node_type, title, description, ordinal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nodeId, revisionId, parentNodeId, nodeType, nodeDef.title || 'Untitled', nodeDef.description || null, nodeDef.ordinal ?? ordinal]
      );

      for (const [idx, itemDef] of (nodeDef.items || []).entries()) {
        const quantity = itemDef.quantity ?? 1;
        const unitCostMinor = itemDef.unit_cost_minor ?? itemDef.unitCostMinor ?? 0;
        const taxRate = itemDef.tax_rate ?? itemDef.taxRate ?? 0.16;
        const { sellPriceMinor, taxAmountMinor, lineTotalMinor } = computeLineAmounts(
          quantity,
          unitCostMinor,
          itemDef.sell_price_minor ?? itemDef.sellPriceMinor,
          itemDef.markup_value_minor ?? itemDef.markupValueMinor,
          taxRate
        );
        await client.query(
          `INSERT INTO quote_item
             (id, node_id, product_id, supplier_offer_id, quantity, unit, unit_cost_minor, currency, pricing_rule, markup_value_minor, sell_price_minor, tax_rate, tax_amount_minor, line_total_minor)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            uuidv4(), nodeId,
            itemDef.product_id ?? itemDef.productId ?? null,
            itemDef.supplier_offer_id ?? itemDef.supplierOfferId ?? null,
            quantity,
            itemDef.unit || 'ea',
            unitCostMinor,
            itemDef.currency || quote.currency || 'KES',
            itemDef.pricing_rule ?? itemDef.pricingRule ?? null,
            itemDef.markup_value_minor ?? itemDef.markupValueMinor ?? null,
            sellPriceMinor, taxRate, taxAmountMinor, lineTotalMinor
          ]
        );
      }

      for (const [idx, childDef] of (nodeDef.children || []).entries()) {
        await createNodeRecursive(childDef, nodeId, childDef.ordinal ?? idx, client, depth + 1);
      }
      return nodeId;
    };

    for (const [idx, nodeDef] of rootNodes.entries()) {
      await createNodeRecursive(nodeDef, null, nodeDef.ordinal ?? (rootOrdinal + idx), client, 1);
    }

    const totals = await recalcRevisionTotals(revisionId, client);
    await client.query('COMMIT');

    res.json({ data: { revisionId, totals } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Apply template error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred applying the template' } });
  } finally {
    client.release();
  }
});

export default router;
