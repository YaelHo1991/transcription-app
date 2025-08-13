/*
 * Auto-Detect Block Fix
 * Makes block editor work with auto-detect by ensuring events bubble properly
 */

(function() {
    console.log('[Auto-detect Block Fix] Initializing...');
    
    function setupBlockFix() {
        const editor = document.getElementById('textEditor');
        if (!editor) {
            console.log('[Auto-detect Block Fix] Editor not found, retrying...');
            setTimeout(setupBlockFix, 500);
            return;
        }
        
        console.log('[Auto-detect Block Fix] Editor found, setting up event forwarding...');
        
        // Make sure editor has a value property
        if (!('value' in editor)) {
            Object.defineProperty(editor, 'value', {
                get: function() {
                    // Return all text from blocks
                    const blocks = this.querySelectorAll('.block-text, .block-speaker');
                    let text = '';
                    blocks.forEach(block => {
                        text += block.textContent + ' ';
                    });
                    return text.trim();
                },
                set: function(val) {
                    console.log('[Auto-detect Block Fix] Value setter called with:', val);
                }
            });
            console.log('[Auto-detect Block Fix] Added .value property to editor');
        }
        
        // Listen for input events on the editor and make sure they bubble
        let lastLength = 0;
        editor.addEventListener('input', function(e) {
            // Check if the input came from a block
            if (e.target !== editor) {
                // Re-dispatch the event on the editor element itself
                const newEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                
                // Important: dispatch the event asynchronously to avoid recursion
                setTimeout(() => {
                    editor.dispatchEvent(newEvent);
                    console.log('[Auto-detect Block Fix] Forwarded input event');
                }, 0);
            }
            
            // Update length tracking
            const currentLength = editor.value.length;
            if (currentLength !== lastLength) {
                lastLength = currentLength;
                console.log('[Auto-detect Block Fix] Text length changed:', currentLength);
            }
        }, true); // Use capture to catch events before they bubble
        
        // Also forward keydown events
        editor.addEventListener('keydown', function(e) {
            if (e.target !== editor) {
                const newEvent = new KeyboardEvent('keydown', {
                    key: e.key,
                    keyCode: e.keyCode,
                    bubbles: true,
                    cancelable: true
                });
                
                setTimeout(() => {
                    editor.dispatchEvent(newEvent);
                }, 0);
            }
        }, true);
        
        console.log('[Auto-detect Block Fix] Setup complete');
    }
    
    // Start setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBlockFix);
    } else {
        setupBlockFix();
    }
})();