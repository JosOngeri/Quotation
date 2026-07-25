import { Router } from 'express';
import { Pool } from 'pg';
import { authenticatePlatformAdmin, authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validations/workspace';
import { env } from '../config/env-validation';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

/**
 * @swagger
 * /api/v1/workspaces:
 *   post:
 *     summary: Create new workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My Company"
 *               slug:
 *                 type: string
 *                 example: "my-company"
 *               reportingCurrency:
 *                 type: string
 *                 default: "KES"
 *               defaultLocale:
 *                 type: string
 *                 default: "en-KE"
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Workspace'
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
 *         description: Forbidden - Platform admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create workspace (platform admin only)
router.post('/', authenticatePlatformAdmin, validateRequest(createWorkspaceSchema), async (req, res) => {
  try {
    const { name, slug, reportingCurrency, defaultLocale } = req.body;

    const result = await pool.query(
      `INSERT INTO workspace (name, slug, reporting_currency, default_locale) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, slug, reportingCurrency || 'KES', defaultLocale || 'en-KE']
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: { code: 'DUPLICATE_SLUG', message: 'Workspace slug already exists' } 
      });
    }
    console.error('Create workspace error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating workspace' } 
    });
  }
});

// List workspaces (platform admin only)
router.get('/', authenticatePlatformAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workspace ORDER BY created_at DESC'
    );

    res.json({ data: result.rows });
  } catch (error) {
    console.error('List workspaces error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching workspaces' } 
    });
  }
});

// Get current workspace (tenant)
router.get('/current', authenticateTenant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workspace WHERE id = $1',
      [req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Workspace not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching workspace' } 
    });
  }
});

// Update workspace (tenant admin only)
router.put('/current', authenticateTenant, requireRole(['tenant_admin']), validateRequest(updateWorkspaceSchema), async (req, res) => {
  try {
    const { name, reportingCurrency, defaultLocale } = req.body;

    const result = await pool.query(
      `UPDATE workspace 
       SET name = COALESCE($1, name),
           reporting_currency = COALESCE($2, reporting_currency),
           default_locale = COALESCE($3, default_locale),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, reportingCurrency, defaultLocale, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: { code: 'NOT_FOUND', message: 'Workspace not found' } 
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating workspace' } 
    });
  }
});

export default router;
