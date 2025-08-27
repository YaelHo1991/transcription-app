-- Migration 016: Create Storage Quota Tables
-- Purpose: Track user storage quotas and project metadata for hybrid storage system

-- User storage quota tracking
CREATE TABLE IF NOT EXISTS user_storage_quotas (
    user_id VARCHAR(255) PRIMARY KEY,
    quota_limit BIGINT NOT NULL DEFAULT 524288000, -- 500MB default in bytes
    quota_used BIGINT NOT NULL DEFAULT 0,
    quota_type VARCHAR(50) DEFAULT 'free', -- free, basic, pro, custom
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project metadata for new upload system
CREATE TABLE IF NOT EXISTS project_metadata (
    project_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    internal_name VARCHAR(255) NOT NULL, -- System-generated unique name
    display_name VARCHAR(255) NOT NULL, -- User-visible folder name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_media_files INT DEFAULT 0,
    storage_used BIGINT DEFAULT 0, -- Bytes used in server storage
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_projects (user_id),
    INDEX idx_display_name (display_name)
);

-- Media file tracking with multi-computer support
CREATE TABLE IF NOT EXISTS media_files (
    media_id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK(file_type IN ('local', 'url', 'server')),
    file_size BIGINT,
    file_format VARCHAR(50),
    duration VARCHAR(50),
    fingerprint VARCHAR(100), -- For duplicate detection
    server_path TEXT, -- Path if uploaded to server
    server_uploaded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES project_metadata(project_id) ON DELETE CASCADE,
    INDEX idx_project_media (project_id),
    INDEX idx_fingerprint (fingerprint)
);

-- Computer source tracking for local files
CREATE TABLE IF NOT EXISTS media_sources (
    source_id INT AUTO_INCREMENT PRIMARY KEY,
    media_id VARCHAR(255) NOT NULL,
    computer_id VARCHAR(255) NOT NULL,
    computer_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (media_id) REFERENCES media_files(media_id) ON DELETE CASCADE,
    INDEX idx_media_sources (media_id),
    INDEX idx_computer (computer_id),
    UNIQUE KEY unique_media_computer (media_id, computer_id)
);

-- Media notes for tracking changes and updates
CREATE TABLE IF NOT EXISTS media_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    media_id VARCHAR(255) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media_files(media_id) ON DELETE CASCADE,
    INDEX idx_media_notes (media_id)
);

-- Add storage quota info to existing users
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_limit BIGINT DEFAULT 524288000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_used BIGINT DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_user_display ON project_metadata(user_id, display_name);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_quota_user ON user_storage_quotas(user_id);

-- Initialize storage quotas for existing users
INSERT INTO user_storage_quotas (user_id, quota_limit, quota_used, quota_type)
SELECT id, 524288000, 0, 'free' 
FROM users
WHERE id NOT IN (SELECT user_id FROM user_storage_quotas);

-- Grant permissions for transcription_user
GRANT ALL PRIVILEGES ON user_storage_quotas TO 'transcription_user'@'localhost';
GRANT ALL PRIVILEGES ON project_metadata TO 'transcription_user'@'localhost';
GRANT ALL PRIVILEGES ON media_files TO 'transcription_user'@'localhost';
GRANT ALL PRIVILEGES ON media_sources TO 'transcription_user'@'localhost';
GRANT ALL PRIVILEGES ON media_notes TO 'transcription_user'@'localhost';