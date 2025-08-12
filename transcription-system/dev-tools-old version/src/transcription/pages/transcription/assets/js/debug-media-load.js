/**
 * Debug Media Loading - Find exactly why media won't load
 */

console.log('%c=== MEDIA LOADING DEBUG STARTED ===', 'color: blue; font-weight: bold');

// Override loadProject to trace execution
const originalLoadProject = window.loadProject;
window.loadProject = async function(projectId) {
    console.log('%c1. loadProject called with:', 'color: green', projectId);
    
    if (originalLoadProject) {
        await originalLoadProject.call(this, projectId);
    }
    
    // Check what happened
    setTimeout(() => {
        console.log('%c2. Checking results after loadProject:', 'color: green');
        console.log('- currentMediaFiles:', window.currentMediaFiles);
        console.log('- mediaPlayer exists:', !!window.mediaPlayer);
        console.log('- audioPlayer element:', document.getElementById('audioPlayer'));
        
        // Try to force load first file
        if (window.currentMediaFiles && window.currentMediaFiles.length > 0) {
            const firstFile = window.currentMediaFiles[0];
            console.log('%c3. First media file:', 'color: green', firstFile);
            
            // Try different URL formats
            const possibleUrls = [
                firstFile.file_path,
                firstFile.stream_url ? 'http://localhost:8080' + firstFile.stream_url : null,
                firstFile.direct_url ? 'http://localhost:8080' + firstFile.direct_url : null,
                firstFile.path ? 'http://localhost:8080/' + firstFile.path : null
            ].filter(url => url);
            
            console.log('%c4. Possible URLs:', 'color: green', possibleUrls);
            
            // Try to load directly into audio element
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer && possibleUrls.length > 0) {
                console.log('%c5. Loading URL into audio player:', 'color: green', possibleUrls[0]);
                audioPlayer.src = possibleUrls[0];
                audioPlayer.load();
                
                // Update display
                const fileName = document.getElementById('fileName');
                if (fileName) {
                    fileName.textContent = firstFile.original_name || firstFile.filename || 'Loading...';
                }
                
                // Try to play
                audioPlayer.play().then(() => {
                    console.log('%c6. Media playing successfully!', 'color: green');
                }).catch(e => {
                    console.log('%c6. Auto-play blocked:', 'color: orange', e.message);
                });
            } else {
                console.error('%c5. Cannot load - no audio player or URLs', 'color: red');
            }
        } else {
            console.error('%c3. No media files found!', 'color: red');
        }
    }, 1000);
};

// Override loadProjectFiles to trace file loading
const originalLoadProjectFiles = window.loadProjectFiles;
window.loadProjectFiles = async function(projectId) {
    console.log('%cloadProjectFiles called with:', 'color: blue', projectId);
    
    if (originalLoadProjectFiles) {
        await originalLoadProjectFiles.call(this, projectId);
    }
    
    console.log('%cAfter loadProjectFiles:', 'color: blue');
    console.log('- currentMediaFiles:', window.currentMediaFiles);
};

// Add manual test function
window.testMediaLoad = async function(projectId) {
    console.log('%c=== MANUAL MEDIA TEST ===', 'color: purple; font-weight: bold');
    
    // Fetch project files directly
    try {
        const response = await fetch(`http://localhost:8080/api/get-project-files.php?project_id=${projectId}`);
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success && data.files && data.files.media && data.files.media.length > 0) {
            const firstFile = data.files.media[0];
            console.log('First file:', firstFile);
            
            // Build URL
            let mediaUrl = '';
            if (firstFile.stream_url) {
                mediaUrl = 'http://localhost:8080' + firstFile.stream_url;
            } else if (firstFile.direct_url) {
                mediaUrl = 'http://localhost:8080' + firstFile.direct_url;
            } else if (firstFile.path) {
                mediaUrl = 'http://localhost:8080/' + firstFile.path;
            }
            
            console.log('Media URL:', mediaUrl);
            
            // Load into player
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                audioPlayer.src = mediaUrl;
                audioPlayer.load();
                console.log('Media loaded into player');
                
                // Show player
                const audioContainer = document.getElementById('audioModeContainer');
                if (audioContainer) {
                    audioContainer.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
};

// Log when script loads
console.log('%cDebug script loaded. Use testMediaLoad(projectId) to test manually', 'color: purple');

// Auto-test with first project after page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        const firstProject = document.querySelector('.project-item');
        if (firstProject) {
            const projectId = firstProject.dataset.projectId;
            console.log('%cAuto-testing with project:', 'color: purple', projectId);
            window.testMediaLoad(projectId);
        }
    }, 3000);
});