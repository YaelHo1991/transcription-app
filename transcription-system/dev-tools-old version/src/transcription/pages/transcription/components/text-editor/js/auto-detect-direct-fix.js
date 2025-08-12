/*
 * Direct fix for auto-detect with block editor
 * This ensures auto-detect can detect typing in the block editor
 */

(function() {
    console.log('[Auto-detect Direct Fix] Loading...');
    
    function setupAutoDetectFix() {
        const editor = document.getElementById('textEditor');
        
        if (!editor || !window.autoDetectRegular || !window.autoDetectEnhanced) {
            console.log('[Auto-detect Direct Fix] Waiting for components...');
            setTimeout(setupAutoDetectFix, 500);
            return;
        }
        
        console.log('[Auto-detect Direct Fix] Setting up event delegation...');
        
        // Make sure auto-detect has the correct reference
        if (!window.autoDetectRegular.textEditor) {
            window.autoDetectRegular.textEditor = editor;
            console.log('[Auto-detect Direct Fix] Set regular mode textEditor reference');
        }
        
        if (!window.autoDetectEnhanced.textEditor) {
            window.autoDetectEnhanced.textEditor = editor;
            console.log('[Auto-detect Direct Fix] Set enhanced mode textEditor reference');
        }
        
        // Add value property for compatibility
        if (!('value' in editor)) {
            Object.defineProperty(editor, 'value', {
                get: function() {
                    return this.innerText || '';
                },
                set: function(val) {
                    this.innerText = val;
                }
            });
            console.log('[Auto-detect Direct Fix] Added .value property to editor');
        }
        
        // Listen for input events on the editor and all its children
        let lastLength = 0;
        
        editor.addEventListener('input', function(e) {
            // Get current text length
            const currentLength = editor.innerText.length;
            
            // Only trigger if text actually changed
            if (currentLength !== lastLength) {
                lastLength = currentLength;
                
                // Manually trigger auto-detect handlers
                if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                    window.autoDetectRegular.handleTyping();
                }
                if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                    window.autoDetectEnhanced.handleTyping();
                }
                
                console.log('[Auto-detect Direct Fix] Triggered auto-detect handlers');
            }
        }, true); // Use capture to catch all events
        
        // Also listen for keydown events as backup
        editor.addEventListener('keydown', function(e) {
            // Only for actual character keys
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                setTimeout(() => {
                    const currentLength = editor.innerText.length;
                    if (currentLength !== lastLength) {
                        lastLength = currentLength;
                        
                        if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                            window.autoDetectRegular.handleTyping();
                        }
                        if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                            window.autoDetectEnhanced.handleTyping();
                        }
                    }
                }, 10);
            }
        }, true);
        
        console.log('[Auto-detect Direct Fix] Setup complete');
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAutoDetectFix);
    } else {
        setupAutoDetectFix();
    }
})();