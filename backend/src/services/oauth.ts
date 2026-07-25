import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { env } from '../config/env-validation';

export class OAuthService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Google OAuth Strategy - only initialize if credentials are provided
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
        passReqToCallback: true
      }, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if user exists
        const existingUser = await this.pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          // User exists, update Google ID if not set
          const user = existingUser.rows[0];
          if (!user.google_id) {
            await this.pool.query(
              'UPDATE users SET google_id = $1 WHERE id = $2',
              [googleId, user.id]
            );
          }
          return done(null, user);
        }

        // Create new user
        const newUser = await this.pool.query(
          `INSERT INTO users (email, name, google_id, workspace_id, roles, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
           RETURNING *`,
          [email, name, googleId, req.workspaceId, ['user']]
        );

        return done(null, newUser.rows[0]);
      } catch (error) {
        return done(error, null);
      }
    }));
    } else {
      console.log('Google OAuth credentials not provided, skipping OAuth strategy initialization');
    }
  }

  async generateOAuthToken(user: any): Promise<string> {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        workspaceId: user.workspace_id,
        roles: user.roles
      },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as string }
    );
  }

  async linkOAuthAccount(userId: string, provider: string, providerId: string, profileData: any): Promise<void> {
    try {
      if (provider === 'google') {
        await this.pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [providerId, userId]
        );
      }
      // Add other providers as needed
    } catch (error) {
      throw new Error('Failed to link OAuth account');
    }
  }

  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    try {
      if (provider === 'google') {
        await this.pool.query(
          'UPDATE users SET google_id = NULL WHERE id = $1',
          [userId]
        );
      }
      // Add other providers as needed
    } catch (error) {
      throw new Error('Failed to unlink OAuth account');
    }
  }

  async getOAuthProviders(userId: string): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT google_id FROM users WHERE id = $1',
        [userId]
      );

      const user = result.rows[0];
      return {
        google: !!user.google_id
        // Add other providers as needed
      };
    } catch (error) {
      throw new Error('Failed to get OAuth providers');
    }
  }
}