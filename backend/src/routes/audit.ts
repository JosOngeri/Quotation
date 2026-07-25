import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { AuditLogger } from '../middleware/audit-logging';
import { parsePaginationParams, buildPaginationResult, buildOrderByClause } from '../utils/pagination';
import { parseFilterParams, buildFilterClause, buildDateRangeFilter } from '../utils/filters';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize audit logger
const auditLogger = new AuditLogger(pool);

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortOrder, action, entityType, userId, startDate, endDate } = req.query;
    
    // Parse pagination parameters
    const pagination = parsePaginationParams({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC'
    });

    // Build WHERE clause
    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [(req as any).workspaceId];
    let paramCount = 1;

    // Apply action filter
    if (action) {
      paramCount++;
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
    }

    // Apply entity type filter
    if (entityType) {
      paramCount++;
      whereClause += ` AND entity_type = $${paramCount}`;
      params.push(entityType);
    }

    // Apply user filter
    if (userId) {
      paramCount++;
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(userId);
    }

    // Apply date range filter
    if (startDate || endDate) {
      const dateFilter = buildDateRangeFilter(
        { field: 'created_at', startDate: startDate as string, endDate: endDate as string },
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
      FROM audit_log 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM audit_log 
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
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit logs'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/audit-logs/export:
 *   get:
 *     summary: Export audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/export', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workspaceId = (req as any).workspaceId;

    let whereClause = 'WHERE workspace_id = $1';
    const params: any[] = [workspaceId];
    let paramCount = 1;

    // Apply date range filter
    if (startDate || endDate) {
      const dateFilter = buildDateRangeFilter(
        { field: 'created_at', startDate: startDate as string, endDate: endDate as string },
        params,
        paramCount + 1
      );
      whereClause += dateFilter.clause;
      params.push(...dateFilter.newParams.slice(params.length));
      paramCount = dateFilter.newIndex;
    }

    const query = `
      SELECT * FROM audit_log 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, params);

    // Convert to CSV format
    const headers = ['ID', 'User ID', 'Workspace ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Status', 'Created At'];
    const csvRows = result.rows.map(row => [
      row.id,
      row.user_id,
      row.workspace_id,
      row.action,
      row.entity_type,
      row.entity_id,
      row.ip_address,
      row.status,
      row.created_at
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export audit logs'
      }
    });
  }
});

export default router;