-- Migration: Add password reset fields to users table
-- Created: 2025-08-25

-- Add password reset token fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Create index for reset token lookup performance
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Unique token for password reset, expires after use';
COMMENT ON COLUMN users.reset_token_expires IS 'Expiration timestamp for reset token';