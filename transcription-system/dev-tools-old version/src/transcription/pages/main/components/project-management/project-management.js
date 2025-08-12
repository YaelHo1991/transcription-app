/**
 * Project Management Module
 * Handles project creation, loading, and management
 */

const ProjectManager = (function() {
    'use strict';
    
    // Private variables
    let currentProjects = [];
    let uploadedFiles = [];
    
    // Initialize module
    function init() {
        setupEventListeners();
        loadProjects();
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelect);
        }
        
        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);
        }
        
        // Modal close on background click
        const modal = document.getElementById('quickCreateModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeQuickCreate();
                }
            });
        }
    }
    
    // Handle file selection
    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadedFiles = files;
            showFileUploadDialog(files);
        }
    }
    
    // Handle drag over
    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    // Handle drag leave
    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    // Handle file drop
    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const mediaFiles = files.filter(file => {
            const type = file.type;
            return type.startsWith('audio/') || type.startsWith('video/');
        });
        
        if (mediaFiles.length > 0) {
            uploadedFiles = mediaFiles;
            showFileUploadDialog(mediaFiles);
        } else {
            showMessage('נא לגרור קבצי אודיו או וידאו בלבד', 'warning');
        }
    }
    
    // Show file upload dialog
    function showFileUploadDialog(files) {
        const projectName = files[0].name.split('.')[0];
        
        // Create upload dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>יצירת פרויקט עם ${files.length} קבצים</h3>
                    <button class="close-btn" onclick="ProjectManager.cancelUpload()">×</button>
                </div>
                
                <form onsubmit="ProjectManager.createProjectWithFiles(event)">
                    <div class="form-group">
                        <label>שם הפרויקט:</label>
                        <input type="text" name="project_name" value="${projectName}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>קבצים שנבחרו:</label>
                        <div class="file-list">
                            ${files.map(file => `
                                <div class="file-item">
                                    <span class="file-icon">${getFileIcon(file.type)}</span>
                                    <span class="file-name">${file.name}</span>
                                    <span class="file-size">${formatFileSize(file.size)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="ProjectManager.cancelUpload()">ביטול</button>
                        <button type="submit" class="btn-primary">צור פרויקט והעלה קבצים</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    // Create project with files
    async function createProjectWithFiles(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const projectName = formData.get('project_name');
        
        // Close dialog
        cancelUpload();
        
        // Show progress
        showMessage('יוצר פרויקט ומעלה קבצים...', 'info');
        
        // Create form data for upload
        const uploadData = new FormData();
        uploadData.append('project_name', projectName);
        uploadData.append('work_type', 'transcription');
        
        // Add files
        uploadedFiles.forEach(file => {
            uploadData.append('files[]', file);
        });
        
        try {
            // Get dev parameter if present
            const urlParams = new URLSearchParams(window.location.search);
            const devParam = urlParams.get('dev') ? '?dev=1' : '';
            
            const response = await fetch(`../../core/api/create-project-with-media.php${devParam}`, {
                method: 'POST',
                credentials: 'include',
                body: uploadData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage(`פרויקט "${projectName}" נוצר בהצלחה עם ${data.files_uploaded} קבצים`, 'success');
                
                // Refresh projects list
                loadProjects();
                
                // Clear file input
                document.getElementById('fileInput').value = '';
                uploadedFiles = [];
                
                // Open project in transcription page after delay
                setTimeout(() => {
                    const confirm = window.confirm('האם לפתוח את הפרויקט בעמוד התמלול?');
                    if (confirm) {
                        openProject('transcription', data.project_id);
                    }
                }, 1000);
            } else {
                throw new Error(data.error || 'שגיאה ביצירת הפרויקט');
            }
        } catch (error) {
            showMessage('שגיאה: ' + error.message, 'error');
        }
    }
    
    // Cancel upload
    function cancelUpload() {
        const dialog = document.querySelector('.modal');
        if (dialog && dialog.querySelector('form[onsubmit*="createProjectWithFiles"]')) {
            dialog.remove();
        }
        uploadedFiles = [];
    }
    
    // Show quick create modal
    function showQuickCreate() {
        const modal = document.getElementById('quickCreateModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.querySelector('input[name="project_name"]').focus();
        }
    }
    
    // Close quick create modal
    function closeQuickCreate() {
        const modal = document.getElementById('quickCreateModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('quickCreateForm').reset();
        }
    }
    
    // Create project
    async function createProject(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const projectData = {
            name: formData.get('project_name'),
            work_type: formData.get('work_type'),
            description: formData.get('description')
        };
        
        try {
            // Get dev parameter
            const urlParams = new URLSearchParams(window.location.search);
            const devParam = urlParams.get('dev') ? '?dev=1' : '';
            
            const response = await fetch(`../../core/api/projects.php${devParam}&action=create`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage(`פרויקט "${projectData.name}" נוצר בהצלחה`, 'success');
                closeQuickCreate();
                loadProjects();
                
                // Ask if user wants to open the project
                setTimeout(() => {
                    const confirm = window.confirm('האם לפתוח את הפרויקט?');
                    if (confirm) {
                        openProject(projectData.work_type, data.project_id);
                    }
                }, 500);
            } else {
                throw new Error(data.error || 'שגיאה ביצירת הפרויקט');
            }
        } catch (error) {
            showMessage('שגיאה: ' + error.message, 'error');
        }
    }
    
    // Load projects
    async function loadProjects() {
        const projectsList = document.getElementById('projectsList');
        if (!projectsList) return;
        
        // Show loading
        projectsList.innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>טוען פרויקטים...</p>
            </div>
        `;
        
        try {
            // Get dev parameter
            const urlParams = new URLSearchParams(window.location.search);
            const devParam = urlParams.get('dev') ? '?dev=1' : '';
            
            const response = await fetch(`../../core/api/projects.php${devParam}&action=list`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success && data.projects) {
                currentProjects = data.projects;
                renderProjects(data.projects);
                updateProjectCount(data.projects.length);
            } else {
                projectsList.innerHTML = `
                    <div class="empty-state">
                        <p>אין פרויקטים</p>
                        <p style="font-size: 14px;">צור פרויקט חדש להתחיל</p>
                    </div>
                `;
                updateProjectCount(0);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            projectsList.innerHTML = `
                <div class="error-state">
                    <p>שגיאה בטעינת פרויקטים</p>
                    <button class="btn-secondary" onclick="ProjectManager.refreshProjects()">נסה שוב</button>
                </div>
            `;
        }
    }
    
    // Render projects
    function renderProjects(projects) {
        const projectsList = document.getElementById('projectsList');
        
        if (projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <p>אין פרויקטים</p>
                    <p style="font-size: 14px;">צור פרויקט חדש להתחיל</p>
                </div>
            `;
            return;
        }
        
        projectsList.innerHTML = projects.map(project => {
            const workTypeHebrew = {
                'transcription': 'תמלול',
                'proofreading': 'הגהה',
                'export': 'ייצוא'
            };
            
            const workTypeIcon = {
                'transcription': '📝',
                'proofreading': '✏️',
                'export': '📄'
            };
            
            return `
                <div class="project-card" data-project-id="${project.id}">
                    <div class="project-header">
                        <div class="project-icon">${workTypeIcon[project.work_type] || '📁'}</div>
                        <div class="project-info">
                            <h4>${project.name}</h4>
                            <span class="project-type">${workTypeHebrew[project.work_type] || 'אחר'}</span>
                        </div>
                    </div>
                    
                    <div class="project-stats">
                        <div class="stat">
                            <span class="stat-icon">📁</span>
                            <span class="stat-value">${project.file_count || 0} קבצים</span>
                        </div>
                        <div class="stat">
                            <span class="stat-icon">📅</span>
                            <span class="stat-value">${formatDate(project.created_at)}</span>
                        </div>
                    </div>
                    
                    <div class="project-actions">
                        <button class="btn-action" onclick="ProjectManager.openProject('${project.work_type}', ${project.id})" title="פתח פרויקט">
                            <span>פתח</span>
                        </button>
                        <button class="btn-action" onclick="ProjectManager.manageFiles(${project.id})" title="נהל קבצים">
                            <span>קבצים</span>
                        </button>
                        <button class="btn-action btn-danger" onclick="ProjectManager.deleteProject(${project.id})" title="מחק פרויקט">
                            <span>מחק</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Open project
    function openProject(type, projectId) {
        const pages = {
            'transcription': '../transcription/index.php',
            'proofreading': '../proofreading/index.php',
            'export': '../export/index.php'
        };
        
        if (pages[type]) {
            let url = pages[type];
            url += `?project_id=${projectId}`;
            
            // Preserve dev parameters
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('dev')) {
                url += '&dev=1';
            }
            if (urlParams.has('devnav')) {
                url += '&devnav=1';
            }
            
            window.location.href = url;
        }
    }
    
    // Manage files
    function manageFiles(projectId) {
        // This would open a file manager modal
        // For now, just show a message
        showMessage('ניהול קבצים יהיה זמין בקרוב', 'info');
    }
    
    // Delete project
    async function deleteProject(projectId) {
        const project = currentProjects.find(p => p.id === projectId);
        if (!project) return;
        
        const confirmed = confirm(`האם אתה בטוח שברצונך למחוק את הפרויקט "${project.name}"?`);
        if (!confirmed) return;
        
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const devParam = urlParams.get('dev') ? '?dev=1' : '';
            
            const response = await fetch(`../../core/api/projects.php${devParam}&action=delete`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project_id: projectId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('הפרויקט נמחק בהצלחה', 'success');
                loadProjects();
            } else {
                throw new Error(data.error || 'שגיאה במחיקת הפרויקט');
            }
        } catch (error) {
            showMessage('שגיאה: ' + error.message, 'error');
        }
    }
    
    // Refresh projects
    function refreshProjects() {
        loadProjects();
    }
    
    // Update project count
    function updateProjectCount(count) {
        const countElement = document.getElementById('projectCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }
    
    // Utility functions
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
    }
    
    function getFileIcon(mimeType) {
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.startsWith('video/')) return '🎬';
        return '📄';
    }
    
    function showMessage(message, type = 'info') {
        // Use existing message system if available
        if (typeof showCustomMessage === 'function') {
            showCustomMessage(message, type);
        } else {
            // Simple fallback
            const div = document.createElement('div');
            div.className = `message message-${type}`;
            div.textContent = message;
            div.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
                color: white;
                border-radius: 4px;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(div);
            
            setTimeout(() => {
                div.remove();
            }, 3000);
        }
    }
    
    // Public API
    return {
        init,
        showQuickCreate,
        closeQuickCreate,
        createProject,
        createProjectWithFiles,
        cancelUpload,
        openProject,
        manageFiles,
        deleteProject,
        refreshProjects,
        loadProjects
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ProjectManager.init();
});

// Add CSS for project cards
const style = document.createElement('style');
style.textContent = `
.project-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s ease;
}

.project-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}

.project-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
}

.project-icon {
    font-size: 36px;
    margin-left: 15px;
}

.project-info h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}

.project-type {
    font-size: 12px;
    color: #666;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-top: 5px;
}

.project-stats {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    padding: 10px 0;
    border-top: 1px solid #f0f0f0;
    border-bottom: 1px solid #f0f0f0;
}

.stat {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: #666;
}

.stat-icon {
    font-size: 16px;
}

.project-actions {
    display: flex;
    gap: 10px;
}

.btn-action {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.btn-action:hover {
    background: #f5f5f5;
    border-color: #bbb;
}

.btn-action.btn-danger {
    color: #d32f2f;
}

.btn-action.btn-danger:hover {
    background: #ffebee;
    border-color: #d32f2f;
}

.empty-state, .error-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #666;
}

.file-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 10px;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;
}

.file-item:last-child {
    border-bottom: none;
}

.file-icon {
    font-size: 20px;
    margin-left: 10px;
}

.file-name {
    flex: 1;
    margin: 0 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-size {
    font-size: 12px;
    color: #666;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);