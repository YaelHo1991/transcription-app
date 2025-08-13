/*
 * Auto-Detect Typing Fix
 * Direct integration between text editor and media player
 */

(function() {
    console.log('[Auto-Detect Fix] Initializing direct typing detection...');
    
    let isTyping = false;
    let typingTimeout = null;
    let mediaPlayer = null;
    let lastPauseTime = 0;
    
    // Settings
    let autoDetectEnabled = false;
    let resumeDelay = 500;
    let rewindOnPause = 0.5;
    
    function loadSettings() {
        const saved = localStorage.getItem('autoDetectSettings');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                autoDetectEnabled = data.enabled && data.currentMode === 'regular';
                resumeDelay = (data.settings.regular.resumeDelay || 0.5) * 1000;
                rewindOnPause = data.settings.regular.rewindOnPause || 0.5;
                console.log('[Auto-Detect Fix] Settings loaded:', { autoDetectEnabled, resumeDelay, rewindOnPause });
            } catch (e) {
                console.error('[Auto-Detect Fix] Failed to load settings:', e);
            }
        }
    }
    
    function findMediaPlayer() {
        // Try multiple ways to find the media player
        mediaPlayer = document.querySelector('audio#audioPlayer') || 
                     document.querySelector('video#videoPlayer') ||
                     document.querySelector('audio') ||
                     document.querySelector('video') ||
                     window.mediaPlayer ||
                     window.audioPlayer ||
                     window.videoPlayer;
                     
        if (mediaPlayer) {
            console.log('[Auto-Detect Fix] Found media player:', mediaPlayer.tagName);
        } else {
            console.log('[Auto-Detect Fix] Media player not found, will retry...');
        }
        
        return mediaPlayer;
    }
    
    function setupTypingDetection() {
        const editor = document.getElementById('textEditor');
        if (!editor) {
            console.log('[Auto-Detect Fix] Editor not found, retrying...');
            setTimeout(setupTypingDetection, 500);
            return;
        }
        
        console.log('[Auto-Detect Fix] Setting up typing detection on editor');
        
        // Load settings
        loadSettings();
        
        // Listen for settings changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'autoDetectSettings') {
                loadSettings();
            }
        });
        
        // Listen for typing in contenteditable elements
        editor.addEventListener('keydown', function(e) {
            // Ignore if not enabled
            if (!autoDetectEnabled) return;
            
            // Ignore modifier keys and special keys
            if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') return;
            
            // Check if typing in a contenteditable element
            const target = e.target;
            if (target.getAttribute('contenteditable') === 'true' || 
                target.classList.contains('block-speaker') || 
                target.classList.contains('block-text')) {
                handleTypingStart();
            }
        });
        
        editor.addEventListener('keyup', function(e) {
            if (!autoDetectEnabled) return;
            
            const target = e.target;
            if (target.getAttribute('contenteditable') === 'true' || 
                target.classList.contains('block-speaker') || 
                target.classList.contains('block-text')) {
                handleTypingStop();
            }
        });
        
        // Also handle input events
        editor.addEventListener('input', function(e) {
            if (!autoDetectEnabled) return;
            
            const target = e.target;
            if (target.getAttribute('contenteditable') === 'true' || 
                target.classList.contains('block-speaker') || 
                target.classList.contains('block-text')) {
                handleTypingStart();
                handleTypingStop();
            }
        });
        
        console.log('[Auto-Detect Fix] Typing detection setup complete');
        
        // Try to find media player periodically
        setInterval(() => {
            if (!mediaPlayer) {
                findMediaPlayer();
            }
        }, 1000);
    }
    
    function handleTypingStart() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        if (!isTyping) {
            isTyping = true;
            console.log('[Auto-Detect Fix] Typing started - pausing media');
            pauseMedia();
        }
    }
    
    function handleTypingStop() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        typingTimeout = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                console.log('[Auto-Detect Fix] Typing stopped - resuming media');
                resumeMedia();
            }
        }, resumeDelay);
    }
    
    function pauseMedia() {
        // First try to send message to iframe
        console.log('[Auto-Detect Fix] Sending pause message');
        window.postMessage({
            type: 'typingEvent',
            event: 'keydown'
        }, '*');
        
        // Also try direct control as fallback
        if (!findMediaPlayer()) {
            console.log('[Auto-Detect Fix] No media player found to pause');
            return;
        }
        
        if (!mediaPlayer.paused) {
            // Store the current time before pausing
            lastPauseTime = mediaPlayer.currentTime;
            mediaPlayer.pause();
            
            // Rewind if configured
            if (rewindOnPause > 0 && mediaPlayer.currentTime > rewindOnPause) {
                const newTime = mediaPlayer.currentTime - rewindOnPause;
                mediaPlayer.currentTime = newTime;
                console.log('[Auto-Detect Fix] Rewound by', rewindOnPause, 'seconds to', newTime);
            }
        }
    }
    
    function resumeMedia() {
        // First try to send message to iframe
        console.log('[Auto-Detect Fix] Sending resume message');
        window.postMessage({
            type: 'typingEvent',
            event: 'keyup'
        }, '*');
        
        // Also try direct control as fallback
        if (!findMediaPlayer()) {
            console.log('[Auto-Detect Fix] No media player found to resume');
            return;
        }
        
        if (mediaPlayer.paused) {
            mediaPlayer.play().catch(e => {
                console.log('[Auto-Detect Fix] Could not resume playback:', e);
            });
        }
    }
    
    // Start setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTypingDetection);
    } else {
        setupTypingDetection();
    }
    
    // Expose for debugging
    window.autoDetectFix = {
        test: function() {
            console.log('[Auto-Detect Fix] Testing...');
            console.log('Enabled:', autoDetectEnabled);
            console.log('Media player:', findMediaPlayer());
            console.log('Simulating typing...');
            handleTypingStart();
            setTimeout(() => handleTypingStop(), 1000);
        },
        enable: function() {
            autoDetectEnabled = true;
            console.log('[Auto-Detect Fix] Enabled manually');
        },
        disable: function() {
            autoDetectEnabled = false;
            console.log('[Auto-Detect Fix] Disabled manually');
        }
    };
})();