import { Pool, PoolClient } from 'pg';
import { env } from '../config/env-validation';

// Lazily-created shared pool (avoids connecting at import time so pure
// functions remain unit-testable without a database).
let pool: Pool | null = null;
const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
};

export type Queryable = Pool | PoolClient;

export const MAX_TREE_DEPTH = 10;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface QuoteNodeRow {
  id: string;
  revision_id: string;
  parent_node_id: string | null;
  node_type: string;
  title: string | null;
  description: string | null;
  ordinal: number;
}

export interface QuoteItemRow {
  id: string;
  node_id: string;
  product_id: string | null;
  supplier_offer_id: string | null;
  quantity: number;
  unit: string;
  unit_cost_minor: number;
  currency: string | null;
  pricing_rule: string | null;
  markup_value_minor: number | null;
  sell_price_minor: number;
  tax_rate: string | number | null;
  tax_amount_minor: number;
  line_total_minor: number;
}

export interface TreeNode {
  id: string;
  node_type: string;
  title: string | null;
  description: string | null;
  ordinal: number;
  children: TreeNode[];
  items: QuoteItemRow[];
  subtotal_minor: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (no DB) — unit-testable
// ---------------------------------------------------------------------------

/**
 * Assemble a flat list of quote_node rows + quote_item rows into a nested tree.
 * Items are attached to their node; each node's subtotal_minor is the sum of
 * its own items' line_total_minor plus all descendants' subtotals.
 */
export const buildTreeFromRows = (
  nodeRows: QuoteNodeRow[],
  itemRows: QuoteItemRow[]
): TreeNode[] => {
  const itemsByNode = new Map<string, QuoteItemRow[]>();
  for (const item of itemRows) {
    const list = itemsByNode.get(item.node_id) || [];
    list.push(item);
    itemsByNode.set(item.node_id, list);
  }

  const nodeMap = new Map<string, TreeNode>();
  for (const n of nodeRows) {
    nodeMap.set(n.id, {
      id: n.id,
      node_type: n.node_type,
      title: n.title,
      description: n.description,
      ordinal: n.ordinal,
      children: [],
      items: itemsByNode.get(n.id) || [],
      subtotal_minor: 0
    });
  }

  const roots: TreeNode[] = [];
  for (const n of nodeRows) {
    const node = nodeMap.get(n.id)!;
    if (n.parent_node_id && nodeMap.has(n.parent_node_id)) {
      nodeMap.get(n.parent_node_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.ordinal - b.ordinal);
    for (const n of nodes) sortRecursive(n.children);
  };
  sortRecursive(roots);

  const computeSubtotal = (node: TreeNode): number => {
    let sum = node.items.reduce((s, i) => s + (i.line_total_minor || 0), 0);
    for (const child of node.children) {
      sum += computeSubtotal(child);
    }
    node.subtotal_minor = sum;
    return sum;
  };
  for (const root of roots) computeSubtotal(root);

  return roots;
};

/**
 * Returns true if making `newParentId` the parent of `nodeId` would create a
 * cycle — i.e. nodeId is newParentId itself or one of its ancestors.
 */
export const wouldCreateCycle = (
  nodeId: string,
  newParentId: string | null,
  allNodes: Pick<QuoteNodeRow, 'id' | 'parent_node_id'>[]
): boolean => {
  if (!newParentId) return false;
  if (nodeId === newParentId) return true;

  const parentById = new Map<string, string | null>();
  for (const n of allNodes) parentById.set(n.id, n.parent_node_id);

  let current: string | null | undefined = newParentId;
  const seen = new Set<string>();
  while (current) {
    if (current === nodeId) return true;
    if (seen.has(current)) break; // pre-existing cycle safety
    seen.add(current);
    current = parentById.get(current);
  }
  return false;
};

/**
 * Depth of a node = number of ancestors (root = 0).
 */
export const nodeDepth = (
  nodeId: string | null,
  allNodes: Pick<QuoteNodeRow, 'id' | 'parent_node_id'>[]
): number => {
  if (!nodeId) return 0;
  const parentById = new Map<string, string | null>();
  for (const n of allNodes) parentById.set(n.id, n.parent_node_id);

  let depth = 0;
  let current: string | null | undefined = nodeId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    current = parentById.get(current);
    if (current) depth++;
  }
  return depth;
};

/**
 * Depth the subtree rooted at `subtreeRootId` would have if placed under
 * `newParentId`: depth(newParent) + 1 + heightOfSubtree.
 * Compare against MAX_TREE_DEPTH.
 */
export const resultingDepth = (
  subtreeRootId: string | null,
  newParentId: string | null,
  allNodes: Pick<QuoteNodeRow, 'id' | 'parent_node_id'>[]
): number => {
  // Height of the subtree being placed (0 for a single node, or longest
  // descendant chain for existing subtrees).
  const height = (id: string): number => {
    const children = allNodes.filter(n => n.parent_node_id === id);
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map(c => height(c.id)));
  };

