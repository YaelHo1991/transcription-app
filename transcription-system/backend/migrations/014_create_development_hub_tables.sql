-- Migration: Create Development Hub Tables
-- Purpose: Tables for tracking development tasks, components, and ideas

-- Table for development components/features
CREATE TABLE IF NOT EXISTS dev_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('existing', 'planned', 'infrastructure')) DEFAULT 'planned',
    status VARCHAR(50) CHECK (status IN ('active', 'planned', 'on-hold', 'completed', 'archived')) DEFAULT 'planned',
    folder_path VARCHAR(500),
    description TEXT,
    related_files JSON, -- Array of file paths this component relates to
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Table for development tasks
CREATE TABLE IF NOT EXISTS dev_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES dev_components(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT, -- Markdown content
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('idea', 'todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',
    file_links JSON, -- Array of related file paths
    dependencies JSON, -- Array of task IDs this task depends on
    tags JSON, -- Array of tags for cross-referencing
    assignee UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for task comments/notes
CREATE TABLE IF NOT EXISTS dev_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES dev_tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for development milestones
CREATE TABLE IF NOT EXISTS dev_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for tasks in milestones
CREATE TABLE IF NOT EXISTS dev_milestone_tasks (
    milestone_id UUID REFERENCES dev_milestones(id) ON DELETE CASCADE,
    task_id UUID REFERENCES dev_tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (milestone_id, task_id)
);

-- Create indexes for better performance
CREATE INDEX idx_dev_tasks_component_id ON dev_tasks(component_id);
CREATE INDEX idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX idx_dev_tasks_priority ON dev_tasks(priority);
CREATE INDEX idx_dev_tasks_assignee ON dev_tasks(assignee);
CREATE INDEX idx_dev_components_status ON dev_components(status);
CREATE INDEX idx_dev_components_type ON dev_components(type);

-- Insert some initial components for existing features
INSERT INTO dev_components (name, type, status, folder_path, description) VALUES
    ('MediaPlayer', 'existing', 'active', 'src/app/transcription/transcription/components/MediaPlayer', 'Audio/video player with waveform visualization'),
    ('TextEditor', 'existing', 'active', 'src/app/transcription/transcription/components/TextEditor', 'Main transcription text editor with shortcuts'),
    ('Speaker', 'existing', 'active', 'src/app/transcription/transcription/components/Speaker', 'Speaker management and identification'),
    ('Remarks', 'existing', 'active', 'src/app/transcription/transcription/components/Remarks', 'Remarks and annotations system'),
    ('Development Hub', 'planned', 'active', 'src/app/transcription/admin/development', 'Development task management system')
ON CONFLICT (name) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dev_components_updated_at BEFORE UPDATE ON dev_components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dev_tasks_updated_at BEFORE UPDATE ON dev_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();