/*
 * Auto-Detect Block Integration
 * js/auto-detect-block-integration.js
 * 
 * Direct integration of auto-detect with block editor
 */

(function() {
    console.log('[Auto-detect Block Integration] Loading...');
    
    // Wait for all components to be ready
    let integrationInterval = null;
    let attempts = 0;
    
    function tryIntegration() {
        attempts++;
        
        // Check if all required components exist
        const editor = document.getElementById('textEditor');
        const hasAutoDetect = window.autoDetectRegular || window.autoDetectEnhanced;
        const hasMediaPlayer = window.mediaPlayer;
        
        if (!editor || !hasAutoDetect || !hasMediaPlayer) {
            if (attempts < 30) { // Try for 15 seconds
                return; // Keep trying
            } else {
                console.error('[Auto-detect Block Integration] Failed to find required components after 15 seconds');
                clearInterval(integrationInterval);
                return;
            }
        }
        
        // All components found, proceed with integration
        clearInterval(integrationInterval);
        console.log('[Auto-detect Block Integration] All components found, integrating...');
        
        // Setup the integration
        setupBlockIntegration(editor);
    }
    
    function setupBlockIntegration(editor) {
        console.log('[Auto-detect Block Integration] Setting up integration...');
        
        // Create a typing state manager
        const typingState = {
            isTyping: false,
            lastKeyTime: 0,
            typingTimeout: null,
            TYPING_TIMEOUT: 500 // ms before considered "stopped typing"
        };
        
        // Function to handle typing start
        function startTyping() {
            typingState.lastKeyTime = Date.now();
            
            if (!typingState.isTyping) {
                typingState.isTyping = true;
                console.log('[Auto-detect Block] Started typing');
                
                // Notify auto-detect instances
                if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                    // For regular mode, simulate typing start
                    if (window.mediaPlayer && window.mediaPlayer.currentPlayer && !window.mediaPlayer.currentPlayer.paused) {
                        window.autoDetectRegular.handleMediaPause();
                    }
                }
                
                if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                    // For enhanced mode, pause immediately
                    if (window.mediaPlayer && window.mediaPlayer.currentPlayer && !window.mediaPlayer.currentPlayer.paused) {
                        window.mediaPlayer.pause();
                        console.log('[Auto-detect Block] Enhanced mode - paused media');
                    }
                }
            }
            
            // Clear existing timeout
            if (typingState.typingTimeout) {
                clearTimeout(typingState.typingTimeout);
            }
            
            // Set new timeout
            typingState.typingTimeout = setTimeout(() => {
                stopTyping();
            }, typingState.TYPING_TIMEOUT);
        }
        
        // Function to handle typing stop
        function stopTyping() {
            if (typingState.isTyping) {
                typingState.isTyping = false;
                console.log('[Auto-detect Block] Stopped typing');
                
                // Notify auto-detect instances
                if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                    // For regular mode, simulate typing stop
                    if (window.mediaPlayer && window.mediaPlayer.currentPlayer && window.mediaPlayer.currentPlayer.paused) {
                        window.autoDetectRegular.handleMediaPlay();
                    }
                }
                
                if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                    // For enhanced mode, resume after delay
                    setTimeout(() => {
                        if (!typingState.isTyping && window.mediaPlayer && window.mediaPlayer.currentPlayer && window.mediaPlayer.currentPlayer.paused) {
                            window.mediaPlayer.play();
                            console.log('[Auto-detect Block] Enhanced mode - resumed media');
                        }
                    }, 500);
                }
            }
        }
        
        // Listen for input events on the editor
        editor.addEventListener('input', function(e) {
            // Check if input is from a block element
            if (e.target.classList.contains('block-speaker') || 
                e.target.classList.contains('block-text')) {
                startTyping();
            }
        });
        
        // Listen for keydown events
        editor.addEventListener('keydown', function(e) {
            // Check if keydown is from a block element
            if (e.target.classList.contains('block-speaker') || 
                e.target.classList.contains('block-text')) {
                // Only count actual typing keys
                const isTypingKey = e.key.length === 1 || 
                                  ['Backspace', 'Delete', 'Enter'].includes(e.key);
                
                if (isTypingKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    startTyping();
                }
            }
        });
        
        // Override auto-detect text editor references
        if (window.autoDetectRegular) {
            window.autoDetectRegular.textEditor = editor;
            console.log('[Auto-detect Block Integration] Patched regular mode editor reference');
        }
        
        if (window.autoDetectEnhanced) {
            window.autoDetectEnhanced.textEditor = editor;
            console.log('[Auto-detect Block Integration] Patched enhanced mode editor reference');
        }
        
        console.log('[Auto-detect Block Integration] Integration complete!');
        
        // Export for debugging
        window.autoDetectBlockIntegration = {
            typingState: typingState,
            startTyping: startTyping,
            stopTyping: stopTyping,
            isTyping: () => typingState.isTyping
        };
    }
    
    // Start integration attempts
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Auto-detect Block Integration] DOM loaded, starting integration attempts...');
        integrationInterval = setInterval(tryIntegration, 500);
        tryIntegration(); // Try immediately
    });
})();