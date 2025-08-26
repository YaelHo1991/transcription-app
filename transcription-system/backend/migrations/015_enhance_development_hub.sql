-- Migration: Enhance Development Hub for Project Structure View
-- Purpose: Add fields for page-based organization and planned components

-- Add new columns to dev_components table
ALTER TABLE dev_components 
ADD COLUMN IF NOT EXISTS page_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS app_section VARCHAR(50) CHECK (app_section IN ('transcription', 'crm', 'dev-portal', 'general')),
ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_component_id UUID REFERENCES dev_components(id);

-- Add new columns to dev_tasks table
ALTER TABLE dev_tasks
ADD COLUMN IF NOT EXISTS task_category VARCHAR(50) CHECK (task_category IN ('component', 'planned', 'general')) DEFAULT 'component',
ADD COLUMN IF NOT EXISTS page_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS is_synced_to_md BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create table for app structure cache
CREATE TABLE IF NOT EXISTS dev_app_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_section VARCHAR(50) NOT NULL,
    page_path VARCHAR(500) NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    parent_path VARCHAR(500),
    components JSON, -- Array of component names found in this page
    last_scanned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_path)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dev_components_page_path ON dev_components(page_path);
CREATE INDEX IF NOT EXISTS idx_dev_components_app_section ON dev_components(app_section);
CREATE INDEX IF NOT EXISTS idx_dev_components_is_planned ON dev_components(is_planned);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_task_category ON dev_tasks(task_category);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_page_path ON dev_tasks(page_path);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_order_index ON dev_tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_dev_app_structure_app_section ON dev_app_structure(app_section);

-- Update existing components with app sections based on folder paths
UPDATE dev_components 
SET app_section = CASE
    WHEN folder_path LIKE '%/transcription/%' THEN 'transcription'
    WHEN folder_path LIKE '%/crm/%' THEN 'crm'
    WHEN folder_path LIKE '%/dev-portal/%' THEN 'dev-portal'
    ELSE 'general'
END
WHERE app_section IS NULL;

-- Insert initial app structure data
INSERT INTO dev_app_structure (app_section, page_path, page_name, parent_path) VALUES
    -- Transcription pages
    ('transcription', '/transcription', 'Main Dashboard', NULL),
    ('transcription', '/transcription/transcription', 'Transcription Editor', '/transcription'),
    ('transcription', '/transcription/export', 'Export', '/transcription'),
    ('transcription', '/transcription/proofreading', 'Proofreading', '/transcription'),
    ('transcription', '/transcription/records', 'Records', '/transcription'),
    ('transcription', '/transcription/admin', 'Admin', '/transcription'),
    ('transcription', '/transcription/admin/users', 'User Management', '/transcription/admin'),
    ('transcription', '/transcription/admin/templates', 'Templates', '/transcription/admin'),
    ('transcription', '/transcription/admin/system', 'System Settings', '/transcription/admin'),
    ('transcription', '/transcription/admin/development', 'Development Hub', '/transcription/admin'),
    
    -- CRM pages
    ('crm', '/crm', 'CRM Dashboard', NULL),
    ('crm', '/crm/clients', 'Clients', '/crm'),
    ('crm', '/crm/employees', 'Employees', '/crm'),
    ('crm', '/crm/projects', 'Projects', '/crm'),
    ('crm', '/crm/reports', 'Reports', '/crm'),
    
    -- Dev Portal pages
    ('dev-portal', '/dev-portal', 'Dev Portal', NULL),
    ('dev-portal', '/dev-portal/template-designer', 'Template Designer', '/dev-portal'),
    ('dev-portal', '/dev-portal/hebrew-template-designer', 'Hebrew Template Designer', '/dev-portal'),
    ('dev-portal', '/dev-portal/shortcuts-admin', 'Shortcuts Admin', '/dev-portal'),
    
    -- General pages
    ('general', '/login', 'Login', NULL),
    ('general', '/licenses', 'Licenses', NULL),
    ('general', '/reset-password', 'Reset Password', NULL),
    ('general', '/test-token', 'Test Token', NULL)
ON CONFLICT (page_path) DO NOTHING;

-- Add trigger to update updated_at timestamp for dev_app_structure
CREATE TRIGGER update_dev_app_structure_updated_at BEFORE UPDATE ON dev_app_structure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();