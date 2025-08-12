// Test Media Loader for Digital Ocean Testing
function loadTestMedia() {
    console.log('Loading test media...');
    
    // Sample media URLs (you can use any public audio/video URLs)
    const testMediaUrls = [
        {
            url: 'https://www.w3schools.com/html/mov_bbb.mp4',
            name: 'Big Buck Bunny Sample',
            type: 'video/mp4'
        },
        {
            url: 'https://sample-videos.com/audio/mp3/crowd-cheering.mp3',
            name: 'Sample Audio',
            type: 'audio/mp3'
        },
        {
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            name: 'Big Buck Bunny Full',
            type: 'video/mp4'
        }
    ];
    
    // Prompt user to select media
    const mediaList = testMediaUrls.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const selection = prompt(`בחר מדיה לטעינה:\n${mediaList}\n\nהזן מספר (1-${testMediaUrls.length}):`);
    
    if (selection && selection >= 1 && selection <= testMediaUrls.length) {
        const selectedMedia = testMediaUrls[selection - 1];
        
        // Load the media into the player
        loadMediaIntoPlayer(selectedMedia);
    }
}

function loadMediaIntoPlayer(mediaInfo) {
    console.log('Loading media:', mediaInfo);
    
    // Get the video element
    const videoElement = document.querySelector('#videoPlayer') || 
                        document.querySelector('video') || 
                        document.querySelector('#mediaPlayer video');
    
    if (videoElement) {
        // Set the source
        videoElement.src = mediaInfo.url;
        
        // Update UI
        updateMediaInfo(mediaInfo);
        
        // Try to play
        videoElement.play().then(() => {
            console.log('Media playing successfully');
            showNotification('המדיה נטענה בהצלחה!', 'success');
        }).catch(err => {
            console.error('Error playing media:', err);
            showNotification('שגיאה בהפעלת המדיה', 'error');
        });
    } else {
        // If no video element found, try creating one
        createAndLoadMedia(mediaInfo);
    }
}

function createAndLoadMedia(mediaInfo) {
    console.log('Creating media player for:', mediaInfo);
    
    // Find the media player container
    const container = document.querySelector('.media-player-container') || 
                     document.querySelector('.video-container') ||
                     document.querySelector('.media-section') ||
                     document.querySelector('[class*="media"]');
    
    if (container) {
        // Create video element
        const isVideo = mediaInfo.type.includes('video');
        const mediaElement = document.createElement(isVideo ? 'video' : 'audio');
        mediaElement.id = 'videoPlayer';
        mediaElement.controls = true;
        mediaElement.style.width = '100%';
        mediaElement.style.maxHeight = '500px';
        mediaElement.src = mediaInfo.url;
        
        // Clear container and add media
        container.innerHTML = '';
        container.appendChild(mediaElement);
        
        // Update info
        updateMediaInfo(mediaInfo);
        
        // Try to play
        mediaElement.play().catch(err => {
            console.log('User needs to interact first');
        });
        
        showNotification('נגן מדיה נוצר בהצלחה!', 'success');
    } else {
        alert('לא נמצא מיקום לנגן המדיה. נסה לרענן את הדף.');
    }
}

function updateMediaInfo(mediaInfo) {
    // Update file name
    const fileNameElement = document.getElementById('fileName');
    if (fileNameElement) {
        fileNameElement.textContent = mediaInfo.name;
    }
    
    // Update file type
    const fileTypeElement = document.getElementById('fileType');
    if (fileTypeElement) {
        fileTypeElement.textContent = mediaInfo.type.includes('video') ? 'וידאו' : 'אודיו';
    }
    
    // Update media counter
    const mediaCounter = document.getElementById('mediaCounter');
    if (mediaCounter) {
        mediaCounter.textContent = '1/1';
    }
    
    console.log('Media info updated');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
if (!document.getElementById('test-media-styles')) {
    const style = document.createElement('style');
    style.id = 'test-media-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

console.log('Test media loader initialized');