-- Create backup system tables for transcription management
-- Migration: 008_create_backup_system_tables.sql

-- Projects for organizing work
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);

-- Transcriptions
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_backup_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  auto_backup_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);

-- Media files
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  external_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Transcription-Media relationship (many-to-many)
CREATE TABLE IF NOT EXISTS transcription_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transcription_id, media_id)
);

-- Backup versions
CREATE TABLE IF NOT EXISTS transcription_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER,
  blocks_count INTEGER,
  speakers_count INTEGER,
  words_count INTEGER,
  change_summary TEXT,
  UNIQUE(transcription_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_project_id ON transcriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_project_id ON media_files(project_id);
CREATE INDEX IF NOT EXISTS idx_transcription_media_transcription ON transcription_media(transcription_id);
CREATE INDEX IF NOT EXISTS idx_transcription_media_media ON transcription_media(media_id);
CREATE INDEX IF NOT EXISTS idx_backups_transcription ON transcription_backups(transcription_id);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON transcription_backups(created_at);

-- Add trigger to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();