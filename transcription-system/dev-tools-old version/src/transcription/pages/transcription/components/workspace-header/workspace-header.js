/**
 * Workspace Header Component
 * Handles project title display and project navigation
 */

// Update workspace title
function updateWorkspaceTitle(title) {
    const titleElement = document.querySelector('.workspace-title');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

// Update current media display
function updateCurrentMedia(mediaName) {
    const mediaElement = document.getElementById('currentMediaName');
    if (mediaElement) {
        mediaElement.textContent = mediaName ? `נגן: ${mediaName}` : '';
    }
}

// Update status badge
function updateWorkspaceStatus(status) {
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        const statusText = {
            'pending': 'ממתין',
            'in_progress': 'בעבודה',
            'completed': 'הושלם'
        };
        statusBadge.textContent = statusText[status] || status;
    }
}

// Initialize workspace header
document.addEventListener('DOMContentLoaded', function() {
    // Project navigation buttons are handled by navigation component
    // This component focuses on display only
});