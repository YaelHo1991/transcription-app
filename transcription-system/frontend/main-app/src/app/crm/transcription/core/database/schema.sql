-- =========================================
-- Database Schema for Transcription System
-- database/schema.sql
-- =========================================

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    work_type ENUM('transcription', 'proofreading', 'export') NOT NULL,
    status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
    transcription_text LONGTEXT NULL,
    speakers_list TEXT NULL,
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_created_by (created_by),
    INDEX idx_work_type (work_type),
    INDEX idx_status (status)
);

-- Create project_files table
CREATE TABLE IF NOT EXISTS project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    category ENUM('media', 'helper') NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_category (category),
    INDEX idx_upload_date (upload_date),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Create project_media_positions table (for saving playback positions)
CREATE TABLE IF NOT EXISTS project_media_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    file_id INT NOT NULL,
    position_seconds DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_file (project_id, file_id),
    INDEX idx_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE
);

-- Create project_transcription_pages table (for multi-page transcriptions)
CREATE TABLE IF NOT EXISTS project_transcription_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    page_number INT NOT NULL,
    content LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_page (project_id, page_number),
    INDEX idx_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Create project_helpers table (for helper file zoom levels and positions)
CREATE TABLE IF NOT EXISTS project_helpers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    file_id INT NOT NULL,
    zoom_level DECIMAL(3,2) DEFAULT 1.00,
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    current_page INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_project_helper (project_id, file_id),
    INDEX idx_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE
);

-- Create project_activity_log table (for tracking project activities)
CREATE TABLE IF NOT EXISTS project_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    activity_type ENUM('created', 'updated', 'file_uploaded', 'file_deleted', 'completed', 'paused') NOT NULL,
    description TEXT NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Insert sample data for testing
INSERT INTO projects (project_id, title, work_type, status, transcription_text, speakers_list, notes) VALUES
('IND_1721217000_1234', 'תמלול - 17/07/2025 14:30', 'transcription', 'active', 
'דוגמה לתמלול בעברית...', 
'דובר 1: יוני כהן\nדובר 2: רחל לוי\nדובר 3: משה אברהם',
'הוראות מיוחדות לתמלול:\n- לציין זמנים מדויקים לכל דובר\n- לכלול הפסקות והתחברויות מאוחרות\n- להבטיח שכל הדוברים מזוהים נכון\n- לציין רעשי רקע אם רלוונטיים'),

('IND_1721131300_5678', 'הגהת מסמך חשוב', 'proofreading', 'active', 
'טקסט להגהה...', 
'דובר יחיד: פרופ\' דוד כהן',
'הערות להגהה:\n- לבדוק דקדוק ורישוי\n- לוודא עקביות במונחים\n- לתקן שגיאות כתיב');

-- Insert sample file data
INSERT INTO project_files (project_id, original_name, filename, file_path, file_size, file_type, category) VALUES
('IND_1721217000_1234', 'meeting_recording.mp3', 'meeting_recording_1721217000_abc123.mp3', '../uploads/IND_1721217000_1234/media/meeting_recording_1721217000_abc123.mp3', 15728640, 'audio/mpeg', 'media'),
('IND_1721217000_1234', 'interview_part2.mp3', 'interview_part2_1721217000_def456.mp3', '../uploads/IND_1721217000_1234/media/interview_part2_1721217000_def456.mp3', 25165824, 'audio/mpeg', 'media'),
('IND_1721217000_1234', 'agenda.pdf', 'agenda_1721217000_ghi789.pdf', '../uploads/IND_1721217000_1234/helper/agenda_1721217000_ghi789.pdf', 2411724, 'application/pdf', 'helper'),
('IND_1721217000_1234', 'budget_chart.jpg', 'budget_chart_1721217000_jkl012.jpg', '../uploads/IND_1721217000_1234/helper/budget_chart_1721217000_jkl012.jpg', 1887436, 'image/jpeg', 'helper'),
('IND_1721131300_5678', 'document_to_proofread.docx', 'document_to_proofread_1721131300_mno345.docx', '../uploads/IND_1721131300_5678/helper/document_to_proofread_1721131300_mno345.docx', 524288, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'helper');

