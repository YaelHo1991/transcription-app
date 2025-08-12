/**
 * Direct Media Loader - Simple solution to load media files
 */

console.log('Direct Media Loader: Starting...');

// Direct load function
window.loadMediaDirect = async function(projectId) {
    console.log('Loading media for project:', projectId);
    
    try {
        // Fetch project files
        const response = await fetch(`http://localhost:8080/api/get-project-files.php?project_id=${projectId}`);
        const data = await response.json();
        
        if (data.success && data.files && data.files.media && data.files.media.length > 0) {
            const firstFile = data.files.media[0];
            console.log('Found media file:', firstFile);
            
            // Build media URL
            let mediaUrl = '';
            if (firstFile.stream_url) {
                mediaUrl = 'http://localhost:8080' + firstFile.stream_url;
            } else if (firstFile.direct_url) {
                mediaUrl = 'http://localhost:8080' + firstFile.direct_url;
            } else if (firstFile.path) {
                mediaUrl = 'http://localhost:8080/' + firstFile.path;
            }
            
            console.log('Media URL:', mediaUrl);
            
            // Get audio player
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                // Load the media
                audioPlayer.src = mediaUrl;
                audioPlayer.load();
                
                // Update display
                const fileName = document.getElementById('fileName');
                if (fileName) {
                    fileName.textContent = firstFile.original_name || firstFile.filename || 'Loading...';
                }
                
                const fileSize = document.getElementById('fileSize');
                if (fileSize) {
                    fileSize.textContent = firstFile.size_formatted || '-';
                }
                
                // Make sure player is visible
                const audioContainer = document.getElementById('audioModeContainer');
                if (audioContainer) {
                    audioContainer.style.display = 'block';
                }
                
                console.log('Media loaded successfully!');
                
                // Try to play
                audioPlayer.play().catch(e => {
                    console.log('Auto-play blocked - user needs to click play');
                });
                
                // Show success message
                if (window.showMessage) {
                    window.showMessage('מדיה נטענה: ' + (firstFile.original_name || 'קובץ'), 'success');
                }
            } else {
                console.error('Audio player not found!');
            }
        } else {
            console.log('No media files in project');
            if (window.showMessage) {
                window.showMessage('אין קבצי מדיה בפרויקט זה', 'info');
            }
        }
    } catch (error) {
        console.error('Error loading media:', error);
        if (window.showMessage) {
            window.showMessage('שגיאה בטעינת מדיה', 'error');
        }
    }
};

// Override project click to use direct loader
document.addEventListener('click', function(e) {
    const projectItem = e.target.closest('.project-item');
    if (projectItem && projectItem.dataset.projectId) {
        console.log('Project clicked, using direct loader');
        
        // Update active state
        document.querySelectorAll('.project-item').forEach(p => p.classList.remove('active'));
        projectItem.classList.add('active');
        
        // Load media directly
        window.loadMediaDirect(projectItem.dataset.projectId);
    }
}, true); // Use capture phase to intercept before other handlers

console.log('Direct Media Loader: Ready');

// Auto-load first project after delay
window.addEventListener('load', () => {
    setTimeout(() => {
        const firstProject = document.querySelector('.project-item');
        if (firstProject && firstProject.dataset.projectId) {
            console.log('Auto-loading first project');
            window.loadMediaDirect(firstProject.dataset.projectId);
        }
    }, 2000);
});