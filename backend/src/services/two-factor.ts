import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Pool } from 'pg';

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface TwoFactorVerification {
  verified: boolean;
  message: string;
}

export class TwoFactorService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  generateSecret(): string {
    return speakeasy.generateSecret({
      name: 'QMS',
      issuer: 'Quotation Management System'
    }).base32;
  }

  generateBackupCodes(count: number = 10): string[] {
    const backupCodes: string[] = [];
    for (let i = 0; i < count; i++) {
      backupCodes.push(speakeasy.generateSecret({ length: 8 }).base32);
    }
    return backupCodes;
  }

  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    // Generate QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: 'QMS',
      issuer: 'Quotation Management System',
      encoding: 'base32'
    });

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Store secret and backup codes in database
    await this.pool.query(
      `UPDATE users 
       SET two_factor_secret = $1, 
           two_factor_backup_codes = $2,
           two_factor_enabled = false
       WHERE id = $3`,
      [secret, JSON.stringify(backupCodes), userId]
    );

    return {
      secret,
      qrCode,
      backupCodes
    };
  }

  async verifyTwoFactorSetup(userId: string, token: string): Promise<TwoFactorVerification> {
    // Get user's secret
    const result = await this.pool.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { verified: false, message: 'User not found' };
    }

    const secret = result.rows[0].two_factor_secret;
    if (!secret) {
      return { verified: false, message: '2FA not set up' };
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (verified) {
      // Enable 2FA
      await this.pool.query(
        'UPDATE users SET two_factor_enabled = true WHERE id = $1',
        [userId]
      );
      return { verified: true, message: '2FA verified and enabled' };
    }

    return { verified: false, message: 'Invalid token' };
  }

  async verifyTwoFactorToken(userId: string, token: string): Promise<TwoFactorVerification> {
    // Get user's secret
    const result = await this.pool.query(
      'SELECT two_factor_secret, two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { verified: false, message: 'User not found' };
    }

    const secret = result.rows[0].two_factor_secret;
    const backupCodes = result.rows[0].two_factor_backup_codes;

    if (!secret) {
      return { verified: false, message: '2FA not enabled' };
    }

    // Check if token is a backup code
    if (backupCodes && Array.isArray(backupCodes)) {
      const backupCodeIndex = backupCodes.indexOf(token);
      if (backupCodeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);
        await this.pool.query(
          'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
          [JSON.stringify(backupCodes), userId]
        );
        return { verified: true, message: 'Backup code used' };
      }
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (verified) {
      return { verified: true, message: 'Token verified' };
    }

    return { verified: false, message: 'Invalid token' };
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users 
       SET two_factor_secret = NULL, 
           two_factor_backup_codes = NULL,
           two_factor_enabled = false
       WHERE id = $1`,
      [userId]
    );
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].two_factor_enabled || false;
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes();

    await this.pool.query(
      'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
      [JSON.stringify(backupCodes), userId]
    );

    return backupCodes;
  }
}