-- Insert sample media positions
INSERT INTO project_media_positions (project_id, file_id, position_seconds) VALUES
('IND_1721217000_1234', 1, 125.50),
('IND_1721217000_1234', 2, 67.25);

-- Insert sample helper settings
INSERT INTO project_helpers (project_id, file_id, zoom_level, position_x, position_y, current_page) VALUES
('IND_1721217000_1234', 3, 1.50, 100, 150, 1),
('IND_1721217000_1234', 4, 1.20, 0, 0, 1);

-- Insert sample activity log
INSERT INTO project_activity_log (project_id, activity_type, description) VALUES
('IND_1721217000_1234', 'created', 'Project created'),
('IND_1721217000_1234', 'file_uploaded', 'Uploaded media file: meeting_recording.mp3'),
('IND_1721217000_1234', 'file_uploaded', 'Uploaded media file: interview_part2.mp3'),
('IND_1721217000_1234', 'file_uploaded', 'Uploaded helper file: agenda.pdf'),
('IND_1721217000_1234', 'file_uploaded', 'Uploaded helper file: budget_chart.jpg'),
('IND_1721131300_5678', 'created', 'Project created'),
('IND_1721131300_5678', 'file_uploaded', 'Uploaded helper file: document_to_proofread.docx');

-- Create indexes for better performance
CREATE INDEX idx_projects_updated_at ON projects(updated_at);
CREATE INDEX idx_project_files_file_type ON project_files(file_type);
CREATE INDEX idx_project_files_file_size ON project_files(file_size);

-- Create triggers for activity logging
DELIMITER //

CREATE TRIGGER after_project_update
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO project_activity_log (project_id, activity_type, description)
        VALUES (NEW.project_id, 'updated', CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
    
    IF OLD.transcription_text != NEW.transcription_text OR (OLD.transcription_text IS NULL AND NEW.transcription_text IS NOT NULL) THEN
        INSERT INTO project_activity_log (project_id, activity_type, description)
        VALUES (NEW.project_id, 'updated', 'Transcription text updated');
    END IF;
END//

CREATE TRIGGER after_file_insert
AFTER INSERT ON project_files
FOR EACH ROW
BEGIN
    INSERT INTO project_activity_log (project_id, activity_type, description)
    VALUES (NEW.project_id, 'file_uploaded', CONCAT('Uploaded ', NEW.category, ' file: ', NEW.original_name));
END//

CREATE TRIGGER after_file_delete
AFTER DELETE ON project_files
FOR EACH ROW
BEGIN
    INSERT INTO project_activity_log (project_id, activity_type, description)
    VALUES (OLD.project_id, 'file_deleted', CONCAT('Deleted ', OLD.category, ' file: ', OLD.original_name));
END//

DELIMITER ;

-- Create views for easier querying
CREATE VIEW project_summary AS
SELECT 
    p.project_id,
    p.title,
    p.work_type,
    p.status,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT CASE WHEN pf.category = 'media' THEN pf.id END) as media_files_count,
    COUNT(DISTINCT CASE WHEN pf.category = 'helper' THEN pf.id END) as helper_files_count,
    COUNT(DISTINCT pf.id) as total_files_count,
    SUM(pf.file_size) as total_file_size,
    MAX(pf.upload_date) as last_file_upload
FROM projects p
LEFT JOIN project_files pf ON p.project_id = pf.project_id
GROUP BY p.project_id, p.title, p.work_type, p.status, p.created_at, p.updated_at;

-- Create view for file statistics
CREATE VIEW file_statistics AS
SELECT 
    project_id,
    category,
    COUNT(*) as file_count,
    SUM(file_size) as total_size,
    AVG(file_size) as avg_size,
    MIN(upload_date) as first_upload,
    MAX(upload_date) as last_upload
FROM project_files
GROUP BY project_id, category;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_system.* TO 'appuser'@'%';
-- FLUSH PRIVILEGES;