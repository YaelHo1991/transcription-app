/*
 * Auto-Detect Compatibility Layer
 * Makes the block editor compatible with auto-detect by adding .value property
 */

(function() {
    console.log('[Auto-detect Compatibility] Loading...');
    
    function setupCompatibility() {
        const editor = document.getElementById('textEditor');
        
        if (!editor) {
            console.warn('[Auto-detect Compatibility] Editor not found, retrying...');
            setTimeout(setupCompatibility, 500);
            return;
        }
        
        console.log('[Auto-detect Compatibility] Setting up compatibility layer...');
        
        // Add a value getter that returns the text content
        Object.defineProperty(editor, 'value', {
            get: function() {
                // Get text from all blocks
                if (window.textEditor && window.textEditor.blockEditor) {
                    return window.textEditor.blockEditor.getText();
                }
                // Fallback to innerText
                return this.innerText || '';
            },
            set: function(val) {
                // For compatibility, though auto-detect doesn't set values
                if (window.textEditor && window.textEditor.blockEditor) {
                    window.textEditor.blockEditor.setText(val);
                } else {
                    this.innerText = val;
                }
            }
        });
        
        // Make input events bubble up from block elements
        editor.addEventListener('input', function(e) {
            // If the event came from a child element, re-dispatch it on the editor
            if (e.target !== editor && 
                (e.target.classList.contains('block-speaker') || 
                 e.target.classList.contains('block-text'))) {
                
                // Create a new input event on the editor element
                const newEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                
                // Re-dispatch on the editor so auto-detect can catch it
                editor.dispatchEvent(newEvent);
                console.log('[Auto-detect Compatibility] Forwarded input event to editor');
            }
        }, true); // Use capture phase to catch events before they bubble
        
        console.log('[Auto-detect Compatibility] Compatibility layer ready');
    }
    
    // Start setup when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupCompatibility);
    } else {
        setupCompatibility();
    }
})();