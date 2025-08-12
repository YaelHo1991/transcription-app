/**
 * Simple Media Loader - Ensures media files load correctly
 */

console.log('Media Loader: Initializing...');

// Override loadMedia function to ensure it works
window.loadMediaFile = function(filePath, fileName) {
    console.log('Loading media file:', fileName, filePath);
    
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');
    
    if (!audioPlayer) {
        console.error('Audio player element not found!');
        return;
    }
    
    // Determine if it's audio or video
    const isVideo = /\.(mp4|avi|mov|webm|mkv)$/i.test(fileName);
    
    if (isVideo && videoPlayer) {
        // Hide audio, show video
        document.getElementById('audioModeContainer').style.display = 'none';
        document.getElementById('videoModeContainer').style.display = 'block';
        
        videoPlayer.src = filePath;
        videoPlayer.load();
        console.log('Video loaded:', filePath);
    } else {
        // Show audio, hide video
        document.getElementById('audioModeContainer').style.display = 'block';
        if (document.getElementById('videoModeContainer')) {
            document.getElementById('videoModeContainer').style.display = 'none';
        }
        
        audioPlayer.src = filePath;
        audioPlayer.load();
        console.log('Audio loaded:', filePath);
    }
    
    // Update file info
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) fileNameEl.textContent = fileName;
    
    // Show success message
    if (window.showMessage) {
        window.showMessage('קובץ נטען: ' + fileName, 'success');
    }
};

// Ensure media loads when project files are loaded
const originalLoadProjectFiles = window.loadProjectFiles;
if (originalLoadProjectFiles) {
    window.loadProjectFiles = async function(projectId) {
        console.log('Media Loader: Intercepting project files load...');
        
        // Call original function
        await originalLoadProjectFiles.call(this, projectId);
        
        // Check if we have media files
        setTimeout(() => {
            if (window.currentMediaFiles && window.currentMediaFiles.length > 0) {
                const firstFile = window.currentMediaFiles[0];
                console.log('Media Loader: Loading first file:', firstFile);
                
                if (firstFile.file_path || firstFile.stream_url || firstFile.direct_url) {
                    const path = firstFile.file_path || 
                                (firstFile.stream_url ? 'http://localhost:8080' + firstFile.stream_url : null) ||
                                (firstFile.direct_url ? 'http://localhost:8080' + firstFile.direct_url : null);
                    
                    if (path) {
                        window.loadMediaFile(path, firstFile.original_name || firstFile.filename || 'Unknown');
                    }
                }
            }
        }, 500);
    };
}

console.log('Media Loader: Ready');