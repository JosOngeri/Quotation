import { Router } from 'express';
import passport from 'passport';
import { Pool } from 'pg';
import { OAuthService } from '../services/oauth';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const oauthService = new OAuthService(pool);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     tags: [OAuth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth page
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [OAuth]
 *     responses:
 *       200:
 *         description: OAuth authentication successful
 *       401:
 *         description: OAuth authentication failed
 */
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req: any, res) => {
  try {
    const user = req.user;
    const token = await oauthService.generateOAuthToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        workspaceId: user.workspace_id
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete OAuth authentication'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/oauth/link:
 *   post:
 *     summary: Link OAuth account to existing user
 *     tags: [OAuth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - providerId
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, microsoft]
 *               providerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OAuth account linked successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid request
 */
router.post('/oauth/link', async (req: any, res) => {
  try {
    const userId = req.userId;
    const { provider, providerId } = req.body;

    if (!provider || !providerId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'provider and providerId are required'
        }
      });
    }

    await oauthService.linkOAuthAccount(userId, provider, providerId, req.body);

    res.json({
      message: 'OAuth account linked successfully'
    });
  } catch (error) {
    console.error('OAuth link error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to link OAuth account'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/oauth/unlink:
 *   post:
 *     summary: Unlink OAuth account from user
 *     tags: [OAuth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, microsoft]
 *     responses:
 *       200:
 *         description: OAuth account unlinked successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid request
 */
router.post('/oauth/unlink', async (req: any, res) => {
  try {
    const userId = req.userId;
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'provider is required'
        }
      });
    }

    await oauthService.unlinkOAuthAccount(userId, provider);

    res.json({
      message: 'OAuth account unlinked successfully'
    });
  } catch (error) {
    console.error('OAuth unlink error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to unlink OAuth account'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/oauth/providers:
 *   get:
 *     summary: Get linked OAuth providers for user
 *     tags: [OAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     google:
 *                       type: boolean
 *                     microsoft:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/oauth/providers', async (req: any, res) => {
  try {
    const userId = req.userId;
    const providers = await oauthService.getOAuthProviders(userId);

    res.json({
      data: providers
    });
  } catch (error) {
    console.error('Get OAuth providers error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get OAuth providers'
      }
    });
  }
});

export default router;