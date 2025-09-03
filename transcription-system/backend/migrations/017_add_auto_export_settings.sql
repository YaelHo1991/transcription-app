-- Migration 017: Add Auto Export Settings
-- Purpose: Add auto Word export functionality for users

-- Add auto export settings to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auto_word_export_enabled BOOLEAN DEFAULT FALSE;

-- Add column to track last auto export time for rate limiting
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_auto_export TIMESTAMP NULL;

-- Create table to track auto-export history
CREATE TABLE IF NOT EXISTS auto_export_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    media_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    export_status VARCHAR(50) DEFAULT 'success',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_exports (user_id, created_at),
    INDEX idx_export_status (export_status)
);

-- Update user_storage_quotas to ensure it exists and has proper defaults
ALTER TABLE user_storage_quotas 
MODIFY COLUMN quota_limit BIGINT NOT NULL DEFAULT 524288000; -- 500MB default

-- Grant permissions for transcription_user
GRANT ALL PRIVILEGES ON auto_export_history TO 'transcription_user'@'localhost';