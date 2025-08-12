/*
 * =========================================
 * File Upload Functionality
 * assets/js/upload.js
 * =========================================
 * Handles drag-and-drop file upload with progress tracking
 */

class FileUploadManager {
    constructor() {
        this.currentProjectId = null;
        this.uploadQueue = [];
        this.isUploading = false;
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedTypes = {
            media: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/avi', 'video/mov'],
            helper: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        };
        
        this.initializeUploadHandlers();
    }

    initializeUploadHandlers() {
        // File input change handler
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Drag and drop handlers
        const dropZone = document.querySelector('.file-drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // Global drag handlers to prevent default behavior
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    setCurrentProject(projectId) {
        this.currentProjectId = projectId;
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files, 'media');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const dropZone = event.currentTarget;
        dropZone.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const dropZone = event.currentTarget;
        dropZone.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const dropZone = event.currentTarget;
        dropZone.classList.remove('dragover');
        
        const files = Array.from(event.dataTransfer.files);
        const fileType = dropZone.dataset.fileType || 'media';
        
        this.processFiles(files, fileType);
    }

    processFiles(files, fileType = 'media') {
        if (!this.currentProjectId) {
            this.showError('לא נבחר פרויקט');
            return;
        }

        // Validate files
        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            const validation = this.validateFile(file, fileType);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });

        if (errors.length > 0) {
            this.showError('שגיאות בקבצים:\n' + errors.join('\n'));
        }

        if (validFiles.length > 0) {
            this.uploadFiles(validFiles, fileType);
        }
    }

    validateFile(file, fileType) {
        // Check file size
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `גודל הקובץ חורג מהמותר (${this.formatFileSize(this.maxFileSize)})`
            };
        }

        // Check file type
        if (!this.allowedTypes[fileType].includes(file.type)) {
            return {
                valid: false,
                error: `סוג קובץ לא נתמך: ${file.type}`
            };
        }

        return { valid: true };
    }

    async uploadFiles(files, fileType) {
        if (this.isUploading) {
            this.showError('העלאה בתהליך...');
            return;
        }

        this.isUploading = true;
        this.showUploadProgress(0);

        const formData = new FormData();
        formData.append('project_id', this.currentProjectId);
        formData.append('file_type', fileType);

        files.forEach((file, index) => {
            formData.append(`files[${index}]`, file);
        });

        try {
            const response = await this.uploadWithProgress(formData);
            
            if (response.success) {
                this.showSuccess(`הועלו ${response.files.length} קבצים בהצלחה`);
                this.hideUploadProgress();
                this.refreshFileList();
                
                // Show any warnings
                if (response.errors && response.errors.length > 0) {
                    this.showWarning('התרחשו שגיאות:\n' + response.errors.join('\n'));
                }
            } else {
                throw new Error(response.error || 'שגיאה בהעלאה');
            }
        } catch (error) {
            this.showError('שגיאה בהעלאה: ' + error.message);
            this.hideUploadProgress();
        } finally {
            this.isUploading = false;
        }
    }

    uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Progress tracking
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateUploadProgress(percentComplete);
                }
            });

            // Response handling
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', 'api/upload.php', true);
            xhr.send(formData);
        });
    }

    showUploadProgress(percent) {
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        if (progressFill) {
            progressFill.style.width = percent + '%';
        }

        if (progressText) {
            progressText.textContent = `מעלה קבצים... ${Math.round(percent)}%`;
        }
    }

    updateUploadProgress(percent) {
        this.showUploadProgress(percent);
    }

    hideUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    async refreshFileList() {
        if (!this.currentProjectId) return;

        try {
            const response = await fetch(`api/files.php?action=list&project_id=${this.currentProjectId}`);
            const data = await response.json();

            if (data.success) {
                this.updateFileDisplay(data.files, data.stats);
            }
        } catch (error) {
            console.error('Error refreshing file list:', error);
        }
    }

    updateFileDisplay(files, stats) {
        // Update file counts
        const totalFiles = document.getElementById('totalFiles');
        const mediaFiles = document.getElementById('mediaFiles');
        const totalSize = document.getElementById('totalSize');

        if (totalFiles) totalFiles.textContent = `${stats.total_files} קבצים`;
        if (mediaFiles) mediaFiles.textContent = `${stats.media_files} מדיה`;
        if (totalSize) totalSize.textContent = this.formatFileSize(stats.total_size);

        // Update file lists
        this.updateFileList('media', files.media || []);
        this.updateFileList('helper', files.helper || []);
    }

    updateFileList(category, files) {
        const container = document.querySelector(`[data-category="${category}"] .file-list`);
        if (!container) return;

        container.innerHTML = '';

        files.forEach(file => {
            const fileItem = this.createFileItem(file);
            container.appendChild(fileItem);
        });
    }

    createFileItem(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <div class="file-icon">${this.getFileIcon(file.file_type)}</div>
            <div class="file-info">
                <div class="file-name">${file.original_name}</div>
                <div class="file-meta">
                    <span>גודל: ${file.file_size_formatted}</span>
                    <span>הועלה: ${file.upload_date_formatted}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-action-btn" onclick="downloadFile('${file.id}')">הורד</button>
                <button class="file-action-btn danger" onclick="deleteFile('${file.id}')">מחק</button>
            </div>
        `;
        return div;
    }

    getFileIcon(fileType) {
        if (fileType.includes('audio')) return '🎵';
        if (fileType.includes('video')) return '🎬';
        if (fileType.includes('image')) return '🖼️';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word')) return '📝';
        return '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    showMessage(message, type = 'info') {
        // Use existing notification system if available
        if (window.TranscriptionSystem && window.TranscriptionSystem.showNotification) {
            window.TranscriptionSystem.showNotification(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
}

// Global functions for file operations
async function deleteFile(fileId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file_id', fileId);

        const response = await fetch('api/files.php?action=delete', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            uploadManager.showSuccess('הקובץ נמחק בהצלחה');
            uploadManager.refreshFileList();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        uploadManager.showError('שגיאה במחיקת הקובץ: ' + error.message);
    }
}

function downloadFile(fileId) {
    window.open(`api/files.php?action=download&file_id=${fileId}`, '_blank');
}

// Initialize upload manager
let uploadManager;

document.addEventListener('DOMContentLoaded', function() {
    uploadManager = new FileUploadManager();
});

// Export for use in other files
window.FileUploadManager = FileUploadManager;
window.uploadManager = uploadManager;