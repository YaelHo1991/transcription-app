-- Migration 018: Create user_storage_quotas table
-- Purpose: Create missing user_storage_quotas table for storage management

-- Create user_storage_quotas table
CREATE TABLE IF NOT EXISTS user_storage_quotas (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    quota_limit BIGINT NOT NULL DEFAULT 524288000, -- 500MB default in bytes
    quota_used BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_storage (user_id),
    INDEX idx_quota_usage (quota_used)
);

-- Grant permissions for transcription_user
GRANT ALL PRIVILEGES ON user_storage_quotas TO 'transcription_user'@'localhost';