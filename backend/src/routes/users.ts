import { Router } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateTenant, requireRole, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createUserSchema, updateUserSchema } from '../validations/users';
import { env } from '../config/env-validation';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';
import { parseFilterParams, buildFilterClause, buildDateRangeFilter } from '../utils/filters';
import { EmailService } from '../services/email-service';

const router = Router();
const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  roles: z.array(z.enum(['platform_admin', 'tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer', 'client'])).default(['staff_viewer'])
});

// List users in workspace (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortOrder, role, status, createdAfter, createdBefore } = req.query;

    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [((req as AuthRequest).workspaceId as string)];
    let paramCount = 1;

    const filters = parseFilterParams(req.query);
    const allowedFields = ['role', 'status', 'email', 'name'];

    if (filters.length > 0) {
      const validFilters = filters.filter(f => allowedFields.includes(f.field));
      const filterResult = buildFilterClause(validFilters, params, paramCount + 1);
      whereClause += filterResult.clause;
      params.push(...filterResult.newParams.slice(params.length));
      paramCount = filterResult.newIndex;
    }

    if (role) {
      paramCount++;
      whereClause += ` AND roles @> $${paramCount}::jsonb`;
      params.push(JSON.stringify([role]));
    }

    if (status) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    if (createdAfter || createdBefore) {
      const dateFilter = buildDateRangeFilter(
        { field: 'created_at', startDate: createdAfter as string, endDate: createdBefore as string },
        params,
        paramCount + 1
      );
      whereClause += dateFilter.clause;
      params.push(...dateFilter.newParams.slice(params.length));
      paramCount = dateFilter.newIndex;
    }

    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT id, email, name, roles, is_active, last_login_at, created_at
      FROM users
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(pagination.limit, pagination.offset);

    const result = await pool.query(dataQuery, params);

    const paginatedResult = buildPaginationResult(result.rows, total, pagination);

    res.json(paginatedResult);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching users' }
    });
  }
});

// Invite user (tenant admin only)
router.post('/invite', authenticateTenant, requireRole(['tenant_admin']), validateRequest(inviteUserSchema), async (req, res) => {
  try {
    const { email, name, roles } = req.body;

    const existing = await pool.query(
      'SELECT id FROM users WHERE workspace_id = $1 AND email = $2',
      [((req as AuthRequest).workspaceId as string), email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'User already exists in workspace' }
      });
    }

    const passwordHash = await bcrypt.hash('Temp@123', 10);
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, ((req as AuthRequest).workspaceId as string), email, passwordHash, name, roles]
    );

    if (env.SMTP_HOST) {
      try {
        const workspaceResult = await pool.query(
          'SELECT name FROM workspace WHERE id = $1',
          [((req as AuthRequest).workspaceId as string)]
        );
        const workspaceName = workspaceResult.rows[0]?.name || 'QMS';

        const emailService = new EmailService(
          {
            host: env.SMTP_HOST,
            port: parseInt(env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: env.SMTP_USER || '',
              pass: env.SMTP_PASS || ''
            }
          },
          pool
        );

        await emailService.sendWelcomeEmail(email, name, workspaceName);
      } catch (emailError) {
        console.error('Invite email error:', emailError);
      }
    }

    res.status(201).json({
      data: {
        id: userId,
        email,
        name,
        roles,
        message: 'User created with temporary password: Temp@123'
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred inviting user' }
    });
  }
});

// Create user (tenant admin only)
router.post('/', authenticateTenant, requireRole(['tenant_admin']), validateRequest(createUserSchema), async (req, res) => {
  try {
    const { email, name, roles } = req.body;

    const existing = await pool.query(
      'SELECT id FROM users WHERE workspace_id = $1 AND email = $2',
      [((req as AuthRequest).workspaceId as string), email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: { code: 'USER_EXISTS', message: 'User already exists in workspace' }
      });
    }

    const passwordHash = await bcrypt.hash('Temp@123', 10);
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, ((req as AuthRequest).workspaceId as string), email, passwordHash, name, roles]
    );

    res.status(201).json({
      data: {
        id: userId,
        email,
        name,
        roles,
        message: 'User created with temporary password: Temp@123'
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred creating user' }
    });
  }
});

// Update user (tenant admin only)
router.put('/:id', authenticateTenant, requireRole(['tenant_admin']), validateRequest(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roles, isActive } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           roles = COALESCE($2, roles),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND workspace_id = $5
       RETURNING id, email, name, roles, is_active`,
      [name, roles, isActive, id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred updating user' }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/{id}/deactivate:
 *   post:
 *     summary: Deactivate a user
 *     tags: [Users]
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
 *         description: User deactivated successfully
 */
router.post('/:id/deactivate', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === ((req as AuthRequest).userId as string)) {
      return res.status(400).json({
        error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'Cannot deactivate yourself' }
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND workspace_id = $2
       RETURNING id, email, name, roles, is_active`,
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred deactivating user' }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/{id}/activate:
 *   post:
 *     summary: Activate a user
 *     tags: [Users]
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
 *         description: User activated successfully
 */
router.post('/:id/activate', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND workspace_id = $2
       RETURNING id, email, name, roles, is_active`,
      [id, ((req as AuthRequest).workspaceId as string)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred activating user' }
    });
  }
});

// Reset user password (tenant admin only)
router.post('/:id/reset-password', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND workspace_id = $3',
      [passwordHash, id, ((req as AuthRequest).workspaceId as string)]
    );

    res.json({ data: { message: 'Password reset successfully' } });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred resetting password' }
    });
  }
});

export default router;
