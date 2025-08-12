/**
 * Project Media Loader
 * Handles loading project media files into the media player
 */

const ProjectMediaLoader = (function() {
    'use strict';
    
    let currentProjectId = null;
    let mediaFiles = [];
    
    /**
     * Load media files for a project
     */
    async function loadProjectMedia(projectId) {
        console.log('Loading media for project:', projectId);
        currentProjectId = projectId;
        
        try {
            // Get dev parameter
            const urlParams = new URLSearchParams(window.location.search);
            const devParam = urlParams.get('dev') ? '&dev=1' : '';
            
            // Fetch project files
            const response = await fetch(`../../core/api/files.php?project_id=${projectId}${devParam}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success && data.files) {
                // Extract media files
                mediaFiles = data.files.media || [];
                
                // Process media files
                const processedFiles = mediaFiles.map(file => {
                    // Ensure proper file path
                    if (!file.file_path) {
                        // Construct file path based on upload structure
                        const userId = file.uploaded_by || 1;
                        const category = file.mime_type && file.mime_type.startsWith('video/') ? 'video' : 'audio';
                        file.file_path = `/server/src/uploads/users/${userId}/projects/${projectId}/media/${category}/${file.stored_name || file.original_name}`;
                    }
                    
                    // Ensure streaming URL
                    if (!file.stream_url) {
                        file.stream_url = `/api/stream-media.php?project_id=${projectId}&file_id=${file.id}`;
                    }
                    
                    return {
                        id: file.id,
                        original_name: file.original_name,
                        file_path: file.file_path,
                        stream_url: file.stream_url,
                        mime_type: file.mime_type,
                        file_size: file.file_size,
                        duration: file.duration || null
                    };
                });
                
                // Load into media player
                if (window.mediaPlayer) {
                    console.log('Loading', processedFiles.length, 'media files into player');
                    window.mediaPlayer.init(processedFiles);
                    
                    // Update UI
                    updateMediaCounter(processedFiles.length);
                    showMessage(`נטענו ${processedFiles.length} קבצי מדיה`, 'success');
                } else if (window.loadMediaFiles) {
                    // Fallback to global function
                    window.loadMediaFiles(processedFiles, projectId);
                } else {
                    console.error('Media player not found!');
                    showMessage('שגיאה: נגן המדיה לא נמצא', 'error');
                }
                
                return processedFiles;
            } else {
                console.log('No media files found for project');
                showMessage('לא נמצאו קבצי מדיה בפרויקט', 'info');
                return [];
            }
        } catch (error) {
            console.error('Error loading project media:', error);
            showMessage('שגיאה בטעינת קבצי מדיה', 'error');
            return [];
        }
    }
    
    /**
     * Update media counter in UI
     */
    function updateMediaCounter(count) {
        const mediaCounter = document.getElementById('mediaCounter');
        if (mediaCounter && count > 0) {
            mediaCounter.textContent = `קובץ 1 מתוך ${count}`;
        }
    }
    
    /**
     * Show message to user
     */
    function showMessage(message, type = 'info') {
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Get current media files
     */
    function getMediaFiles() {
        return mediaFiles;
    }
    
    /**
     * Get current project ID
     */
    function getCurrentProjectId() {
        return currentProjectId;
    }
    
    // Public API
    return {
        loadProjectMedia,
        getMediaFiles,
        getCurrentProjectId
    };
})();

// Make globally available
window.ProjectMediaLoader = ProjectMediaLoader;

// Override loadProjectFiles if it exists
if (typeof window.loadProjectFiles !== 'undefined') {
    const originalLoadProjectFiles = window.loadProjectFiles;
    window.loadProjectFiles = async function(projectId) {
        console.log('loadProjectFiles called with:', projectId);
        
        // Call original if needed
        if (originalLoadProjectFiles && originalLoadProjectFiles !== window.loadProjectFiles) {
            await originalLoadProjectFiles(projectId);
        }
        
        // Load media using our loader
        return await ProjectMediaLoader.loadProjectMedia(projectId);
    };
} else {
    // Create the function if it doesn't exist
    window.loadProjectFiles = async function(projectId) {
        return await ProjectMediaLoader.loadProjectMedia(projectId);
    };
}