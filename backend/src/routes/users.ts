import { Router } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createUserSchema, updateUserSchema } from '../validations/users';
import { env } from '../config/env-validation';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';
import { parseFilterParams, buildFilterClause, buildDateRangeFilter, sanitizeFieldName } from '../utils/filters';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// List users in workspace (tenant)
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortOrder, role, status, createdAfter, createdBefore } = req.query;
    
    // Parse pagination parameters
    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    // Build WHERE clause
    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [req.workspaceId];
    let paramCount = 1;

    // Parse and apply filters
    const filters = parseFilterParams(req.query);
    const allowedFields = ['role', 'status', 'email', 'name'];
    
    if (filters.length > 0) {
      const validFilters = filters.filter(f => allowedFields.includes(f.field));
      const filterResult = buildFilterClause(validFilters, params, paramCount + 1);
      whereClause += filterResult.clause;
      params.push(...filterResult.newParams.slice(params.length));
      paramCount = filterResult.newIndex;
    }

    // Apply role filter
    if (role) {
      paramCount++;
      whereClause += ` AND roles @> $${paramCount}::jsonb`;
      params.push(JSON.stringify([role]));
    }

    // Apply status filter
    if (status) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    // Apply date range filter
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

    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT id, email, name, roles, is_active, last_login_at, created_at 
      FROM users 
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
    console.error('List users error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching users' } 
    });
  }
});

// Invite user (tenant admin only)
router.post('/', authenticateTenant, requireRole(['tenant_admin']), validateRequest(createUserSchema), async (req, res) => {
  try {
    const { email, name, roles } = req.body;

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE workspace_id = $1 AND email = $2',
      [req.workspaceId, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: { code: 'USER_EXISTS', message: 'User already exists in workspace' } 
      });
    }

    const passwordHash = await bcrypt.hash('Temp@123', 10); // Temporary password
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, workspace_id, email, password_hash, name, roles) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, req.workspaceId, email, passwordHash, name, roles]
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
      [name, roles, isActive, id, req.workspaceId]
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

// Reset user password (tenant admin only)
router.post('/:id/reset-password', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Validate password format
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND workspace_id = $3',
      [passwordHash, id, req.workspaceId]
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
