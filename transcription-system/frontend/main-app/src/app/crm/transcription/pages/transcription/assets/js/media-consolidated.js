/**
 * Consolidated Media Loader
 * Combines all media loading functionality into one file
 */

(function() {
    'use strict';
    
    console.log('Media Consolidated Loader initializing...');
    
    // Wait for DOM and media player to be ready
    function waitForMediaPlayer(callback) {
        const checkInterval = setInterval(() => {
            if (window.mediaPlayer && window.loadMediaFiles) {
                clearInterval(checkInterval);
                callback();
            }
        }, 100);
    }
    
    // Fix file paths for media files
    function fixFilePath(file) {
        if (!file.file_path) {
            // Try different URL patterns
            if (file.stream_url) {
                file.file_path = window.location.origin + file.stream_url;
            } else if (file.direct_url) {
                file.file_path = window.location.origin + file.direct_url;
            } else if (file.path) {
                file.file_path = window.location.origin + '/' + file.path;
            }
        }
        return file;
    }
    
    // Load project files into media player
    function loadProjectMedia(files, projectId) {
        if (!files || !Array.isArray(files) || files.length === 0) {
            console.log('No media files to load');
            return;
        }
        
        // Fix file paths
        const fixedFiles = files.map(file => fixFilePath(file));
        
        // Load into media player
        if (window.loadMediaFiles) {
            console.log(`Loading ${fixedFiles.length} media files for project ${projectId}`);
            window.loadMediaFiles(fixedFiles, projectId);
        } else {
            console.error('loadMediaFiles function not found');
        }
    }
    
    // Override loadProjectFiles to ensure media loads
    function setupProjectLoader() {
        const originalLoadProjectFiles = window.loadProjectFiles;
        
        window.loadProjectFiles = function(projectId) {
            console.log('Loading project files for:', projectId);
            
            // Call original function if it exists
            if (originalLoadProjectFiles) {
                originalLoadProjectFiles.call(this, projectId);
            }
            
            // Get project data
            const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
            if (projectElement) {
                const filesData = projectElement.getAttribute('data-files');
                if (filesData) {
                    try {
                        const files = JSON.parse(filesData);
                        loadProjectMedia(files, projectId);
                    } catch (e) {
                        console.error('Error parsing files data:', e);
                    }
                }
            }
        };
    }
    
    // Remove demo projects from sidebar
    function removeDemoProjects() {
        const projectItems = document.querySelectorAll('.project-item');
        let removedCount = 0;
        
        projectItems.forEach(item => {
            const titleElement = item.querySelector('.project-title');
            if (titleElement) {
                const title = titleElement.textContent.trim();
                if (title.includes('דוגמה') || title.toLowerCase().includes('test-') || title.toLowerCase().includes('demo')) {
                    item.remove();
                    removedCount++;
                }
            }
        });
        
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} demo projects`);
        }
    }
    
    // Initialize when DOM is ready
    function initialize() {
        console.log('Initializing media consolidated loader');
        
        // Wait for media player
        waitForMediaPlayer(() => {
            console.log('Media player ready');
            setupProjectLoader();
        });
        
        // Remove demo projects
        removeDemoProjects();
        
        // Also remove demo projects that might be added later
        const observer = new MutationObserver(() => {
            removeDemoProjects();
        });
        
        const sidebar = document.querySelector('.projects-sidebar');
        if (sidebar) {
            observer.observe(sidebar, { childList: true, subtree: true });
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();