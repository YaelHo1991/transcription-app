/*
 * Auto-Detect Adapter for Block Editor
 * js/auto-detect-adapter.js
 * 
 * Makes auto-detect features work with the block-based editor
 */

(function() {
    console.log('[TextEditor] Auto-detect adapter loaded');
    
    let isSetup = false;
    let lastTypingTime = 0;
    let typingTimer = null;
    
    // Wait for everything to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Try setup multiple times to ensure everything is loaded
        let attempts = 0;
        const trySetup = function() {
            attempts++;
            if (setupAutoDetectAdapter()) {
                console.log('[Auto-detect Adapter] Setup successful');
            } else if (attempts < 10) {
                setTimeout(trySetup, 500);
            } else {
                console.error('[Auto-detect Adapter] Failed to setup after 10 attempts');
            }
        };
        
        setTimeout(trySetup, 1000);
    });
    
    function setupAutoDetectAdapter() {
        if (isSetup) return true;
        
        const editor = document.getElementById('textEditor');
        if (!editor) {
            console.warn('[Auto-detect Adapter] Editor not found yet');
            return false;
        }
        
        console.log('[Auto-detect Adapter] Setting up adapter...');
        
        // Create a synthetic input tracking system
        let isCurrentlyTyping = false;
        
        // Override the handleTyping methods for both auto-detect modes
        const patchAutoDetect = function(autoDetectInstance, modeName) {
            if (!autoDetectInstance) return false;
            
            console.log(`[Auto-detect Adapter] Patching ${modeName}...`);
            
            // Store original handleTyping
            const originalHandleTyping = autoDetectInstance.handleTyping;
            
            // Create new handleTyping that we'll call
            autoDetectInstance.handleTypingOriginal = originalHandleTyping;
            autoDetectInstance.textEditor = editor; // Ensure it uses our editor
            
            // Override the handleTyping method
            autoDetectInstance.handleTyping = function() {
                if (this.enabled) {
                    console.log(`[Auto-detect Adapter] ${modeName} typing detected`);
                    this.handleTypingOriginal();
                }
            };
            
            // Re-setup event listeners with our editor
            if (autoDetectInstance.setupEventListeners) {
                // Remove old listeners first
                const oldSetup = autoDetectInstance.setupEventListeners;
                autoDetectInstance.setupEventListeners = function() {
                    // Don't set up default listeners
                    console.log(`[Auto-detect Adapter] Skipping default listeners for ${modeName}`);
                };
            }
            
            return true;
        };
        
        // Setup input detection on block elements
        editor.addEventListener('input', function(e) {
            // Only process input from block elements
            if (!e.target.classList.contains('block-speaker') && 
                !e.target.classList.contains('block-text')) {
                return;
            }
            
            // Mark as typing
            isCurrentlyTyping = true;
            lastTypingTime = Date.now();
            
            // Clear existing timer
            if (typingTimer) {
                clearTimeout(typingTimer);
            }
            
            // Trigger typing for active auto-detect
            if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                console.log('[Auto-detect Adapter] Triggering regular mode');
                window.autoDetectRegular.handleTyping();
            }
            
            if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                console.log('[Auto-detect Adapter] Triggering enhanced mode');
                window.autoDetectEnhanced.handleTyping();
            }
            
            // Set timer to mark typing as stopped
            typingTimer = setTimeout(() => {
                isCurrentlyTyping = false;
                console.log('[Auto-detect Adapter] Typing stopped');
            }, 500);
        });
        
        // Also listen for keydown events
        editor.addEventListener('keydown', function(e) {
            // Only process from block elements
            if (!e.target.classList.contains('block-speaker') && 
                !e.target.classList.contains('block-text')) {
                return;
            }
            
            // Only count actual character keys
            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                // Trigger typing event
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true
                });
                e.target.dispatchEvent(inputEvent);
            }
        });
        
        // Try to patch auto-detect instances
        let regularPatched = false;
        let enhancedPatched = false;
        
        // Check for existing instances
        if (window.autoDetectRegular) {
            regularPatched = patchAutoDetect(window.autoDetectRegular, 'Regular');
        }
        
        if (window.autoDetectEnhanced) {
            enhancedPatched = patchAutoDetect(window.autoDetectEnhanced, 'Enhanced');
        }
        
        // If instances don't exist yet, wait for them
        if (!regularPatched || !enhancedPatched) {
            console.log('[Auto-detect Adapter] Waiting for auto-detect instances...');
            
            // Set up a watcher for when they're created
            const checkInterval = setInterval(() => {
                if (!regularPatched && window.autoDetectRegular) {
                    regularPatched = patchAutoDetect(window.autoDetectRegular, 'Regular');
                }
                
                if (!enhancedPatched && window.autoDetectEnhanced) {
                    enhancedPatched = patchAutoDetect(window.autoDetectEnhanced, 'Enhanced');
                }
                
                if (regularPatched && enhancedPatched) {
                    clearInterval(checkInterval);
                    console.log('[Auto-detect Adapter] Both modes patched successfully');
                }
            }, 100);
            
            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkInterval), 10000);
        }
        
        isSetup = true;
        console.log('[Auto-detect Adapter] Setup complete');
        return true;
    }
    
    // Export adapter functions
    window.TextEditorAutoDetectAdapter = {
        refresh: function() {
            isSetup = false;
            setupAutoDetectAdapter();
        },
        isTyping: function() {
            return Date.now() - lastTypingTime < 500;
        },
        triggerTyping: function() {
            // Manually trigger typing event
            if (window.autoDetectRegular && window.autoDetectRegular.enabled) {
                window.autoDetectRegular.handleTyping();
            }
            if (window.autoDetectEnhanced && window.autoDetectEnhanced.enabled) {
                window.autoDetectEnhanced.handleTyping();
            }
        }
    };
})();