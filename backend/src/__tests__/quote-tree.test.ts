import {
  buildTreeFromRows,
  wouldCreateCycle,
  nodeDepth,
  resultingDepth,
  computeLineAmounts,
  MAX_TREE_DEPTH,
  QuoteNodeRow,
  QuoteItemRow
} from '../services/quote-tree';

const node = (id: string, parent: string | null, ordinal = 0, nodeType = 'section'): QuoteNodeRow => ({
  id,
  revision_id: 'rev1',
  parent_node_id: parent,
  node_type: nodeType,
  title: `Node ${id}`,
  description: null,
  ordinal
});

const item = (id: string, nodeId: string, lineTotal: number, tax = 0): QuoteItemRow => ({
  id,
  node_id: nodeId,
  product_id: null,
  supplier_offer_id: null,
  quantity: 1,
  unit: 'ea',
  unit_cost_minor: lineTotal - tax,
  currency: 'KES',
  pricing_rule: null,
  markup_value_minor: null,
  sell_price_minor: lineTotal - tax,
  tax_rate: 0,
  tax_amount_minor: tax,
  line_total_minor: lineTotal
});

describe('buildTreeFromRows', () => {
  it('builds a nested tree with items attached and correct subtotals', () => {
    const nodes = [
      node('A', null, 0),
      node('B', 'A', 0, 'subsection'),
      node('C', 'A', 1, 'subsection'),
      node('D', null, 1)
    ];
    const items = [
      item('i1', 'B', 1000, 160),
      item('i2', 'C', 2000),
      item('i3', 'D', 500)
    ];

    const tree = buildTreeFromRows(nodes, items);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('A');
    expect(tree[1].id).toBe('D');
    expect(tree[0].children.map(c => c.id)).toEqual(['B', 'C']);
    expect(tree[0].children[0].items[0].id).toBe('i1');
    // subtotals roll up descendants
    expect(tree[0].children[0].subtotal_minor).toBe(1000);
    expect(tree[0].subtotal_minor).toBe(3000);
    expect(tree[1].subtotal_minor).toBe(500);
  });

  it('orders siblings by ordinal', () => {
    const nodes = [node('A', null, 2), node('B', null, 0), node('C', null, 1)];
    const tree = buildTreeFromRows(nodes, []);
    expect(tree.map(n => n.id)).toEqual(['B', 'C', 'A']);
  });

  it('treats nodes with missing parents as roots', () => {
    const nodes = [node('A', 'nonexistent'), node('B', 'A')];
    const tree = buildTreeFromRows(nodes, []);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('A');
    expect(tree[0].children[0].id).toBe('B');
  });
});

describe('wouldCreateCycle', () => {
  const nodes = [node('A', null), node('B', 'A'), node('C', 'B')];

  it('returns true when moving a node under itself', () => {
    expect(wouldCreateCycle('A', 'A', nodes)).toBe(true);
  });

  it('returns true when moving a node under its descendant', () => {
    expect(wouldCreateCycle('A', 'C', nodes)).toBe(true);
    expect(wouldCreateCycle('B', 'C', nodes)).toBe(true);
  });

  it('returns false for valid moves', () => {
    expect(wouldCreateCycle('C', 'A', nodes)).toBe(false); // move up
    expect(wouldCreateCycle('A', null, nodes)).toBe(false); // to root
    const nodes2 = [...nodes, node('D', null)];
    expect(wouldCreateCycle('C', 'D', nodes2)).toBe(false); // to sibling branch
  });
});

describe('depth helpers', () => {
  // A -> B -> C -> E ; A -> D
  const nodes = [node('A', null), node('B', 'A'), node('C', 'B'), node('D', 'A'), node('E', 'C')];

  it('nodeDepth counts ancestors (root = 0)', () => {
    expect(nodeDepth('A', nodes)).toBe(0);
    expect(nodeDepth('B', nodes)).toBe(1);
    expect(nodeDepth('E', nodes)).toBe(3);
  });

  it('resultingDepth for a new node under a parent is parent depth + 1', () => {
    expect(resultingDepth(null, 'B', nodes)).toBe(2);
    expect(resultingDepth(null, null, nodes)).toBe(0);
  });

  it('resultingDepth accounts for subtree height when moving', () => {
    // Move A (height 2 via B->C->E is actually 3: B,C,E) under D would be too deep in deeper trees
    expect(resultingDepth('C', 'D', nodes)).toBe(nodeDepth('D', nodes) + 1 + 1); // D depth 1 + 1 + subtree height 1 (E)
  });

  it('detects when depth limit would be exceeded', () => {
    // Build a chain of depth MAX_TREE_DEPTH
    const chain = [node('n0', null)];
    for (let i = 1; i <= MAX_TREE_DEPTH; i++) {
      chain.push(node(`n${i}`, `n${i - 1}`));
    }
    expect(resultingDepth(null, `n${MAX_TREE_DEPTH}`, chain)).toBeGreaterThan(MAX_TREE_DEPTH);
    expect(resultingDepth(null, `n${MAX_TREE_DEPTH - 1}`, chain)).toBe(MAX_TREE_DEPTH);
  });
});

describe('computeLineAmounts', () => {
  it('computes tax and line total from sell price', () => {
    const r = computeLineAmounts(2, 8000, 10000, null, 0.16);
    expect(r.sellPriceMinor).toBe(10000);
    expect(r.taxAmountMinor).toBe(Math.round(10000 * 2 * 0.16)); // 3200
    expect(r.lineTotalMinor).toBe(23200);
  });

  it('falls back to cost + markup when sell price not given', () => {
    const r = computeLineAmounts(1, 8000, null, 2000, 0);
    expect(r.sellPriceMinor).toBe(10000);
    expect(r.lineTotalMinor).toBe(10000);
  });

  it('rounds tax to nearest minor unit', () => {
    const r = computeLineAmounts(3, 0, 3333, null, 0.07);
    expect(r.taxAmountMinor).toBe(Math.round(3333 * 3 * 0.07));
  });
});