  const base = newParentId ? nodeDepth(newParentId, allNodes) + 1 : 0;
  return base + (subtreeRootId ? height(subtreeRootId) : 0);
};

/**
 * Compute sell/tax/line totals for an item.
 * sell = sellPriceMinor ?? unitCostMinor + (markupValueMinor ?? 0)
 * tax  = round(sell * quantity * taxRate)
 * line = sell * quantity + tax
 */
export const computeLineAmounts = (
  quantity: number,
  unitCostMinor: number,
  sellPriceMinor: number | null | undefined,
  markupValueMinor: number | null | undefined,
  taxRate: number | null | undefined
): { sellPriceMinor: number; taxAmountMinor: number; lineTotalMinor: number } => {
  const sell =
    sellPriceMinor !== null && sellPriceMinor !== undefined
      ? sellPriceMinor
      : unitCostMinor + (markupValueMinor ?? 0);
  const rate = taxRate ?? 0;
  const taxAmountMinor = Math.round(sell * quantity * rate);
  const lineTotalMinor = sell * quantity + taxAmountMinor;
  return { sellPriceMinor: sell, taxAmountMinor, lineTotalMinor };
};

// ---------------------------------------------------------------------------
// DB-backed functions
// ---------------------------------------------------------------------------

export const getRevisionNodes = async (
  revisionId: string,
  db: Queryable = getPool()
): Promise<QuoteNodeRow[]> => {
  const result = await db.query(
    'SELECT * FROM quote_node WHERE revision_id = $1 ORDER BY ordinal, created_at',
    [revisionId]
  );
  return result.rows;
};

export const getRevisionItems = async (
  revisionId: string,
  db: Queryable = getPool()
): Promise<QuoteItemRow[]> => {
  const result = await db.query(
    `SELECT i.* FROM quote_item i
     JOIN quote_node n ON i.node_id = n.id
     WHERE n.revision_id = $1
     ORDER BY i.created_at`,
    [revisionId]
  );
  return result.rows;
};

export const buildTree = async (
  revisionId: string,
  db: Queryable = getPool()
): Promise<TreeNode[]> => {
  const [nodes, items] = await Promise.all([
    getRevisionNodes(revisionId, db),
    getRevisionItems(revisionId, db)
  ]);
  return buildTreeFromRows(nodes, items);
};

/**
 * Recalculate quote_revision.subtotal_amount_minor, tax_amount_minor and
 * total_amount_minor from the line items under the revision.
 */
export const recalcRevisionTotals = async (
  revisionId: string,
  db: Queryable = getPool()
): Promise<{ subtotal: number; tax: number; total: number }> => {
  const result = await db.query(
    `SELECT
       COALESCE(SUM(i.line_total_minor - i.tax_amount_minor), 0)::int AS subtotal,
       COALESCE(SUM(i.tax_amount_minor), 0)::int AS tax,
       COALESCE(SUM(i.line_total_minor), 0)::int AS total
     FROM quote_item i
     JOIN quote_node n ON i.node_id = n.id
     WHERE n.revision_id = $1`,
    [revisionId]
  );
  const { subtotal, tax, total } = result.rows[0];
  await db.query(
    `UPDATE quote_revision
     SET subtotal_amount_minor = $2,
         tax_amount_minor = $3,
         total_amount_minor = $4
     WHERE id = $1`,
    [revisionId, subtotal, tax, total]
  );
  return { subtotal, tax, total };
};
