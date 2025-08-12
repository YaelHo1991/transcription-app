/**
 * Media Fix - Ensure media player loads correctly
 */

console.log('Media Fix: Loading...');

// Global fix function
window.fixMediaPlayer = function() {
    console.log('=== MEDIA FIX DIAGNOSTIC ===');
    
    // 1. Check if media player section exists
    const mediaSection = document.querySelector('.media-section');
    const mediaPlayerSection = document.querySelector('.media-player-section');
    const audioContainer = document.getElementById('audioModeContainer');
    
    console.log('Media Section found:', !!mediaSection);
    console.log('Media Player Section found:', !!mediaPlayerSection);
    console.log('Audio Container found:', !!audioContainer);
    
    // 2. Force visibility
    if (mediaSection) {
        mediaSection.style.display = 'block';
        mediaSection.style.minHeight = '300px';
        console.log('Forced media section visibility');
    }
    
    if (audioContainer) {
        audioContainer.style.display = 'block';
        console.log('Forced audio container visibility');
    }
    
    // 3. Check media player instance
    console.log('window.mediaPlayer exists:', !!window.mediaPlayer);
    console.log('window.currentMediaFiles:', window.currentMediaFiles);
    
    // 4. Try to initialize media player
    if (window.mediaPlayer && window.currentMediaFiles && window.currentMediaFiles.length > 0) {
        console.log('Initializing media player with files...');
        window.mediaPlayer.init(window.currentMediaFiles);
        
        // Update UI elements
        const fileName = document.getElementById('fileName');
        if (fileName && window.currentMediaFiles[0]) {
            fileName.textContent = window.currentMediaFiles[0].original_name || 'Unknown';
        }
        
        const mediaCounter = document.getElementById('mediaCounter');
        if (mediaCounter) {
            mediaCounter.textContent = `קובץ 1 מתוך ${window.currentMediaFiles.length}`;
        }
        
        console.log('Media player initialized successfully');
    } else {
        console.error('Cannot initialize - missing components');
    }
    
    console.log('=== END DIAGNOSTIC ===');
};

// Auto-fix on load
let fixAttempts = 0;
const tryFix = setInterval(() => {
    fixAttempts++;
    console.log(`Media Fix: Attempt ${fixAttempts}`);
    
    // Check if everything is ready
    if (window.mediaPlayer && document.querySelector('.media-section')) {
        console.log('Media Fix: Components ready, applying fix...');
        window.fixMediaPlayer();
        clearInterval(tryFix);
    } else if (fixAttempts > 10) {
        console.error('Media Fix: Gave up after 10 attempts');
        clearInterval(tryFix);
    }
}, 500);

// Add keyboard shortcut for manual fix
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        console.log('Manual media fix triggered');
        window.fixMediaPlayer();
    }
});

console.log('Media Fix: Loaded - Press Ctrl+Shift+M to manually trigger fix');