-- Migration 019 Rollback: Remove Auto-Correct Settings from Users Table
-- Purpose: Rollback the auto-correct functionality settings for users

-- Drop the index first (if it exists)
DROP INDEX IF EXISTS idx_users_autocorrect_settings;

-- Remove the autocorrect_settings column from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS autocorrect_settings;

-- Verification query (commented out for production)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'autocorrect_settings';