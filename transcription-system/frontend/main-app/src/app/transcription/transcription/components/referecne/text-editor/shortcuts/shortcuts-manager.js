/*
 * Shortcuts Manager - Advanced Text Expansion with Variations
 * shortcuts/shortcuts-manager.js
 */

(function() {
    console.log('[TextEditor] Shortcuts manager loaded');
    
    // Start with empty shortcuts - user will add their own
    let shortcuts = {};
    
    // Common Hebrew prefixes that can be combined with shortcuts
    const hebrewPrefixes = ["ו", "ה", "ש", "וש", "כש", "ב", "ל", "מ", "כ", "מה"];
    const hebrewPrefixWords = {
        "ו": "ו",      // and
        "ה": "ה",      // the
        "ש": "ש",      // that
        "וש": "וש",    // and that
        "כש": "כש",    // when
        "ב": "ב",      // in
        "ל": "ל",      // to
        "מ": "מ",      // from
        "כ": "כ",      // as/like
        "מה": "מה"     // what/from the
    };
    
    // Load shortcuts from localStorage
    function loadShortcuts() {
        const saved = localStorage.getItem('textEditorShortcuts');
        if (saved) {
            try {
                shortcuts = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load shortcuts:', e);
            }
        }
    }
    
    // Save shortcuts to localStorage
    function saveShortcuts() {
        localStorage.setItem('textEditorShortcuts', JSON.stringify(shortcuts));
    }
    
    // Generate all variations of a shortcut
    function generateVariations(baseShortcut, expansion) {
        const variations = {};
        
        // Add base shortcut
        variations[baseShortcut] = expansion;
        
        // Add variations with prefixes
        hebrewPrefixes.forEach(prefix => {
            // Prefix + shortcut = prefix + expansion
            variations[prefix + baseShortcut] = prefix + expansion;
            
            // Special handling for ה prefix (the)
            if (prefix === "ה" && expansion.startsWith("ה")) {
                // Avoid double ה
                variations[prefix + baseShortcut] = expansion;
            }
        });
        
        return variations;
    }
    
    // Build complete shortcuts map with all variations
    function buildShortcutsMap() {
        const completeMap = {};
        
        Object.entries(shortcuts).forEach(([shortcut, expansion]) => {
            const variations = generateVariations(shortcut, expansion);
            Object.assign(completeMap, variations);
        });
        
        return completeMap;
    }
    
    // Check for shortcuts in text and replace them
    function processShortcuts(text, cursorPosition) {
        const shortcutsMap = buildShortcutsMap();
        let processed = false;
        let newText = text;
        let newCursorPosition = cursorPosition;
        
        // Find word at cursor position
        const beforeCursor = text.substring(0, cursorPosition);
        
        // Debug: Check if .? → ... is in shortcuts
        if (beforeCursor.endsWith('.?')) {
            console.log('[Shortcuts] Checking for .? shortcut');
            console.log('[Shortcuts] Available shortcuts:', Object.keys(shortcutsMap).filter(k => k.includes('?') || shortcutsMap[k] === '...'));
        }
        
        // First, try to match shortcuts at the end of the text
        // Check all possible shortcuts from longest to shortest
        const sortedShortcuts = Object.keys(shortcutsMap).sort((a, b) => b.length - a.length);
        
        for (const shortcut of sortedShortcuts) {
            // Check if the text ends with this shortcut
            if (beforeCursor.endsWith(shortcut)) {
                const startPos = beforeCursor.length - shortcut.length;
                const replacement = shortcutsMap[shortcut];
                
                // Debug logging
                console.log('[Shortcuts] Found match:', {
                    shortcut: shortcut,
                    replacement: replacement,
                    beforeCursor: beforeCursor,
                    matchedText: beforeCursor.substring(startPos)
                });
                
                // Check what comes after cursor
                const afterCursor = text.substring(cursorPosition);
                
                // Replace the shortcut, preserving everything after cursor
                newText = text.substring(0, startPos) + replacement + afterCursor;
                newCursorPosition = startPos + replacement.length;
                processed = true;
                
                // If replacement is ..., we need to trigger timestamp conversion
                if (replacement === '...') {
                    return {
                        text: newText,
                        cursorPosition: newCursorPosition,
                        processed: true,
                        triggerTimestamp: true
                    };
                }
                
                break;
            }
        }
        
        return {
            text: newText,
            cursorPosition: newCursorPosition,
            processed: processed
        };
    }
    
    // Add new shortcut
    function addShortcut(shortcut, expansion) {
        shortcuts[shortcut] = expansion;
        saveShortcuts();
    }
    
    // Remove shortcut
    function removeShortcut(shortcut) {
        delete shortcuts[shortcut];
        saveShortcuts();
    }
    
    // Get all shortcuts
    function getShortcuts() {
        // If shortcuts is empty, try loading from localStorage
        if (Object.keys(shortcuts).length === 0) {
            console.log('[Shortcuts Manager] Shortcuts empty, reloading from localStorage');
            loadShortcuts();
        }
        console.log('[Shortcuts Manager] Returning shortcuts:', shortcuts);
        return {...shortcuts};
    }
    
    // Clear all shortcuts
    function clearAllShortcuts() {
        shortcuts = {};
        localStorage.removeItem('textEditorShortcuts');
        console.log('[Shortcuts Manager] All shortcuts cleared');
    }
    
    // Load shortcuts immediately when script loads
    console.log('[Shortcuts Manager] Loading shortcuts on script init...');
    loadShortcuts();
    console.log('[Shortcuts Manager] Initial shortcuts loaded:', shortcuts);
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Shortcuts Manager] DOM ready, reinitializing...');
        loadShortcuts();
        console.log('[Shortcuts Manager] Current shortcuts:', shortcuts);
        console.log('[Shortcuts Manager] Shortcuts map:', buildShortcutsMap());
        
        // Wait a bit for the editor to be created
        setTimeout(() => {
            const editor = document.getElementById('textEditor');
            console.log('[Shortcuts Manager] Looking for editor, found:', editor);
            
            if (editor) {
                console.log('[Shortcuts] Editor found, setting up delegation for blocks');
            
            // Use event delegation to catch keyup events from block elements
            editor.addEventListener('keyup', function(e) {
                // Check if event came from a block text area
                if (!e.target.classList.contains('block-speaker') && 
                    !e.target.classList.contains('block-text')) {
                    return;
                }
                // Check if space or punctuation was typed
                if (e.key === ' ' || e.key === '.' || e.key === ',' || e.key === '!' || e.key === '?') {
                    console.log('[Shortcuts] Trigger key pressed:', e.key);
                    const selection = window.getSelection();
                    if (selection.rangeCount === 0) return;
                    
                    const range = selection.getRangeAt(0);
                    const container = range.startContainer;
                    const offset = range.startOffset;
                    
                    // Get the text from the current block element
                    const currentElement = e.target;
                    const elementText = currentElement.textContent || '';
                    
                    // Get cursor position within the element
                    let cursorPos = 0;
                    if (container.nodeType === Node.TEXT_NODE) {
                        cursorPos = offset;
                    } else {
                        // Calculate position if container is element
                        const textNode = selection.focusNode;
                        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                            cursorPos = selection.focusOffset;
                        }
                    }
                    
                    // Get text before cursor in current element
                    const textBeforeCursor = elementText.substring(0, cursorPos);
                    
                    // Find the last word more accurately
                    // For space trigger, we want the word before the space
                    let searchPos = cursorPos;
                    if (e.key === ' ') {
                        searchPos = cursorPos - 1;
                    }
                    
                    // Find word boundaries
                    const words = textBeforeCursor.trim().split(/\s+/);
                    let lastWord = '';
                    
                    if (words.length > 0) {
                        lastWord = words[words.length - 1];
                        // Remove trailing punctuation if triggered by punctuation
                        if (e.key !== ' ' && ['.', ',', '!', '?'].includes(e.key)) {
                            lastWord = lastWord.replace(/[.,!?]$/, '');
                        }
                    }
                    
                    const wordStart = textBeforeCursor.lastIndexOf(lastWord);
                    const wordEnd = e.key === ' ' ? cursorPos - 1 : cursorPos;
                    const wordToCheck = lastWord; // Use the lastWord we already found
                    
                    console.log('[Shortcuts] Element text:', elementText);
                    console.log('[Shortcuts] Cursor position:', cursorPos);
                    console.log('[Shortcuts] Word start:', wordStart, 'Word end:', wordEnd);
                    console.log('[Shortcuts] Word to check:', wordToCheck);
                    console.log('[Shortcuts] Available shortcuts:', Object.keys(buildShortcutsMap()).join(', '));
                    
                    const shortcutsMap = buildShortcutsMap();
                    
                    if (wordToCheck && shortcutsMap[wordToCheck]) {
                        console.log('[Shortcuts] Found shortcut:', wordToCheck, '->', shortcutsMap[wordToCheck]);
                        
                        try {
                            // Replace the shortcut with its expansion
                            const replacement = shortcutsMap[wordToCheck];
                            const beforeWord = elementText.substring(0, wordStart);
                            const afterWord = elementText.substring(wordEnd);
                            
                            // Include the space or punctuation that was typed
                            const newText = beforeWord + replacement + (e.key === ' ' ? ' ' : '') + afterWord;
                            
                            // Update the element content
                            currentElement.textContent = newText;
                            
                            // Calculate new cursor position (after replacement and trigger key)
                            const newCursorPos = wordStart + replacement.length + (e.key === ' ' ? 1 : 0);
                            
                            // Set cursor position after replacement
                            const newRange = document.createRange();
                            const newSelection = window.getSelection();
                            
                            // Find the text node in the element
                            let textNode = currentElement.firstChild;
                            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
                                textNode = document.createTextNode(newText);
                                currentElement.appendChild(textNode);
                            }
                            
                            // Set cursor position
                            const pos = Math.min(newCursorPos, textNode.length);
                            newRange.setStart(textNode, pos);
                            newRange.setEnd(textNode, pos);
                            
                            newSelection.removeAllRanges();
                            newSelection.addRange(newRange);
                            
                            // Update stats
                            if (window.textEditor) {
                                window.textEditor.updateStats();
                            }
                            
                            // Trigger input event on the block editor
                            if (window.textEditor && window.textEditor.blockEditor) {
                                window.textEditor.blockEditor.updateBlockData();
                            }
                            
                            console.log('[Shortcuts] Replacement successful!');
                        } catch (error) {
                            console.error('[Shortcuts] Error replacing text:', error);
                        }
                    }
                }
            });
            } else {
                console.error('[Shortcuts Manager] Editor not found!');
            }
        }, 1000);
    });
    
    // Export for external use
    window.TextEditorShortcuts = {
        add: addShortcut,
        remove: removeShortcut,
        getAll: getShortcuts,
        process: processShortcuts,
        generateVariations: generateVariations,
        clearAll: clearAllShortcuts
    };
})();
