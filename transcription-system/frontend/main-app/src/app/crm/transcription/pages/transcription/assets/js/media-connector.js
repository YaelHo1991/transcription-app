/**
 * Media Connector - Simple bridge between project loading and media player
 */

// Wait for both DOM and media player to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Media Connector: Initializing...');
    
    // Override the loadProjectFiles function to ensure media loads
    const originalLoadProjectFiles = window.loadProjectFiles;
    
    window.loadProjectFiles = async function(projectId) {
        console.log('Media Connector: Intercepting loadProjectFiles for project:', projectId);
        
        try {
            // Call the original function
            if (originalLoadProjectFiles) {
                await originalLoadProjectFiles.call(this, projectId);
            }
            
            // Ensure media player is initialized with files
            setTimeout(() => {
                if (window.currentMediaFiles && window.currentMediaFiles.length > 0) {
                    console.log('Media Connector: Found media files:', window.currentMediaFiles);
                    
                    // Initialize media player if available
                    if (window.mediaPlayer) {
                        console.log('Media Connector: Initializing media player with files');
                        window.mediaPlayer.init(window.currentMediaFiles);
                        
                        // Update UI
                        const mediaCounter = document.getElementById('mediaCounter');
                        if (mediaCounter) {
                            mediaCounter.textContent = `קובץ 1 מתוך ${window.currentMediaFiles.length}`;
                        }
                        
                        // Show success message
                        if (window.showMessage) {
                            window.showMessage('מדיה נטענה בהצלחה', 'success');
                        }
                    } else {
                        console.error('Media Connector: Media player not found!');
                    }
                } else {
                    console.log('Media Connector: No media files found for this project');
                }
            }, 1000); // Give it time to initialize
            
        } catch (error) {
            console.error('Media Connector: Error in loadProjectFiles:', error);
        }
    };
    
    // Also add a global function to manually trigger media loading
    window.forceLoadMedia = function() {
        console.log('Force loading media...');
        if (window.currentMediaFiles && window.currentMediaFiles.length > 0 && window.mediaPlayer) {
            window.mediaPlayer.init(window.currentMediaFiles);
            console.log('Media loaded successfully');
        } else {
            console.error('Cannot load media - missing files or player');
        }
    };
});