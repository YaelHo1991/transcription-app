/**
 * Drag and Drop Functionality for Transcription Page
 * Handles file drops on sidebar projects and media player
 */

// Initialize drag and drop when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDragAndDrop();
});

function initializeDragAndDrop() {
    // Setup media player drop zone
    setupMediaPlayerDropZone();
    
    // Setup sidebar project drop zones
    setupSidebarProjectDropZones();
    
    // Setup general page drop zone for new projects
    setupPageDropZone();
}

// Setup media player as drop zone for new projects
function setupMediaPlayerDropZone() {
    const mediaSection = document.querySelector('.media-section');
    if (!mediaSection) return;
    
    mediaSection.addEventListener('dragover', handleDragOver);
    mediaSection.addEventListener('dragleave', handleDragLeave);
    mediaSection.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const mediaFiles = filterMediaFiles(files);
        
        if (mediaFiles.length > 0) {
            createNewProjectWithFiles(mediaFiles);
        } else {
            showMessage('נא לגרור קבצי מדיה בלבד', 'warning');
        }
    });
}

// Setup sidebar project items as drop zones
function setupSidebarProjectDropZones() {
    // Re-initialize when sidebar content changes
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    // Use MutationObserver to watch for project list changes
    const observer = new MutationObserver(function() {
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            // Remove existing listeners to prevent duplicates
            item.removeEventListener('dragover', handleDragOver);
            item.removeEventListener('dragleave', handleDragLeave);
            item.removeEventListener('drop', handleProjectDrop);
            
            // Add new listeners
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('dragleave', handleDragLeave);
            item.addEventListener('drop', handleProjectDrop);
        });
    });
    
    observer.observe(sidebar, { childList: true, subtree: true });
}

// Setup general page drop zone
function setupPageDropZone() {
    // Create invisible drop zone for blank areas
    document.body.addEventListener('dragover', function(e) {
        // Only handle if not over another drop zone
        if (!e.target.closest('.project-item, .media-section, .file-drop-zone')) {
            e.preventDefault();
            showDropIndicator();
        }
    });
    
    document.body.addEventListener('dragleave', function(e) {
        if (!e.relatedTarget || !e.relatedTarget.closest('.project-item, .media-section, .file-drop-zone')) {
            hideDropIndicator();
        }
    });
    
    document.body.addEventListener('drop', function(e) {
        if (!e.target.closest('.project-item, .media-section, .file-drop-zone')) {
            e.preventDefault();
            hideDropIndicator();
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                showFileTypeDialog(files);
            }
        }
    });
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
}

// Handle drop on project item
function handleProjectDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    
    // Get project ID from the element
    const projectId = this.dataset.projectId;
    if (!projectId) {
        console.error('No project ID found');
        return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        addFilesToProject(projectId, files);
    }
}

// Filter media files
function filterMediaFiles(files) {
    const mediaExtensions = ['mp3', 'mp4', 'wav', 'avi', 'mov', 'webm', 'ogg', 'flac', 'm4a', 'wma'];
    return files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return mediaExtensions.includes(ext);
    });
}

// Create new project with files
async function createNewProjectWithFiles(files) {
    showMessage('יוצר פרויקט חדש...', 'info');
    
    const formData = new FormData();
    formData.append('create_new_project', 'true');
    formData.append('storage_type', 'server'); // Default to server storage
    formData.append('file_category', 'media');
    
    // Add files
    files.forEach(file => {
        formData.append('files[]', file);
    });
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const devParam = urlParams.get('dev') ? '?dev=1' : '';
        // Use the create project with media endpoint
        const response = await fetch(`../../core/api/create-project-with-media.php${devParam}`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('פרויקט חדש נוצר בהצלחה', 'success');
            // Reload page to show new project
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showMessage('שגיאה ביצירת פרויקט: ' + (data.errors ? data.errors.join(', ') : 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        showMessage('שגיאה ביצירת פרויקט', 'error');
    }
}

// Add files to existing project
async function addFilesToProject(projectId, files) {
    // Determine file types
    const categories = categorizeFiles(files);
    
    // Show dialog to choose file types
    const fileTypeDialog = createFileTypeDialog(categories);
    document.body.appendChild(fileTypeDialog);
    
    // Wait for user selection
    fileTypeDialog.querySelector('#confirmUpload').onclick = async function() {
        const selectedCategories = [];
        if (fileTypeDialog.querySelector('#uploadMedia').checked) selectedCategories.push('media');
        if (fileTypeDialog.querySelector('#uploadTranscriptions').checked) selectedCategories.push('transcriptions');
        if (fileTypeDialog.querySelector('#uploadHelpers').checked) selectedCategories.push('helpers');
        
        document.body.removeChild(fileTypeDialog);
        
        // Upload files by category
        for (const category of selectedCategories) {
            if (categories[category].length > 0) {
                await uploadFilesToProject(projectId, categories[category], category);
            }
        }
    };
    
    fileTypeDialog.querySelector('#cancelUpload').onclick = function() {
        document.body.removeChild(fileTypeDialog);
    };
}

// Categorize files by type
function categorizeFiles(files) {
    const categories = {
        media: [],
        transcriptions: [],
        helpers: []
    };
    
    const mediaExt = ['mp3', 'mp4', 'wav', 'avi', 'mov', 'webm', 'ogg', 'flac', 'm4a', 'wma'];
    const transcriptionExt = ['docx', 'doc', 'txt', 'rtf'];
    const helperExt = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp'];
    
    files.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (mediaExt.includes(ext)) {
            categories.media.push(file);
        } else if (transcriptionExt.includes(ext)) {
            categories.transcriptions.push(file);
        } else if (helperExt.includes(ext)) {
            categories.helpers.push(file);
        }
    });
    
    return categories;
}

