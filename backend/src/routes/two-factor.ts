import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant } from '../middleware/auth';
import { TwoFactorService } from '../services/two-factor';
import { validateRequest } from '../middleware/validation';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const twoFactorService = new TwoFactorService(pool);

/**
 * @swagger
 * /api/v1/two-factor/setup:
 *   post:
 *     summary: Setup two-factor authentication
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/setup', authenticateTenant, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const setup = await twoFactorService.setupTwoFactor(userId);
    
    res.json({
      data: setup
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to setup 2FA'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/two-factor/verify:
 *   post:
 *     summary: Verify two-factor authentication setup
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA verified successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid token
 */
router.post('/verify', authenticateTenant, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required'
        }
      });
    }
    
    const verification = await twoFactorService.verifyTwoFactorSetup(userId, token);
    
    if (verification.verified) {
      res.json({
        data: verification
      });
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_TOKEN',
          message: verification.message
        }
      });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify 2FA'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/two-factor/authenticate:
 *   post:
 *     summary: Authenticate with two-factor token
 *     tags: [TwoFactor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA authentication successful
 *       401:
 *         description: Invalid token
 *       400:
 *         description: Invalid request
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId and token are required'
        }
      });
    }
    
    const verification = await twoFactorService.verifyTwoFactorToken(userId, token);
    
    if (verification.verified) {
      res.json({
        data: verification
      });
    } else {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: verification.message
        }
      });
    }
  } catch (error) {
    console.error('2FA authentication error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to authenticate with 2FA'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/two-factor/disable:
 *   post:
 *     summary: Disable two-factor authentication
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/disable', authenticateTenant, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    await twoFactorService.disableTwoFactor(userId);
    
    res.json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to disable 2FA'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/two-factor/status:
 *   get:
 *     summary: Get two-factor authentication status
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticateTenant, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const enabled = await twoFactorService.isTwoFactorEnabled(userId);
    
    res.json({
      data: {
        enabled
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get 2FA status'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/two-factor/backup-codes:
 *   post:
 *     summary: Regenerate backup codes
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/backup-codes', authenticateTenant, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const backupCodes = await twoFactorService.regenerateBackupCodes(userId);
    
    res.json({
      data: {
        backupCodes
      }
    });
  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to regenerate backup codes'
      }
    });
  }
});

export default router;