-- Add two-factor authentication columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN users.two_factor_secret IS 'Secret key for TOTP-based two-factor authentication';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Backup codes for two-factor authentication recovery';
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether two-factor authentication is enabled for the user';

-- Create index for users with 2FA enabled
CREATE INDEX idx_users_two_factor_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = true;