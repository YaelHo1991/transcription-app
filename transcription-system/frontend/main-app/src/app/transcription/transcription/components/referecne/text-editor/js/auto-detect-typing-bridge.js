/*
 * Auto-Detect Typing Bridge
 * Forwards typing events from text editor to media player auto-detect
 */

(function() {
    console.log('[Auto-Detect Typing Bridge] Initializing...');
    
    let isTyping = false;
    let typingTimeout = null;
    
    function setupTypingDetection() {
        const editor = document.getElementById('textEditor');
        if (!editor) {
            console.log('[Auto-Detect Typing Bridge] Editor not found, retrying...');
            setTimeout(setupTypingDetection, 500);
            return;
        }
        
        console.log('[Auto-Detect Typing Bridge] Editor found, setting up listeners...');
        
        // Listen for typing in the editor blocks
        editor.addEventListener('keydown', function(e) {
            // Ignore modifier keys and special keys
            if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') return;
            
            // Check if typing in a block element
            const target = e.target;
            if (target.classList.contains('block-speaker') || target.classList.contains('block-text')) {
                handleTypingStart();
            }
        });
        
        editor.addEventListener('keyup', function(e) {
            const target = e.target;
            if (target.classList.contains('block-speaker') || target.classList.contains('block-text')) {
                handleTypingStop();
            }
        });
        
        // Also listen for input events (handles paste, etc.)
        editor.addEventListener('input', function(e) {
            const target = e.target;
            if (target.classList.contains('block-speaker') || target.classList.contains('block-text')) {
                handleTypingStart();
                handleTypingStop();
            }
        });
        
        console.log('[Auto-Detect Typing Bridge] Setup complete');
    }
    
    function handleTypingStart() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        if (!isTyping) {
            isTyping = true;
            console.log('[Auto-Detect Typing Bridge] Typing started');
            
            // Send typing event to media player
            sendTypingEvent('keydown');
        }
    }
    
    function handleTypingStop() {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Wait a bit before considering typing stopped
        typingTimeout = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                console.log('[Auto-Detect Typing Bridge] Typing stopped');
                
                // Send typing event to media player
                sendTypingEvent('keyup');
            }
        }, 100);
    }
    
    function sendTypingEvent(eventType) {
        // Check if media player is in an iframe
        const mediaPlayerFrame = document.querySelector('iframe[src*="media-player"]');
        if (mediaPlayerFrame) {
            console.log('[Auto-Detect Typing Bridge] Sending to iframe:', eventType);
            mediaPlayerFrame.contentWindow.postMessage({
                type: 'typingEvent',
                event: eventType
            }, '*');
        } else {
            // Try direct window message (for same-window integration)
            console.log('[Auto-Detect Typing Bridge] Sending to window:', eventType);
            window.postMessage({
                type: 'typingEvent',
                event: eventType
            }, '*');
            
            // Also try to trigger directly on auto-detect if available
            if (window.RegularModeDetection) {
                console.log('[Auto-Detect Typing Bridge] Direct trigger on RegularModeDetection');
                if (eventType === 'keydown') {
                    window.RegularModeDetection.handleTypingStart();
                } else {
                    window.RegularModeDetection.handleTypingStop();
                }
            }
        }
    }
    
    // Start setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTypingDetection);
    } else {
        setupTypingDetection();
    }
    
    // Expose for debugging
    window.autoDetectTypingBridge = {
        testTyping: function() {
            console.log('[Auto-Detect Typing Bridge] Testing typing events...');
            sendTypingEvent('keydown');
            setTimeout(() => sendTypingEvent('keyup'), 1000);
        }
    };
})();