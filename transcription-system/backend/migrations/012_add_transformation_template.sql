-- Migration: Add transformation template support
-- Date: 2025-01-25
-- Description: Adds transformation_template column to allow custom transformation patterns

-- Add transformation_template column to category_transformations table
ALTER TABLE category_transformations 
ADD COLUMN IF NOT EXISTS transformation_template VARCHAR(200);

-- Update existing transformations with default templates
UPDATE category_transformations 
SET transformation_template = '{prefix}- {expansion}'
WHERE category_id IN (
    SELECT id FROM shortcut_categories WHERE name = 'english'
) AND transformation_template IS NULL;

UPDATE category_transformations 
SET transformation_template = '{prefix}{expansion}'
WHERE category_id NOT IN (
    SELECT id FROM shortcut_categories WHERE name = 'english'
) AND transformation_template IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN category_transformations.transformation_template IS 'Template for transformation using {prefix}, {suffix}, {expansion} variables';