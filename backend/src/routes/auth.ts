import { Router } from 'express';
import { authenticate, normalizeRoles } from '../middleware/auth';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../config/logging';
import { validateRequest } from '../middleware/validation';
import { authLimiter } from '../config/rate-limit';
import { accountLockout, recordFailedLogin, recordSuccessfulLogin } from '../middleware/account-lockout';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password';
import { platformLoginSchema, clientLoginSchema, unifiedLoginSchema, passwordResetSchema } from '../validations/auth';
import { env } from '../config/env-validation';
import { initializeEmailService } from '../config/email';
import { AuditLogger, getIpAddress, getUserAgent } from '../middleware/audit-logging';
import { TwoFactorService } from '../services/two-factor';
import oauthRoutes from './oauth';

const router = Router();
const pool = new Pool({ 
  connectionString: env.DATABASE_URL
});

// Initialize email service
const emailService = initializeEmailService(pool);

// Initialize audit logger
const auditLogger = new AuditLogger(pool);

// Initialize 2FA service
const twoFactorService = new TwoFactorService(pool);

// Mount OAuth routes
router.use(oauthRoutes);

/**
 * @swagger
 * /api/v1/auth/platform-login:
 *   post:
 *     summary: Platform admin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@qms.platform
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/PlatformAdmin'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Platform Admin Login
router.post('/platform-login', authLimiter, accountLockout, validateRequest(platformLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info({ email }, 'Platform admin login attempt');

    const result = await pool.query(
      'SELECT * FROM platform_admin WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn({ email }, 'Platform admin not found');
      recordFailedLogin(email);
      
      // Log failed login attempt
      await auditLogger.logAuthentication(
        'unknown',
        'login',
        'failure',
        getIpAddress(req),
        getUserAgent(req),
        'Platform admin not found'
      );
      
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } 
      });
    }

    const admin = result.rows[0];
    const validPassword = await comparePassword(password, admin.password_hash);

    if (!validPassword) {
      logger.warn({ email }, 'Invalid password for platform admin');
      recordFailedLogin(email);
      
      // Log failed login attempt
      await auditLogger.logAuthentication(
        admin.id,
        'login',
        'failure',
        getIpAddress(req),
        getUserAgent(req),
        'Invalid password'
      );
      
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } 
      });
    }

    recordSuccessfulLogin(email);

    // Log successful login
    await auditLogger.logAuthentication(
      admin.id,
      'login',
      'success',
      getIpAddress(req),
      getUserAgent(req)
    );

    // Check if 2FA is enabled
    const twoFactorEnabled = await twoFactorService.isTwoFactorEnabled(admin.id);
    
    if (twoFactorEnabled) {
      // Return a temporary token that requires 2FA verification
      const tempToken = jwt.sign(
        { 
          userId: admin.id, 
          userType: 'platform_admin', 
          email: admin.email,
          requiresTwoFactor: true 
        },
        env.JWT_SECRET as string,
        { expiresIn: '5m' } // Short-lived token for 2FA verification
      );

      return res.json({
        requiresTwoFactor: true,
        tempToken,
        userId: admin.id
      });
    }

    const token = jwt.sign(
      { userId: admin.id, userType: 'platform_admin', email: admin.email },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    logger.info({ email, adminId: admin.id }, 'Platform admin login successful');
    res.json({
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          userType: 'platform_admin'
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Platform login error');
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred during login' } 
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Unified login (auto-detects platform admin, tenant, or client)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@joscards.example
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 */
// Unified Login (auto-detects platform admin / tenant / client)
router.post('/login', authLimiter, accountLockout, validateRequest(unifiedLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info({ email }, 'Login attempt');

    // Look up the email across all three user tables
    const [platformResult, tenantResult, clientResult] = await Promise.all([
      pool.query('SELECT * FROM platform_admin WHERE email = $1', [email]),
      pool.query(
        `SELECT u.*, w.slug as workspace_slug 
         FROM users u 
         JOIN workspace w ON u.workspace_id = w.id 
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      ),
      pool.query(
        `SELECT cu.*, c.name as client_name 
         FROM client_user cu 
         JOIN client c ON cu.client_id = c.id 
         WHERE cu.email = $1 AND cu.is_active = true`,
        [email]
      )
    ]);

    const candidates = [
      ...platformResult.rows.map((row: any) => ({ type: 'platform_admin', row })),
      ...tenantResult.rows.map((row: any) => ({ type: 'tenant_user', row })),
      ...clientResult.rows.map((row: any) => ({ type: 'client_user', row }))
    ];

    if (candidates.length === 0) {
      logger.warn({ email }, 'User not found');
      recordFailedLogin(email);
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Verify password and stop at the first match (platform admin > tenant > client)
    let matched: { type: string; row: any } | null = null;
    for (const candidate of candidates) {
      const valid = await comparePassword(password, candidate.row.password_hash);
      if (valid) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      logger.warn({ email }, 'Invalid password');
      recordFailedLogin(email);
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    recordSuccessfulLogin(email);

    if (matched.type === 'platform_admin') {
      const admin = matched.row;

      // Log successful login
      await auditLogger.logAuthentication(
        admin.id,
        'login',
        'success',
        getIpAddress(req),
        getUserAgent(req)
      );

      const twoFactorEnabled = await twoFactorService.isTwoFactorEnabled(admin.id);
      if (twoFactorEnabled) {
        const tempToken = jwt.sign(
          {
            userId: admin.id,
            userType: 'platform_admin',
            email: admin.email,
            requiresTwoFactor: true
          },
          env.JWT_SECRET as string,
          { expiresIn: '5m' }
        );
        return res.json({
          requiresTwoFactor: true,
          tempToken,
          userId: admin.id
        });
      }

      const token = jwt.sign(
        { userId: admin.id, userType: 'platform_admin', email: admin.email },
        env.JWT_SECRET as string,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info({ email, adminId: admin.id }, 'Platform admin login successful');
      return res.json({
        data: {
          token,
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            userType: 'platform_admin'
          }
        }
      });
    }

    if (matched.type === 'tenant_user') {
      const user = matched.row;

      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const token = jwt.sign(
        {
          userId: user.id,
          workspaceId: user.workspace_id,
          roles: normalizeRoles(user.roles),
          email: user.email,
          userType: 'tenant_user'
        },
        env.JWT_SECRET as string,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info({ email, userId: user.id }, 'Tenant user login successful');
      return res.json({
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: normalizeRoles(user.roles),
            workspaceId: user.workspace_id,
            workspaceSlug: user.workspace_slug,
            userType: 'tenant_user'
          }
        }
      });
    }

    // client_user
    const clientUser = matched.row;

    await pool.query(
      'UPDATE client_user SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [clientUser.id]
    );

    const token = jwt.sign(
      {
        userId: clientUser.id,
        clientId: clientUser.client_id,
        userType: 'client_user',
        email: clientUser.email
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    logger.info({ email, clientId: clientUser.client_id }, 'Client user login successful');
    return res.json({
      data: {
        token,
        user: {
          id: clientUser.id,
          email: clientUser.email,
          name: clientUser.name,
          clientId: clientUser.client_id,
          clientName: clientUser.client_name,
          userType: 'client_user'
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred during login' }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/client-login:
 *   post:
 *     summary: Client portal login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: client@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Client@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         name:
 *                           type: string
 *                         clientId:
 *                           type: string
 *                           format: uuid
 *                         clientName:
 *                           type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Client Portal Login
router.post('/client-login', authLimiter, accountLockout, validateRequest(clientLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info({ email }, 'Client login attempt');

    const result = await pool.query(
      `SELECT cu.*, c.name as client_name 
       FROM client_user cu 
       JOIN client c ON cu.client_id = c.id 
       WHERE cu.email = $1 AND cu.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn({ email }, 'Client user not found');
      recordFailedLogin(email);
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } 
      });
    }

    const clientUser = result.rows[0];
    const validPassword = await comparePassword(password, clientUser.password_hash);

    if (!validPassword) {
      logger.warn({ email }, 'Invalid password for client user');
      recordFailedLogin(email);
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } 
      });
    }

    recordSuccessfulLogin(email);

    // Update last login
    await pool.query(
      'UPDATE client_user SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [clientUser.id]
    );

    const token = jwt.sign(
      { 
        userId: clientUser.id, 
        clientId: clientUser.client_id,
        userType: 'client_user',
        email: clientUser.email
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    logger.info({ email, clientId: clientUser.client_id }, 'Client login successful');
    res.json({
      data: {
        token,
        user: {
          id: clientUser.id,
          email: clientUser.email,
          name: clientUser.name,
          clientId: clientUser.client_id,
          clientName: clientUser.client_name
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Client login error');
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred during login' } 
    });
  }
});

// Complete 2FA authentication
router.post('/complete-two-factor', async (req, res) => {
  try {
    const { tempToken, twoFactorToken } = req.body;
    
    if (!tempToken || !twoFactorToken) {
      return res.status(400).json({ 
        error: { code: 'VALIDATION_ERROR', message: 'tempToken and twoFactorToken are required' } 
      });
    }

    // Verify temporary token
    const decoded = jwt.verify(tempToken, env.JWT_SECRET as string) as any;
    
    if (!decoded.requiresTwoFactor) {
      return res.status(400).json({ 
        error: { code: 'INVALID_TOKEN', message: 'Token does not require 2FA' } 
      });
    }

    // Verify 2FA token
    const verification = await twoFactorService.verifyTwoFactorToken(decoded.userId, twoFactorToken);
    
    if (!verification.verified) {
      return res.status(401).json({ 
        error: { code: 'INVALID_2FA_TOKEN', message: verification.message } 
      });
    }

    // Generate final token
    const finalToken = jwt.sign(
      { 
        userId: decoded.userId, 
        userType: decoded.userType, 
        email: decoded.email 
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Log successful 2FA authentication
    await auditLogger.logAuthentication(
      decoded.userId,
      'login_2fa',
      'success',
      req.ip,
      req.get('user-agent')
    );

    res.json({
      token: finalToken,
      user: {
        id: decoded.userId,
        email: decoded.email,
        userType: decoded.userType
      }
    });
  } catch (error) {
    console.error('Complete 2FA error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } 
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    logger.info({ email }, 'Password reset requested');

    // Check if user exists in any table
    const platformAdmin = await pool.query('SELECT id FROM platform_admin WHERE email = $1', [email]);
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const clientUser = await pool.query('SELECT id FROM client_user WHERE email = $1', [email]);

    if (platformAdmin.rows.length === 0 && user.rows.length === 0 && clientUser.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store reset token (will need password_reset_tokens table)
    try {
      await pool.query(
        `INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)`,
        [email, resetToken, new Date(resetTokenExpiry)]
      );
    } catch (error) {
      logger.warn({ error }, 'Failed to store reset token (table may not exist yet)');
    }

    // Send password reset email
    try {
      const userName = 'User'; // You might want to fetch the actual user name
      await emailService.sendPasswordResetEmail(email, userName, resetToken);
      logger.info({ email }, 'Password reset email sent');
    } catch (error) {
      logger.warn({ error }, 'Failed to send password reset email');
    }

    logger.info({ email }, 'Password reset token generated');
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    logger.error({ error }, 'Password reset request error');
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } 
    });
  }
});

// Reset Password
router.post('/reset-password', validateRequest(passwordResetSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    logger.info({ token }, 'Password reset attempt');

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: { 
          code: 'WEAK_PASSWORD', 
          message: 'Password does not meet requirements',
          details: passwordValidation.errors
        }
      });
    }

    // Validate token
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      logger.warn({ token }, 'Invalid or expired reset token');
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }

    const { email } = result.rows[0];
    const hashedPassword = await hashPassword(newPassword);

    // Update password based on user type
    const platformAdmin = await pool.query('SELECT id FROM platform_admin WHERE email = $1', [email]);
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const clientUser = await pool.query('SELECT id FROM client_user WHERE email = $1', [email]);

    if (platformAdmin.rows.length > 0) {
      await pool.query('UPDATE platform_admin SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
    } else if (user.rows.length > 0) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
    } else if (clientUser.rows.length > 0) {
      await pool.query('UPDATE client_user SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
    }

    // Delete used token
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

    logger.info({ email }, 'Password reset successful');
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error({ error }, 'Password reset error');
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } 
    });
  }
});

