import { Router } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../config/logging';
import { validateRequest } from '../middleware/validation';
import { authLimiter } from '../config/rate-limit';
import { accountLockout, recordFailedLogin, recordSuccessfulLogin } from '../middleware/account-lockout';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password';
import { platformLoginSchema, tenantLoginSchema, clientLoginSchema, passwordResetSchema } from '../validations/auth';
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
      { expiresIn: env.JWT_EXPIRES_IN as string }
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
 *     summary: Tenant user login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, workspaceSlug]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@joscards.example
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Tenant@123
 *               workspaceSlug:
 *                 type: string
 *                 example: joscards
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
 *                       $ref: '#/components/schemas/User'
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
// Tenant Login
router.post('/login', authLimiter, accountLockout, validateRequest(tenantLoginSchema), async (req, res) => {
  try {
    const { email, workspaceSlug, password } = req.body;
    logger.info({ email, workspaceSlug }, 'Tenant login attempt');

    const result = await pool.query(
      `SELECT u.*, w.slug as workspace_slug 
       FROM users u 
       JOIN workspace w ON u.workspace_id = w.id 
       WHERE u.email = $1 AND w.slug = $2 AND u.is_active = true`,
      [email, workspaceSlug]
    );

    if (result.rows.length === 0) {
      logger.warn({ email, workspaceSlug }, 'Tenant user not found');
      recordFailedLogin(email);
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email, password, or workspace' } 
      });
    }

    const user = result.rows[0];
    const validPassword = await comparePassword(password, user.password_hash);

    if (!validPassword) {
      logger.warn({ email, workspaceSlug }, 'Invalid password for tenant user');
      recordFailedLogin(email);
      return res.status(401).json({ 
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email, password, or workspace' } 
      });
    }

    recordSuccessfulLogin(email);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { 
        userId: user.id, 
        workspaceId: user.workspace_id, 
        roles: user.roles,
        email: user.email,
        userType: 'tenant_user'
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as string }
    );

    logger.info({ email, workspaceSlug, userId: user.id }, 'Tenant login successful');
    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          workspaceId: user.workspace_id,
          workspaceSlug: user.workspace_slug
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Tenant login error');
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
      { expiresIn: env.JWT_EXPIRES_IN as string }
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
      { expiresIn: env.JWT_EXPIRES_IN as string }
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

export default router;
