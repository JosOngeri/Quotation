-- Add OAuth provider columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255);

-- Add unique constraints for OAuth IDs
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id) WHERE microsoft_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID';
COMMENT ON COLUMN users.microsoft_id IS 'Microsoft Azure AD user ID';