// List available workspaces for the current user
router.get('/workspaces', authenticate, async (req: any, res) => {
  try {
    if (req.userType === 'platform_admin') {
      const result = await pool.query('SELECT id, name, slug FROM workspace ORDER BY name');
      return res.json({ data: result.rows });
    }

    if (req.userType === 'client_user') {
      return res.json({ data: [] });
    }

    // Tenant users: all workspaces they are members of
    const result = await pool.query(
      `SELECT w.id, w.name, w.slug 
       FROM workspace w
       JOIN users u ON u.workspace_id = w.id
       WHERE u.email = $1 AND u.is_active = true
       ORDER BY w.name`,
      [req.email]
    );

    res.json({ data: result.rows });
  } catch (error) {
    logger.error({ error }, 'List user workspaces error');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred fetching workspaces' }
    });
  }
});

// Switch to a different workspace and return a new token
router.post('/switch-workspace', authenticate, async (req: any, res) => {
  try {
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required' }
      });
    }

    if (req.userType === 'platform_admin') {
      const workspace = await pool.query('SELECT id, name, slug FROM workspace WHERE id = $1', [workspaceId]);
      if (workspace.rows.length === 0) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Workspace not found' }
        });
      }

      const token = jwt.sign(
        {
          userId: req.userId,
          workspaceId: workspace.rows[0].id,
          userType: 'platform_admin',
          email: req.email,
          roles: ['tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer']
        },
        env.JWT_SECRET as string,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      return res.json({
        data: {
          token,
          user: {
            id: req.userId,
            email: req.email,
            workspaceId: workspace.rows[0].id,
            workspaceSlug: workspace.rows[0].slug,
            userType: 'platform_admin'
          }
        }
      });
    }

    if (req.userType !== 'tenant_user') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Workspace switching not allowed for this user type' }
      });
    }

    const userResult = await pool.query(
      `SELECT u.*, w.slug as workspace_slug 
       FROM users u 
       JOIN workspace w ON u.workspace_id = w.id 
       WHERE u.email = $1 AND u.workspace_id = $2 AND u.is_active = true`,
      [req.email, workspaceId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' }
      });
    }

    const user = userResult.rows[0];

    const token = jwt.sign(
      {
        userId: user.id,
        workspaceId: user.workspace_id,
        roles: normalizeRoles(user.roles),
        email: user.email,
        userType: 'tenant_user'
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: normalizeRoles(user.roles),
          workspaceId: user.workspace_id,
          workspaceSlug: user.workspace_slug,
          userType: 'tenant_user'
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Switch workspace error');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred switching workspace' }
    });
  }
});

export default router;
