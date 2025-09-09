-- Migration: Add hybrid storage fields to media_files table
-- This migration extends the media_files table with columns for hybrid storage functionality
-- allowing files to be stored locally, on server, or using chunked server storage
-- Created: 2025-09-09

-- Add hybrid storage columns to media_files table
ALTER TABLE media_files 
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'server' CHECK (storage_type IN ('local', 'server', 'server_chunked')),
ADD COLUMN IF NOT EXISTS original_path TEXT,
ADD COLUMN IF NOT EXISTS chunk_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS storage_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS computer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_local_check TIMESTAMP;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_media_files_storage_type ON media_files(storage_type);
CREATE INDEX IF NOT EXISTS idx_media_files_computer_id ON media_files(computer_id) WHERE computer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_files_last_local_check ON media_files(last_local_check) WHERE last_local_check IS NOT NULL;

-- Create composite index for efficient hybrid storage queries
CREATE INDEX IF NOT EXISTS idx_media_files_hybrid_lookup ON media_files(user_id, storage_type, computer_id);

-- Add comments for documentation
COMMENT ON COLUMN media_files.storage_type IS 'Storage method: local (user computer), server (server storage), server_chunked (chunked server storage)';
COMMENT ON COLUMN media_files.original_path IS 'Full path to the file on the user''s local computer';
COMMENT ON COLUMN media_files.chunk_info IS 'Metadata for chunked storage including chunk count, chunk size, and chunk URLs';
COMMENT ON COLUMN media_files.storage_settings IS 'User preferences and settings for storage behavior';
COMMENT ON COLUMN media_files.computer_id IS 'Unique identifier for the computer that has the local file';
COMMENT ON COLUMN media_files.last_local_check IS 'Timestamp when the local file was last verified to exist';

-- Add validation constraint for chunked storage
ALTER TABLE media_files 
ADD CONSTRAINT check_chunked_storage_has_info 
CHECK (
  storage_type != 'server_chunked' OR 
  (chunk_info IS NOT NULL AND jsonb_typeof(chunk_info) = 'object')
);

-- Add validation constraint for local storage
ALTER TABLE media_files 
ADD CONSTRAINT check_local_storage_has_path_and_computer 
CHECK (
  storage_type != 'local' OR 
  (original_path IS NOT NULL AND computer_id IS NOT NULL)
);

-- Update the updated_at trigger to include these new columns if it doesn't already exist
-- (The trigger function already exists from migration 008, just ensure it applies to media_files)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'media_files' 
    AND trigger_name = 'update_media_files_updated_at'
  ) THEN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'media_files' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE media_files ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Create the trigger
    CREATE TRIGGER update_media_files_updated_at 
    BEFORE UPDATE ON media_files
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;