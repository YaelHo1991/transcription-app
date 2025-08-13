/*
 * Minimal Auto-Detect Patch for Block Editor
 * Only patches the specific methods that check text length
 */

(function() {
    console.log('[Auto-detect Patch] Starting minimal patch...');
    
    let patchAttempts = 0;
    
    function patchAutoDetect() {
        patchAttempts++;
        
        // Check if auto-detect instances exist
        const hasRegular = window.autoDetectRegular;
        const hasEnhanced = window.autoDetectEnhanced;
        
        if (!hasRegular && !hasEnhanced) {
            if (patchAttempts < 20) {
                setTimeout(patchAutoDetect, 500);
            }
            return;
        }
        
        console.log('[Auto-detect Patch] Found auto-detect instances, patching...');
        
        // Helper function to get text length from block editor
        function getEditorTextLength() {
            const editor = document.getElementById('textEditor');
            if (!editor) return 0;
            
            // Count text from all blocks
            let totalLength = 0;
            const blocks = editor.querySelectorAll('.block-speaker, .block-text');
            blocks.forEach(block => {
                totalLength += (block.textContent || '').length;
            });
            
            return totalLength;
        }
        
        // Patch Regular mode
        if (window.autoDetectRegular) {
            console.log('[Auto-detect Patch] Patching regular mode...');
            
            // Store original handleTyping
            const originalHandleTyping = window.autoDetectRegular.handleTyping;
            
            // Override handleTyping
            window.autoDetectRegular.handleTyping = function() {
                if (!this.enabled) return;
                
                // Clear any existing timer
                if (this.typingTimer) {
                    clearTimeout(this.typingTimer);
                }
                
                // Use our custom length getter instead of .value.length
                const currentLength = getEditorTextLength();
                const textChanged = currentLength !== this.lastTextLength;
                this.lastTextLength = currentLength;
                
                if (!textChanged) return;
                
                // Call the rest of the original function
                // Copy the original logic here since we can't call it partially
                if (this.debug) console.log('[Auto-detect Patch] Typing detected, phase:', this.cyclePhase);
                
                // Continue with original logic...
                originalHandleTyping.call(this);
            };
            
            console.log('[Auto-detect Patch] Regular mode patched');
        }
        
        // Patch Enhanced mode
        if (window.autoDetectEnhanced) {
            console.log('[Auto-detect Patch] Patching enhanced mode...');
            
            // Store original handleTyping
            const originalHandleTyping = window.autoDetectEnhanced.handleTyping;
            
            // Override handleTyping
            window.autoDetectEnhanced.handleTyping = function() {
                if (!this.enabled) return;
                
                // Use our custom length getter
                const currentLength = getEditorTextLength();
                const textChanged = currentLength !== this.lastTextLength;
                this.lastTextLength = currentLength;
                
                if (!textChanged) return;
                
                // Call original function for the rest
                originalHandleTyping.call(this);
            };
            
            console.log('[Auto-detect Patch] Enhanced mode patched');
        }
        
        // Setup event forwarding from blocks to main editor
        const editor = document.getElementById('textEditor');
        if (editor) {
            // Listen for input on blocks and trigger auto-detect
            editor.addEventListener('input', function(e) {
                // If input is from a block element
                if (e.target.classList.contains('block-speaker') || 
                    e.target.classList.contains('block-text')) {
                    
                    // Manually trigger auto-detect
                    if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                        window.autoDetectRegular.handleTyping();
                    }
                    if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                        window.autoDetectEnhanced.handleTyping();
                    }
                    
                    console.log('[Auto-detect Patch] Triggered auto-detect from block input');
                }
            }, true); // Use capture phase
        }
        
        console.log('[Auto-detect Patch] Patching complete!');
    }
    
    // Start patching after DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchAutoDetect);
    } else {
        patchAutoDetect();
    }
})();