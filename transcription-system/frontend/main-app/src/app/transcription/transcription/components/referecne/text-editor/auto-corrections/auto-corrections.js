/*
 * Auto-Corrections Manager
 * auto-corrections/auto-corrections.js
 * 
 * Provides automatic text corrections while typing
 */

(function() {
    console.log('[TextEditor] Auto-corrections loaded');
    
    // Common Hebrew auto-corrections
    const autoCorrections = {
        // Double quotes
        '""': '"',
        
        // Common typos in Hebrew
        'שלןם': 'שלום',
        'תןדה': 'תודה',
        'בןקר': 'בוקר',
        'אני ': 'אני ',  // Fix double space after אני
        
        // Punctuation fixes
        ' ,': ',',  // Remove space before comma
        ' .': '.',  // Remove space before period
        ' :': ':',  // Remove space before colon
        ' ;': ';',  // Remove space before semicolon
        ' ?': '?',  // Remove space before question mark
        ' !': '!',  // Remove space before exclamation
        
        // Number corrections
        ' %': '%',  // Remove space before percent
        
        // Common English in Hebrew text
        'ok': 'אוקיי',
        'OK': 'אוקיי',
    };
    
    // Initialize auto-corrections
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Auto-corrections] Initializing...');
        
        // Wait for editor to be ready
        setTimeout(() => {
            const editor = document.getElementById('textEditor');
            if (editor) {
                setupAutoCorrections(editor);
            }
        }, 1000);
    });
    
    function setupAutoCorrections(editor) {
        console.log('[Auto-corrections] Setting up for editor');
        
        // Use event delegation for block elements
        editor.addEventListener('input', function(e) {
            // Check if input is from a block element
            const target = e.target;
            if (!target.classList.contains('block-speaker') && 
                !target.classList.contains('block-text')) {
                return;
            }
            
            // Get current text and cursor position
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;
            
            const range = selection.getRangeAt(0);
            const container = range.startContainer;
            
            if (container.nodeType !== Node.TEXT_NODE) return;
            
            const text = container.textContent;
            const cursorPos = range.startOffset;
            
            // Check for auto-corrections
            let corrected = false;
            let newText = text;
            let newCursorPos = cursorPos;
            
            // Check each auto-correction
            for (const [typo, correction] of Object.entries(autoCorrections)) {
                // Check if the typo exists before cursor
                const startPos = Math.max(0, cursorPos - typo.length - 5); // Check a bit before cursor
                const checkText = text.substring(startPos, cursorPos);
                
                const typoIndex = checkText.lastIndexOf(typo);
                if (typoIndex !== -1) {
                    const actualPos = startPos + typoIndex;
                    
                    // Replace the typo
                    newText = text.substring(0, actualPos) + 
                             correction + 
                             text.substring(actualPos + typo.length);
                    
                    // Adjust cursor position
                    const diff = correction.length - typo.length;
                    newCursorPos = cursorPos + diff;
                    corrected = true;
                    
                    console.log(`[Auto-corrections] Corrected "${typo}" to "${correction}"`);
                    break; // Only one correction at a time
                }
            }
            
            // Apply correction if found
            if (corrected) {
                // Update the text
                container.textContent = newText;
                
                // Restore cursor position
                const newRange = document.createRange();
                newRange.setStart(container, Math.min(newCursorPos, newText.length));
                newRange.setEnd(container, Math.min(newCursorPos, newText.length));
                
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                // Update block data if needed
                if (window.textEditor && window.textEditor.blockEditor) {
                    window.textEditor.blockEditor.updateBlockData();
                }
            }
        });
    }
    
    // Export for external use
    window.TextEditorAutoCorrections = {
        add: function(typo, correction) {
            autoCorrections[typo] = correction;
            console.log(`[Auto-corrections] Added: "${typo}" → "${correction}"`);
        },
        remove: function(typo) {
            delete autoCorrections[typo];
            console.log(`[Auto-corrections] Removed: "${typo}"`);
        },
        getAll: function() {
            return {...autoCorrections};
        },
        toggle: function(enabled) {
            // TODO: Implement enable/disable functionality
            console.log(`[Auto-corrections] ${enabled ? 'Enabled' : 'Disabled'}`);
        }
    };
})();