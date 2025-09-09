-- Rollback Migration: Remove hybrid storage fields from media_files table
-- This migration removes all hybrid storage functionality columns from media_files table
-- Use this to rollback migration 020_add_hybrid_storage_fields.sql
-- Created: 2025-09-09

-- Remove the updated_at trigger if it was created by the forward migration
-- (Only remove if there are no other dependencies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'media_files' 
    AND trigger_name = 'update_media_files_updated_at'
  ) THEN
    DROP TRIGGER update_media_files_updated_at ON media_files;
  END IF;
END $$;

-- Remove validation constraints
ALTER TABLE media_files DROP CONSTRAINT IF EXISTS check_chunked_storage_has_info;
ALTER TABLE media_files DROP CONSTRAINT IF EXISTS check_local_storage_has_path_and_computer;

-- Drop indexes created by the forward migration
DROP INDEX IF EXISTS idx_media_files_hybrid_lookup;
DROP INDEX IF EXISTS idx_media_files_last_local_check;
DROP INDEX IF EXISTS idx_media_files_computer_id;
DROP INDEX IF EXISTS idx_media_files_storage_type;

-- Remove hybrid storage columns
ALTER TABLE media_files 
DROP COLUMN IF EXISTS last_local_check,
DROP COLUMN IF EXISTS computer_id,
DROP COLUMN IF EXISTS storage_settings,
DROP COLUMN IF EXISTS chunk_info,
DROP COLUMN IF EXISTS original_path,
DROP COLUMN IF EXISTS storage_type;

-- Remove updated_at column if it was added by this migration
-- (Check if it was added by checking if any other table uses this pattern)
DO $$
BEGIN
  -- Only drop updated_at if no other triggers depend on it for media_files
  -- and if it's not referenced elsewhere
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_files' AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'media_files' 
    AND trigger_name LIKE '%updated_at%'
  ) THEN
    -- Only drop if this column was likely added by our migration
    -- (it has a default value of CURRENT_TIMESTAMP)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'media_files' 
      AND column_name = 'updated_at'
      AND column_default LIKE '%CURRENT_TIMESTAMP%'
    ) THEN
      ALTER TABLE media_files DROP COLUMN updated_at;
    END IF;
  END IF;
END $$;