-- Migration: Add auto-generation tracking fields
-- Date: 2025-01-25
-- Description: Adds fields to track auto-generated shortcut variations

-- Add auto-generation tracking columns
ALTER TABLE system_shortcuts 
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS base_shortcut_id UUID REFERENCES system_shortcuts(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_shortcuts_base_shortcut ON system_shortcuts(base_shortcut_id);
CREATE INDEX IF NOT EXISTS idx_system_shortcuts_auto_generated ON system_shortcuts(is_auto_generated);

-- Add comments for documentation
COMMENT ON COLUMN system_shortcuts.is_auto_generated IS 'True if this shortcut was auto-generated from another shortcut';
COMMENT ON COLUMN system_shortcuts.base_shortcut_id IS 'Reference to the original shortcut this was generated from';