// Local Media Loader - Upload from Computer
function loadTestMedia() {
    console.log('Opening media loader...');
    
    // Create file input if it doesn't exist
    let fileInput = document.getElementById('mediaFileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'mediaFileInput';
        fileInput.accept = 'audio/*,video/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name, file.type);
                loadLocalFile(file);
            }
        });
    }
    
    // Trigger file selection
    fileInput.click();
}

function loadLocalFile(file) {
    console.log('Loading local file:', file.name);
    
    // Create URL for the file
    const fileURL = URL.createObjectURL(file);
    console.log('File URL created:', fileURL);
    
    // Find the media player
    const player = findMediaPlayer();
    
    if (player) {
        loadIntoExistingPlayer(player, fileURL, file);
    } else {
        createNewPlayer(fileURL, file);
    }
}

function findMediaPlayer() {
    // The media player uses an audio element with id="audioPlayer"
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer) {
        console.log('Found audio player element');
        return audioPlayer;
    }
    
    // Try other selectors as fallback
    const selectors = [
        '#videoPlayer',
        '.media-player video',
        '.media-player audio',
        'video',
        'audio'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log('Found media player with selector:', selector);
            return element;
        }
    }
    
    console.log('No existing media player found');
    return null;
}

function loadIntoExistingPlayer(player, fileURL, file) {
    console.log('Loading into existing player...');
    
    // Check if the media player has a loadMedia function (the modular player does)
    if (window.mediaPlayer && window.mediaPlayer.loadMedia) {
        console.log('Using mediaPlayer.loadMedia function');
        window.mediaPlayer.loadMedia(fileURL, file.name, file.type);
        updateMediaInfo(file);
        showNotification('המדיה נטענה בהצלחה!', 'success');
        return;
    }
    
    // Fallback: directly set the source
    console.log('Setting source directly on player element');
    
    // Stop current playback
    player.pause();
    
    // Set new source
    player.src = fileURL;
    
    // For video files with audio element, we need to handle differently
    const isVideo = file.type.startsWith('video');
    if (isVideo && player.tagName === 'AUDIO') {
        console.log('Note: Loading video file into audio player - only audio will play');
        showNotification('קובץ וידאו נטען - רק האודיו יושמע', 'info');
    }
    
    // Update UI
    updateMediaInfo(file);
    
    // Try to play
    player.load();
    player.play().then(() => {
        console.log('Playback started successfully');
        showNotification('המדיה נטענה בהצלחה!', 'success');
    }).catch(err => {
        console.log('Auto-play blocked, user needs to press play:', err);
        showNotification('המדיה נטענה - לחץ על Play להפעלה', 'info');
    });
    
    // Log player events for debugging
    player.addEventListener('loadedmetadata', () => {
        console.log('Media metadata loaded:', {
            duration: player.duration,
            videoWidth: player.videoWidth,
            videoHeight: player.videoHeight
        });
        updateDuration(player.duration);
    });
    
    player.addEventListener('error', (e) => {
        console.error('Media player error:', e);
        showNotification('שגיאה בטעינת המדיה', 'error');
    });
}

function createNewPlayer(fileURL, file) {
    console.log('Creating new media player...');
    
    // Find container - try multiple possible locations
    const containerSelectors = [
        '.media-player',
        '.media-player-container',
        '.video-container',
        '.media-section',
        '.video-cube',
        '.media-player-wrapper',
        '#media-player-section',
        '.content-area',
        'main',
        'body'
    ];
    
    let container = null;
    for (const selector of containerSelectors) {
        container = document.querySelector(selector);
        if (container) {
            console.log('Found container with selector:', selector);
            break;
        }
    }
    
    if (!container) {
        console.error('No suitable container found');
        showNotification('לא נמצא מיקום מתאים לנגן המדיה', 'error');
        return;
    }
    
    // Create player element
    const isVideo = file.type.startsWith('video');
    const player = document.createElement(isVideo ? 'video' : 'audio');
    player.id = 'videoPlayer';
    player.controls = true;
    player.src = fileURL;
    player.style.cssText = `
        width: 100%;
        max-width: 100%;
        max-height: 500px;
        background: #000;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        padding: 20px;
        background: #f5f5f5;
        border-radius: 8px;
        margin: 20px 0;
    `;
    wrapper.appendChild(player);
    
    // Add to container (at the beginning)
    if (container.firstChild) {
        container.insertBefore(wrapper, container.firstChild);
    } else {
        container.appendChild(wrapper);
    }
    
    // Update UI
    updateMediaInfo(file);
    
    // Try to play
    player.load();
    player.play().catch(() => {
        console.log('User needs to press play manually');
    });
    
    showNotification('נגן מדיה חדש נוצר בהצלחה!', 'success');
}

function updateMediaInfo(file) {
    // Update file name
    const fileNameElement = document.getElementById('fileName');
    if (fileNameElement) {
        fileNameElement.textContent = file.name;
    }
    
    // Update file type
    const fileTypeElement = document.getElementById('fileType');
    if (fileTypeElement) {
        const type = file.type.startsWith('video') ? 'וידאו' : 'אודיו';
        fileTypeElement.textContent = type;
    }
    
    // Update file size
    const fileSizeElement = document.getElementById('fileSize');
    if (fileSizeElement) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileSizeElement.textContent = `${sizeMB} MB`;
    }
    
    // Update media counter
    const mediaCounter = document.getElementById('mediaCounter');
    if (mediaCounter) {
        mediaCounter.textContent = '1/1';
    }
    
    console.log('Media info updated for:', file.name);
}

function updateDuration(seconds) {
    const durationElement = document.getElementById('fileDuration');
    if (durationElement && !isNaN(seconds)) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        durationElement.textContent = formatted;
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.media-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'media-notification';
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
        direction: rtl;
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
if (!document.getElementById('media-loader-styles')) {
    const style = document.createElement('style');
    style.id = 'media-loader-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .media-notification {
            cursor: pointer;
        }
        .media-notification:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
}

// Also check for the modular player specifically
document.addEventListener('DOMContentLoaded', function() {
    console.log('Local media loader ready');
    console.log('Available media containers:', {
        mediaPlayer: document.querySelector('.media-player'),
        videoCube: document.querySelector('.video-cube'),
        videoElement: document.querySelector('video'),
        audioElement: document.querySelector('audio')
    });
});

console.log('Local media loader script loaded');