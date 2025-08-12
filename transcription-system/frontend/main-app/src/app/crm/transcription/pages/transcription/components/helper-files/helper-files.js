/**
 * Helper Files Component
 * Manages helper files display and interaction
 */

let helperFilesExpanded = true;
let helperFilesVisible = false;

// Toggle helper files visibility
function toggleHelperFiles() {
    const sideWorkspace = document.querySelector('.side-workspace');
    const toggleIcon = document.getElementById('helperToggleIcon');
    
    if (sideWorkspace) {
        sideWorkspace.classList.toggle('helper-files-active');
        
        if (sideWorkspace.classList.contains('helper-files-active')) {
            toggleIcon.textContent = '▲';
        } else {
            toggleIcon.textContent = '▼';
        }
    }
}

// Load helper files for current project
function loadHelperFiles(projectId) {
    const content = document.querySelector('.helper-files-content');
    if (!content) return;
    
    // This would normally fetch from API
    // For now, show placeholder
    content.innerHTML = '<div class="no-helper-files">אין קבצי עזר זמינים</div>';
}

// View helper file
function viewHelperFile(fileId) {
    // Open helper file in new window or modal
    if (typeof API_URL !== 'undefined') {
        window.open(`${API_URL}/media-stream.php?file_id=${fileId}`, '_blank');
    }
}

// Make toggleHelperFiles available globally
window.toggleHelperFiles = toggleHelperFiles;

// Initialize helper files
document.addEventListener('DOMContentLoaded', function() {
    // Load helper files if project is already selected
    if (typeof currentProjectId !== 'undefined' && currentProjectId) {
        loadHelperFiles(currentProjectId);
    }
});

// Toggle helper files panel (show/hide entire section)
function toggleHelperFilesPanel() {
    const helperSection = document.querySelector('.helper-files-section');
    const sideWorkspace = document.querySelector('.side-workspace');
    const triggerBtn = document.querySelector('.helper-files-trigger');
    
    if (!helperSection || !sideWorkspace || !triggerBtn) return;
    
    helperFilesVisible = !helperFilesVisible;
    
    if (helperFilesVisible) {
        helperSection.classList.add('show');
        sideWorkspace.classList.add('helper-files-active');
        triggerBtn.classList.add('active');
    } else {
        helperSection.classList.remove('show');
        sideWorkspace.classList.remove('helper-files-active');
        triggerBtn.classList.remove('active');
    }
}

// Export functions to global scope
window.toggleHelperFiles = toggleHelperFiles;
window.toggleHelperFilesPanel = toggleHelperFilesPanel;
window.viewHelperFile = viewHelperFile;
window.loadHelperFiles = loadHelperFiles;