// Upload files to project
async function uploadFilesToProject(projectId, files, category) {
    showMessage(`מעלה ${files.length} קבצים...`, 'info');
    
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('storage_type', 'server');
    formData.append('file_category', category);
    
    files.forEach(file => {
        formData.append('files[]', file);
    });
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const devParam = urlParams.get('dev') ? '?dev=1' : '';
        // Use the client API endpoint instead of server API
        const response = await fetch(`../../core/api/upload.php${devParam}`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`${data.files.length} קבצים הועלו בהצלחה`, 'success');
            // Refresh file list if in transcription page
            if (typeof loadProjectFiles === 'function') {
                loadProjectFiles(projectId);
            }
        } else {
            showMessage('שגיאה בהעלאת קבצים: ' + (data.errors ? data.errors.join(', ') : 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        showMessage('שגיאה בהעלאת קבצים', 'error');
    }
}

// Create file type selection dialog
function createFileTypeDialog(categories) {
    const dialog = document.createElement('div');
    dialog.className = 'file-type-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 300px;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-bottom: 15px;">בחר סוג קבצים להעלאה</h3>
        <div style="margin-bottom: 10px;">
            <label style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="uploadMedia" ${categories.media.length > 0 ? 'checked' : 'disabled'}>
                <span>קבצי מדיה (${categories.media.length})</span>
            </label>
        </div>
        <div style="margin-bottom: 10px;">
            <label style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="uploadTranscriptions" ${categories.transcriptions.length > 0 ? 'checked' : 'disabled'}>
                <span>קבצי תמלול (${categories.transcriptions.length})</span>
            </label>
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="uploadHelpers" ${categories.helpers.length > 0 ? 'checked' : 'disabled'}>
                <span>קבצי עזר (${categories.helpers.length})</span>
            </label>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelUpload" style="padding: 8px 16px;">ביטול</button>
            <button id="confirmUpload" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px;">העלה</button>
        </div>
    `;
    
    return dialog;
}

// Show drop indicator
function showDropIndicator() {
    let indicator = document.getElementById('dropIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'dropIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(40, 167, 69, 0.1);
            border: 3px dashed #28a745;
            pointer-events: none;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        indicator.innerHTML = '<h2 style="color: #28a745;">שחרר כאן ליצירת פרויקט חדש</h2>';
        document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
}

// Hide drop indicator
function hideDropIndicator() {
    const indicator = document.getElementById('dropIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Show message
function showMessage(message, type = 'info') {
    // Create simple message directly - don't call showCustomMessage to avoid loop
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 4px;
        z-index: 10001;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            document.body.removeChild(messageEl);
        }
    }, 3000);
}

// Show file type dialog for dropped files
function showFileTypeDialog(files) {
    const categories = categorizeFiles(files);
    const hasFiles = categories.media.length > 0 || categories.transcriptions.length > 0 || categories.helpers.length > 0;
    
    if (!hasFiles) {
        showMessage('לא נמצאו קבצים תואמים', 'warning');
        return;
    }
    
    const dialog = createFileTypeDialog(categories);
    dialog.querySelector('h3').textContent = 'יצירת פרויקט חדש';
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#confirmUpload').onclick = async function() {
        document.body.removeChild(dialog);
        createNewProjectWithFiles(files);
    };
    
    dialog.querySelector('#cancelUpload').onclick = function() {
        document.body.removeChild(dialog);
    };
}

// Add CSS for drag-over effect
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .drag-over {
            background-color: rgba(40, 167, 69, 0.1) !important;
            border: 2px dashed #28a745 !important;
        }
        
        .project-item.drag-over {
            transform: scale(1.02);
            transition: transform 0.2s ease;
        }
        
        .media-section.drag-over {
            box-shadow: 0 0 20px rgba(40, 167, 69, 0.3);
        }
    `;
    document.head.appendChild(style);
})();