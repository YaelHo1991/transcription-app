-- Migration: Add category transformation rules and multiple categories support
-- Date: 2025-01-25
-- Description: Adds support for category transformation rules, multiple categories per shortcut, and exceptions

-- 1. Add label column to shortcut_categories table
ALTER TABLE shortcut_categories 
ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- 2. Create table for category transformation rules
CREATE TABLE IF NOT EXISTS category_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES shortcut_categories(id) ON DELETE CASCADE,
    prefix VARCHAR(20), -- e.g., 'ו-', 'ב-', 'ה-'
    suffix VARCHAR(20), -- e.g., trailing patterns
    apply_with_space BOOLEAN DEFAULT false, -- whether to apply when preceded/followed by space
    apply_with_comma BOOLEAN DEFAULT false, -- whether to apply when preceded/followed by comma
    apply_with_period BOOLEAN DEFAULT false, -- whether to apply when preceded/followed by period
    transformation_type VARCHAR(50), -- 'prefix', 'suffix', 'both'
    priority INTEGER DEFAULT 0, -- order of application
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create junction table for multiple categories per shortcut
CREATE TABLE IF NOT EXISTS shortcut_category_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut_id UUID NOT NULL REFERENCES system_shortcuts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES shortcut_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- main category for display
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shortcut_id, category_id)
);

-- 4. Create table for shortcut exceptions
CREATE TABLE IF NOT EXISTS shortcut_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut_id UUID NOT NULL REFERENCES system_shortcuts(id) ON DELETE CASCADE,
    transformation_id UUID REFERENCES category_transformations(id) ON DELETE CASCADE,
    exception_type VARCHAR(50), -- 'exclude_transformation', 'custom_transformation'
    custom_prefix VARCHAR(20), -- custom prefix for this specific shortcut
    custom_suffix VARCHAR(20), -- custom suffix for this specific shortcut
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_transformations_category ON category_transformations(category_id);
CREATE INDEX IF NOT EXISTS idx_shortcut_category_mappings_shortcut ON shortcut_category_mappings(shortcut_id);
CREATE INDEX IF NOT EXISTS idx_shortcut_category_mappings_category ON shortcut_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_shortcut_exceptions_shortcut ON shortcut_exceptions(shortcut_id);

-- 6. Migrate existing data to use the new structure
-- Copy existing category relationships to the new junction table
INSERT INTO shortcut_category_mappings (shortcut_id, category_id, is_primary)
SELECT id, category_id, true
FROM system_shortcuts
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. Update existing categories with Hebrew labels
UPDATE shortcut_categories SET label = 'משפטי' WHERE name = 'legal' AND label IS NULL;
UPDATE shortcut_categories SET label = 'רפואי' WHERE name = 'medical' AND label IS NULL;
UPDATE shortcut_categories SET label = 'ביטויים נפוצים' WHERE name = 'common' AND label IS NULL;
UPDATE shortcut_categories SET label = 'אקדמי' WHERE name = 'academic' AND label IS NULL;
UPDATE shortcut_categories SET label = 'עסקי' WHERE name = 'business' AND label IS NULL;
UPDATE shortcut_categories SET label = 'טכני' WHERE name = 'technical' AND label IS NULL;
UPDATE shortcut_categories SET label = 'מילים באנגלית' WHERE name = 'english' AND label IS NULL;
UPDATE shortcut_categories SET label = 'סימני פיסוק' WHERE name = 'punctuation' AND label IS NULL;

-- 8. Add example transformation for English category
INSERT INTO category_transformations (
    category_id,
    prefix,
    transformation_type,
    apply_with_space,
    apply_with_comma,
    priority,
    is_active
)
SELECT 
    id,
    'ו',
    'prefix',
    true,
    true,
    1,
    true
FROM shortcut_categories
WHERE name = 'english'
ON CONFLICT DO NOTHING;

-- 9. Create function to apply transformations
CREATE OR REPLACE FUNCTION apply_category_transformations(
    p_shortcut TEXT,
    p_expansion TEXT,
    p_context TEXT DEFAULT ''
) RETURNS TEXT AS $$
DECLARE
    v_result TEXT := p_expansion;
    v_transformation RECORD;
    v_exception RECORD;
BEGIN
    -- Get all transformations for this shortcut's categories
    FOR v_transformation IN
        SELECT ct.*
        FROM category_transformations ct
        JOIN shortcut_category_mappings scm ON ct.category_id = scm.category_id
        JOIN system_shortcuts ss ON scm.shortcut_id = ss.id
        WHERE ss.shortcut = p_shortcut
          AND ct.is_active = true
        ORDER BY ct.priority
    LOOP
        -- Check for exceptions
        SELECT * INTO v_exception
        FROM shortcut_exceptions se
        JOIN system_shortcuts ss ON se.shortcut_id = ss.id
        WHERE ss.shortcut = p_shortcut
          AND se.transformation_id = v_transformation.id
          AND se.is_active = true;
        
        IF FOUND THEN
            -- Apply custom transformation if specified
            IF v_exception.exception_type = 'custom_transformation' THEN
                IF v_exception.custom_prefix IS NOT NULL THEN
                    v_result := v_exception.custom_prefix || v_result;
                END IF;
                IF v_exception.custom_suffix IS NOT NULL THEN
                    v_result := v_result || v_exception.custom_suffix;
                END IF;
            END IF;
            -- Skip regular transformation if excluded
            CONTINUE;
        END IF;
        
        -- Apply regular transformation
        IF v_transformation.transformation_type = 'prefix' AND v_transformation.prefix IS NOT NULL THEN
            v_result := v_transformation.prefix || v_result;
        ELSIF v_transformation.transformation_type = 'suffix' AND v_transformation.suffix IS NOT NULL THEN
            v_result := v_result || v_transformation.suffix;
        ELSIF v_transformation.transformation_type = 'both' THEN
            IF v_transformation.prefix IS NOT NULL THEN
                v_result := v_transformation.prefix || v_result;
            END IF;
            IF v_transformation.suffix IS NOT NULL THEN
                v_result := v_result || v_transformation.suffix;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 10. Add comment for documentation
COMMENT ON TABLE category_transformations IS 'Stores transformation rules for shortcut categories (e.g., adding prefixes for Hebrew prepositions)';
COMMENT ON TABLE shortcut_category_mappings IS 'Junction table allowing shortcuts to belong to multiple categories';
COMMENT ON TABLE shortcut_exceptions IS 'Defines exceptions to category transformation rules for specific shortcuts';
COMMENT ON FUNCTION apply_category_transformations IS 'Applies category-based transformations to shortcut expansions with exception handling';