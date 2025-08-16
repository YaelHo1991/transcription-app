-- Migration: Create shortcuts system tables
-- Date: 2025-01-16
-- Description: Tables for system-wide and user-specific text shortcuts

-- 1. Shortcut categories table
CREATE TABLE IF NOT EXISTS shortcut_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. System-wide shortcuts (managed by developers)
CREATE TABLE IF NOT EXISTS system_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES shortcut_categories(id) ON DELETE SET NULL,
    shortcut VARCHAR(50) NOT NULL,
    expansion TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'he',
    description TEXT,
    priority INTEGER DEFAULT 0, -- Higher priority shortcuts override lower ones
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shortcut, language)
);

-- 3. User-specific shortcuts
CREATE TABLE IF NOT EXISTS user_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shortcut VARCHAR(50) NOT NULL,
    expansion TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'he',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, shortcut)
);

-- 4. User shortcut quotas
CREATE TABLE IF NOT EXISTS user_shortcut_quotas (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_shortcuts INTEGER DEFAULT 100,
    used_shortcuts INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP DEFAULT NOW(),
    upgraded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Shortcut usage statistics (optional, for analytics)
CREATE TABLE IF NOT EXISTS shortcut_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shortcut_id UUID, -- Can reference either system or user shortcuts
    shortcut_text VARCHAR(50),
    expansion_text TEXT,
    source VARCHAR(20), -- 'system' or 'user'
    used_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_system_shortcuts_lookup ON system_shortcuts(shortcut, language, is_active);
CREATE INDEX idx_system_shortcuts_category ON system_shortcuts(category_id);
CREATE INDEX idx_user_shortcuts_lookup ON user_shortcuts(user_id, shortcut, is_active);
CREATE INDEX idx_user_shortcuts_user ON user_shortcuts(user_id);
CREATE INDEX idx_shortcut_usage_user ON shortcut_usage_stats(user_id);
CREATE INDEX idx_shortcut_usage_time ON shortcut_usage_stats(used_at);

-- Insert default categories
INSERT INTO shortcut_categories (name, description, display_order) VALUES
    ('punctuation', 'סימני פיסוק וסימנים מיוחדים', 1),
    ('legal', 'מונחים משפטיים', 2),
    ('medical', 'מונחים רפואיים', 3),
    ('common', 'ביטויים נפוצים', 4),
    ('business', 'מונחים עסקיים', 5),
    ('academic', 'מונחים אקדמיים', 6),
    ('technical', 'מונחים טכניים', 7),
    ('custom', 'קיצורים מותאמים אישית', 99)
ON CONFLICT (name) DO NOTHING;

-- Create function to update used_shortcuts count
CREATE OR REPLACE FUNCTION update_user_shortcuts_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE user_shortcut_quotas
        SET used_shortcuts = (
            SELECT COUNT(*)
            FROM user_shortcuts
            WHERE user_id = NEW.user_id AND is_active = true
        )
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_shortcut_quotas
        SET used_shortcuts = (
            SELECT COUNT(*)
            FROM user_shortcuts
            WHERE user_id = OLD.user_id AND is_active = true
        )
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update used_shortcuts count
CREATE TRIGGER update_shortcuts_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_shortcuts
FOR EACH ROW
EXECUTE FUNCTION update_user_shortcuts_count();

-- Create function to initialize user quota when a new user is created
CREATE OR REPLACE FUNCTION init_user_shortcut_quota()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_shortcut_quotas (user_id, max_shortcuts, used_shortcuts)
    VALUES (NEW.id, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically initialize quota for new users
CREATE TRIGGER init_user_quota_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION init_user_shortcut_quota();

-- Initialize quotas for existing users
INSERT INTO user_shortcut_quotas (user_id, max_shortcuts, used_shortcuts)
SELECT id, 100, 0
FROM users
ON CONFLICT (user_id) DO NOTHING;