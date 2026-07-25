import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import logger from '../config/logging';

interface AuditLogData {
  userId?: string;
  workspaceId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

export class AuditLogger {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_log (user_id, workspace_id, action, entity_type, entity_id, changes, ip_address, user_agent, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          data.userId || null,
          data.workspaceId || null,
          data.action,
          data.entityType || null,
          data.entityId || null,
          data.changes ? JSON.stringify(data.changes) : null,
          data.ipAddress || null,
          data.userAgent || null,
          data.status || 'success',
          data.errorMessage || null
        ]
      );
      
      logger.info({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        status: data.status
      }, 'Audit log entry created');
    } catch (error) {
      logger.error({ error, auditData: data }, 'Failed to create audit log entry');
    }
  }

  async logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'password_change' | 'password_reset',
    status: 'success' | 'failure',
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth_${action}`,
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  }

  async logCRUD(
    userId: string,
    workspaceId: string,
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    changes?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      workspaceId,
      action: `${action}_${entityType}`,
      entityType,
      entityId,
      changes,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  async logPermissionChange(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    oldRoles: string[],
    newRoles: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      workspaceId,
      action: 'permission_change',
      entityType: 'user',
      entityId: targetUserId,
      changes: {
        oldRoles,
        newRoles
      },
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  async logError(
    userId: string,
    workspaceId: string,
    action: string,
    error: Error,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      workspaceId,
      action,
      ipAddress,
      userAgent,
      status: 'failure',
      errorMessage: error.message
    });
  }
}

// Middleware factory for automatic audit logging
export const createAuditMiddleware = (auditLogger: AuditLogger) => {
  return (action: string, entityType?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const userId = (req as any).userId;
      const workspaceId = (req as any).workspaceId;
      const entityId = req.params.id || req.body.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      // Intercept response to log on completion
      res.send = function(this: Response, data: any) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        if (userId) {
          auditLogger.log({
            userId,
            workspaceId,
            action,
            entityType,
            entityId,
            changes: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
            ipAddress,
            userAgent,
            status: isSuccess ? 'success' : 'failure',
            errorMessage: !isSuccess ? `HTTP ${statusCode}` : undefined
          }).catch(err => {
            logger.error({ err }, 'Failed to log audit entry in middleware');
          });
        }

        originalSend.call(this, data);
      };

      next();
    };
  };
};

// Helper to extract IP address from request
export const getIpAddress = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// Helper to extract user agent from request
export const getUserAgent = (req: Request): string => {
  return req.get('user-agent') || 'unknown';
};