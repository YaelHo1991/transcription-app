/*
 * =========================================
 * Text Editor Speaker Integration
 * js/text-editor-speaker-integration.js
 * =========================================
 * Handles TAB key transformation for speaker codes
 */

(function() {
    console.log('[TextEditor] Speaker integration loaded');
    
    // Wait for text editor to be ready
    document.addEventListener('DOMContentLoaded', function() {
        setupSpeakerIntegration();
    });
    
    function setupSpeakerIntegration() {
        const editor = document.getElementById('textEditor');
        if (!editor) {
            console.warn('[TextEditor] Editor not found for speaker integration');
            return;
        }
        
        console.log('[TextEditor] Setting up speaker integration on editor:', editor);
        
        // Use event delegation for block elements
        editor.addEventListener('keydown', function(e) {
            // Check if TAB key and target is a block text area
            if (e.key === 'Tab' && !e.shiftKey) {
                console.log('[TextEditor] TAB key pressed, target:', e.target);
                const target = e.target;
                
                // Check if we're in a speaker block OR text block
                if (target.classList.contains('block-speaker') || target.parentElement?.classList.contains('block-speaker') ||
                    target.classList.contains('block-text') || target.parentElement?.classList.contains('block-text')) {
                    console.log('[TextEditor] In block element, class:', target.className);
                    const selection = window.getSelection();
                    if (selection.rangeCount === 0) return;
                    
                    const range = selection.getRangeAt(0);
                    const container = range.startContainer;
                    const offset = range.startOffset;
                    
                    // Get text before cursor
                    const text = container.textContent || '';
                    const beforeCursor = text.substring(0, offset);
                    
                    // Check if last character is a Hebrew letter (potential speaker code)
                    const lastChar = beforeCursor.slice(-1);
                    console.log('[TextEditor] Text before cursor:', beforeCursor, 'Last char:', lastChar);
                    
                    if (isHebrewLetter(lastChar)) {
                        e.preventDefault();
                        console.log('[TextEditor] Hebrew letter detected:', lastChar);
                        
                        // Request speaker transformation
                        const event = new CustomEvent('speakerTabRequest', {
                            detail: {
                                code: lastChar,
                                callback: function(speakerName) {
                                    if (speakerName) {
                                        // Replace code with speaker name
                                        const newText = beforeCursor.slice(0, -1) + speakerName + ': ';
                                        const afterCursor = text.substring(offset);
                                        
                                        // Update the text
                                        container.textContent = newText + afterCursor;
                                        
                                        // Set cursor position after the colon and space
                                        const newRange = document.createRange();
                                        const newOffset = newText.length;
                                        newRange.setStart(container, newOffset);
                                        newRange.setEnd(container, newOffset);
                                        
                                        selection.removeAllRanges();
                                        selection.addRange(newRange);
                                        
                                        // Update block data
                                        if (window.textEditor && window.textEditor.blockEditor) {
                                            window.textEditor.blockEditor.updateBlockData();
                                        }
                                    } else {
                                        // No speaker found, just add colon and space
                                        const newText = beforeCursor + ': ';
                                        const afterCursor = text.substring(offset);
                                        
                                        container.textContent = newText + afterCursor;
                                        
                                        // Set cursor position
                                        const newRange = document.createRange();
                                        const newOffset = newText.length;
                                        newRange.setStart(container, newOffset);
                                        newRange.setEnd(container, newOffset);
                                        
                                        selection.removeAllRanges();
                                        selection.addRange(newRange);
                                        
                                        // Show notification
                                        showInlineTooltip(target, 'דובר חדש נוסף - יש למלא את השם');
                                    }
                                }
                            }
                        });
                        
                        document.dispatchEvent(event);
                    }
                }
            }
        });
    }
    
    function isHebrewLetter(char) {
        // Check if character is a Hebrew letter
        const code = char.charCodeAt(0);
        return (code >= 0x05D0 && code <= 0x05EA) || // Hebrew letters
               (code >= 0x05F0 && code <= 0x05F4);   // Hebrew ligatures
    }
    
    function showInlineTooltip(element, message) {
        // Use the same tooltip style as text editor blocks
        const existingTooltip = document.querySelector('.text-editor-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'text-editor-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            animation: fadeIn 0.2s ease;
            box-shadow: 0 2px 6px rgba(23, 162, 184, 0.3);
        `;
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => tooltip.remove(), 200);
        }, 3000);
    }
})();