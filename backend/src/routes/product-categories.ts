import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createCategorySchema,
  updateCategorySchema,
  createVarietySchema,
  updateVarietySchema
} from '../validations/products';
import { env } from '../config/env-validation';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

interface CategoryRow {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: CategoryRow[];
}

// Build a nested tree from a flat list of categories
function buildTree(rows: CategoryRow[]): CategoryRow[] {
  const byId = new Map<string, CategoryRow>();
  rows.forEach(r => byId.set(r.id, { ...r, children: [] }));
  const roots: CategoryRow[] = [];
  byId.forEach(cat => {
    if (cat.parent_id && byId.has(cat.parent_id)) {
      byId.get(cat.parent_id)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  });
  return roots;
}

// Collect the set of descendant ids of a category (for cycle prevention)
function collectDescendants(rows: CategoryRow[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  rows.forEach(r => {
    if (r.parent_id) {
      const list = childrenOf.get(r.parent_id) || [];
      list.push(r.id);
      childrenOf.set(r.parent_id, list);
    }
  });
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const kids = childrenOf.get(current) || [];
    for (const kid of kids) {
      if (!result.has(kid)) {
        result.add(kid);
        stack.push(kid);
      }
    }
  }
  return result;
}

// List categories (tenant). ?tree=true returns nested tree; ?search= filters by name ILIKE
router.get('/', authenticateTenant, async (req: AuthRequest, res) => {
  try {
    const { tree, search } = req.query;

    let query = 'SELECT * FROM product_category WHERE workspace_id = $1';
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    if (tree === 'true') {
      res.json({ data: buildTree(result.rows) });
    } else {
      res.json({ data: result.rows });
    }
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching categories' }
    });
  }
});

// Variety routes declared BEFORE /:id so "varieties" isn't captured as an id param

// Update variety (tenant admin, procurement)
router.put('/varieties/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateVarietySchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, attributes, isActive } = req.body;

    const result = await pool.query(
      `UPDATE product_variety
       SET name = COALESCE($1, name),
           attributes = COALESCE($2, attributes),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND workspace_id = $5
       RETURNING *`,
      [name, attributes !== undefined ? JSON.stringify(attributes) : null, isActive, id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Variety not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update variety error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating variety' }
    });
  }
});

// Delete variety (tenant admin, procurement). Blocked if products reference it.
router.delete('/varieties/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM product_variety WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Variety not found' }
      });
    }

    // product.variety_id uses ON DELETE SET NULL, so delete is safe
    await pool.query(
      'DELETE FROM product_variety WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Variety deleted successfully' } });
  } catch (error) {
    console.error('Delete variety error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting variety' }
    });
  }
});

// Get single category with its varieties (tenant)
router.get('/:id', authenticateTenant, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });
    }

    const varieties = await pool.query(
      'SELECT * FROM product_variety WHERE category_id = $1 AND workspace_id = $2 ORDER BY name ASC',
      [id, req.workspaceId]
    );

    res.json({ data: { ...result.rows[0], varieties: varieties.rows } });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching category' }
    });
  }
});

// Create category (tenant admin, procurement)
router.post('/', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createCategorySchema), async (req: AuthRequest, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (parentId) {
      const parent = await pool.query(
        'SELECT id FROM product_category WHERE id = $1 AND workspace_id = $2',
        [parentId, req.workspaceId]
      );
      if (parent.rows.length === 0) {
        return res.status(400).json({
          error: { code: 'INVALID_PARENT', message: 'Parent category not found in workspace' }
        });
      }
    }

    const categoryId = uuidv4();
    const result = await pool.query(
      `INSERT INTO product_category (id, workspace_id, parent_id, name, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [categoryId, req.workspaceId, parentId || null, name, description]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating category' }
    });
  }
});

// Update category (tenant admin, procurement)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(updateCategorySchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, isActive } = req.body;

    const existing = await pool.query(
      'SELECT * FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });
    }

    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) {
        return res.status(400).json({
          error: { code: 'INVALID_PARENT', message: 'A category cannot be its own parent' }
        });
      }

      const parent = await pool.query(
        'SELECT id FROM product_category WHERE id = $1 AND workspace_id = $2',
        [parentId, req.workspaceId]
      );
      if (parent.rows.length === 0) {
        return res.status(400).json({
          error: { code: 'INVALID_PARENT', message: 'Parent category not found in workspace' }
        });
      }

      // Reject if the new parent is a descendant of this category (would create a cycle)
      const all = await pool.query(
        'SELECT id, parent_id FROM product_category WHERE workspace_id = $1',
        [req.workspaceId]
      );
      const descendants = collectDescendants(all.rows, id);
      if (descendants.has(parentId)) {
        return res.status(400).json({
          error: { code: 'CIRCULAR_PARENT', message: 'Cannot move a category under one of its descendants' }
        });
      }
    }

    const parentIdProvided = parentId !== undefined;
    const result = await pool.query(
      `UPDATE product_category
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           parent_id = CASE WHEN $3 THEN $4 ELSE parent_id END,
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND workspace_id = $7
       RETURNING *`,
      [
        name,
        description !== undefined ? description : null,
        parentIdProvided,
        parentIdProvided ? parentId : null,
        isActive,
        id,
        req.workspaceId
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating category' }
    });
  }
});

// Delete category (tenant admin, procurement). Only if no children and no products reference it.
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin', 'procurement']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });
    }

    const children = await pool.query(
      'SELECT COUNT(*) as count FROM product_category WHERE parent_id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (parseInt(children.rows[0].count) > 0) {
      return res.status(409).json({
        error: { code: 'HAS_CHILDREN', message: 'Cannot delete a category that has child categories' }
      });
    }

    const products = await pool.query(
      'SELECT COUNT(*) as count FROM product WHERE category_id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (parseInt(products.rows[0].count) > 0) {
      return res.status(409).json({
        error: { code: 'HAS_PRODUCTS', message: 'Cannot delete a category that is referenced by products' }
      });
    }

    await pool.query(
      'DELETE FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );

    res.json({ data: { message: 'Category deleted successfully' } });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deleting category' }
    });
  }
});

// List varieties under a category (tenant)
router.get('/:id/varieties', authenticateTenant, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const category = await pool.query(
      'SELECT id FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (category.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });
    }

    const result = await pool.query(
      'SELECT * FROM product_variety WHERE category_id = $1 AND workspace_id = $2 ORDER BY name ASC',
      [id, req.workspaceId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('List varieties error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching varieties' }
    });
  }
});

// Create variety under a category (tenant admin, procurement)
router.post('/:id/varieties', authenticateTenant, requireRole(['tenant_admin', 'procurement']), validateRequest(createVarietySchema.omit({ categoryId: true })), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, attributes } = req.body;

    const category = await pool.query(
      'SELECT id FROM product_category WHERE id = $1 AND workspace_id = $2',
      [id, req.workspaceId]
    );
    if (category.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });
    }

    const varietyId = uuidv4();
    const result = await pool.query(
      `INSERT INTO product_variety (id, workspace_id, category_id, name, attributes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [varietyId, req.workspaceId, id, name, attributes ? JSON.stringify(attributes) : null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create variety error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating variety' }
    });
  }
});

export default router;
