/*
 * Text Editor with Block System
 * js/text-editor-blocks.js
 * 
 * Implements invisible blocks for speaker/text separation
 * - TAB: Navigate between blocks
 * - ENTER: Create new block (validates speaker punctuation)
 * - SHIFT+ENTER: New line within block or move from speaker to text
 * - BACKSPACE: Navigate back to speaker when at beginning of text
 * - ...: Convert to timestamp
 * - Prevents double spaces
 */

// Import showCustomAlert if available
const showCustomAlert = window.showCustomAlert || function(message, title) {
    alert(message);
};

class TextEditorBlocks {
    constructor(editorElement) {
        console.log('[TextEditorBlocks] Initializing with element:', editorElement);
        this.editor = editorElement;
        this.blocks = [];
        this.activeBlockId = null;
        this.activeArea = 'speaker'; // 'speaker' or 'text'
        this.speakerColors = {}; // Map of speaker names to color indices
        this.warnedSpeakers = new Set(); // Track speakers we've already warned about
        this.colorPalette = [
            '#667eea',  // Purple
            '#10b981',  // Green
            '#f59e0b',  // Amber
            '#ef4444',  // Red
            '#3b82f6',  // Blue
            '#ec4899',  // Pink
            '#22c55e',  // Emerald
            '#a855f7',  // Violet
        ];
        this.nextColorIndex = 0;
        
        // Initialize with first block
        this.addBlock();
        this.setupEventListeners();
        this.setupMutationObserver();
        console.log('[TextEditorBlocks] Initialization complete, blocks:', this.blocks.length);
    }
    
    setupEventListeners() {
        // Override default contenteditable behavior
        this.editor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.editor.addEventListener('input', (e) => this.handleInput(e));
        this.editor.addEventListener('click', (e) => this.handleClick(e));
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Add keyup handler for navigation mode
        this.editor.addEventListener('keyup', (e) => {
            // Check timestamp at cursor for navigation mode
            this.checkTimestampAtCursor();
        });
        
        // Prevent default tab behavior
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
            }
        });
    }
    
    setupMutationObserver() {
        // Watch for any spaces being added to contenteditable elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
                    const parent = mutation.target.parentElement;
                    if (parent && (parent.classList.contains('block-text') || parent.classList.contains('block-speaker'))) {
                        if (mutation.target.textContent === ' ' || mutation.target.textContent === '\u00A0') {
                            mutation.target.textContent = '';
                        }
                    }
                }
            });
        });
        
        // Observe the entire editor
        observer.observe(this.editor, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });
    }
    
    addBlock(afterBlockId = null) {
        console.log('[TextEditorBlocks] Adding new block, afterBlockId:', afterBlockId);
        const newBlock = {
            id: Date.now() + Math.random(), // Unique ID
            speaker: '',
            text: '',
            speakerTime: null, // Hidden timestamp for speaker
            element: null
        };
        
        // Insert block in array
        if (afterBlockId) {
            const index = this.blocks.findIndex(b => b.id === afterBlockId);
            this.blocks.splice(index + 1, 0, newBlock);
        } else {
            this.blocks.push(newBlock);
        }
        
        // Create block element
        const blockElement = this.createBlockElement(newBlock);
        newBlock.element = blockElement;
        
        // Insert in DOM
        if (afterBlockId) {
            const afterBlock = this.blocks.find(b => b.id === afterBlockId);
            afterBlock.element.after(blockElement);
        } else {
            this.editor.appendChild(blockElement);
        }
        
        console.log('[TextEditorBlocks] Block added to DOM, total blocks:', this.blocks.length);
        
        // Set as active - go directly to speaker area
        this.activeBlockId = newBlock.id;
        this.activeArea = 'speaker'; // Should focus on speaker first
        
        // Focus the new block
        this.focusActiveArea();
        
        return newBlock;
    }
    
    createBlockElement(block) {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'text-block';
        blockDiv.setAttribute('data-block-id', block.id);
        
        // Create invisible structure
        const speakerSpan = document.createElement('span');
        speakerSpan.className = 'block-speaker';
        speakerSpan.setAttribute('contenteditable', 'true');
        speakerSpan.setAttribute('data-area', 'speaker');
        speakerSpan.setAttribute('data-placeholder', 'דובר');
        speakerSpan.textContent = block.speaker || '';
        
        // Ensure no default content
        if (!block.speaker) {
            speakerSpan.innerHTML = '';
        }
        
        const separator = document.createElement('span');
        separator.className = 'block-separator';
        separator.textContent = ': ';
        // separator.style.display = 'none'; // VISIBLE FOR DEVELOPMENT
        
        const textSpan = document.createElement('span');
        textSpan.className = 'block-text';
        textSpan.setAttribute('contenteditable', 'true');
        textSpan.setAttribute('data-area', 'text');
        textSpan.setAttribute('data-placeholder', '');
        textSpan.textContent = block.text || '';
        
        // Prevent browser from adding unwanted content
        if (!block.text) {
            textSpan.innerHTML = '';
        }
        
        blockDiv.appendChild(speakerSpan);
        blockDiv.appendChild(separator);
        blockDiv.appendChild(textSpan);
        
        // Add event listeners to spans
        speakerSpan.addEventListener('focus', () => {
            this.activeBlockId = block.id;
            this.activeArea = 'speaker';
            
            // Remove any initial space or line break
            if (speakerSpan.innerHTML === '<br>' || speakerSpan.innerHTML === '&nbsp;' || speakerSpan.innerHTML === ' ') {
                speakerSpan.innerHTML = '';
            }
        });
        
        // Prevent initial space on first input in speaker
        speakerSpan.addEventListener('beforeinput', (e) => {
            if (!speakerSpan.textContent && e.data === ' ') {
                e.preventDefault();
            }
        });
        
        // Additional input handler to catch any spaces
        speakerSpan.addEventListener('input', (e) => {
            if (speakerSpan.textContent === ' ' || speakerSpan.textContent === '\u00A0') {
                speakerSpan.textContent = '';
            }
        });
        
        // Keydown handler for space key
        speakerSpan.addEventListener('keydown', (e) => {
            if (e.key === ' ' && !speakerSpan.textContent.trim()) {
                e.preventDefault();
            }
        });
        
        textSpan.addEventListener('focus', () => {
            this.activeBlockId = block.id;
            this.activeArea = 'text';
            
            // Remove any initial space or line break
            if (textSpan.innerHTML === '<br>' || textSpan.innerHTML === '&nbsp;' || textSpan.innerHTML === ' ') {
                textSpan.innerHTML = '';
            }
        });
        
        // Prevent initial space on first input and double spaces
        textSpan.addEventListener('beforeinput', (e) => {
            if (e.data === ' ') {
                // Prevent initial space
                if (!textSpan.textContent) {
                    e.preventDefault();
                    return;
                }
                
                // Prevent double spaces
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const textNode = range.startContainer;
                    
                    if (textNode.nodeType === Node.TEXT_NODE) {
                        const text = textNode.textContent;
                        const cursorPos = range.startOffset;
                        
                        // Check if previous character is also a space
                        if (cursorPos > 0 && (text[cursorPos - 1] === ' ' || text[cursorPos - 1] === '\u00A0')) {
                            e.preventDefault();
                        }
                    }
                }
            }
        });
        
        // Additional input handler to catch any spaces in text
        textSpan.addEventListener('input', (e) => {
            if (textSpan.textContent === ' ' || textSpan.textContent === '\u00A0') {
                textSpan.textContent = '';
            }
        });
        
        // Keydown handler for space key in text
        textSpan.addEventListener('keydown', (e) => {
            if (e.key === ' ' && !textSpan.textContent.trim()) {
                e.preventDefault();
            }
        });
        
        // Improved click handling for the entire block
        blockDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target;
            
            if (target.classList.contains('block-speaker')) {
                this.activeBlockId = block.id;
                this.activeArea = 'speaker';
                target.focus();
                
                // Check if speaker has hidden timestamp and jump to it
                const timestamp = target.getAttribute('data-timestamp');
                if (timestamp && window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                    window.mediaPlayer.currentPlayer.currentTime = parseFloat(timestamp);
                    console.log('[TextEditor] Jumped to speaker time:', timestamp);
                }
            } else if (target.classList.contains('block-text')) {
                this.activeBlockId = block.id;
                this.activeArea = 'text';
                target.focus();
                
                // Check if clicked on a timestamp
                this.checkTimestampClick(e, target);
            } else if (target.classList.contains('text-block') || target.classList.contains('block-separator')) {
                // Clicked on block container or separator - focus text area
                this.activeBlockId = block.id;
                this.activeArea = 'text';
                textSpan.focus();
                // Place cursor at end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(textSpan);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
        
        return blockDiv;
    }
    
    handleKeyDown(e) {
        const activeBlock = this.blocks.find(b => b.id === this.activeBlockId);
        if (!activeBlock) return;
        
        // Handle arrow keys for seamless navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const handled = this.handleArrowNavigation(e, activeBlock);
            if (handled) {
                e.preventDefault();
                return;
            }
        }
        
        // Handle HOME/END keys
        if (e.key === 'Home' || e.key === 'End') {
            const handled = this.handleHomeEndNavigation(e, activeBlock);
            if (handled) {
                e.preventDefault();
                return;
            }
        }
        
        // TAB - Navigate between areas and blocks
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            
            if (this.activeArea === 'speaker') {
                // First check if speaker block has a single Hebrew letter
                const speakerElement = activeBlock.element.querySelector('.block-speaker');
                const speakerText = speakerElement.textContent.trim();
                
                if (speakerText.length === 1 && this.isHebrewLetter(speakerText)) {
                    console.log('[TextEditor] Attempting to transform Hebrew letter:', speakerText);
                    
                    // Try to transform the letter to a name
                    if (window.updateSpeakersMap) {
                        window.updateSpeakersMap();
                    }
                    
                    if (window.speakersMap && window.speakersMap.has(speakerText.toUpperCase())) {
                        const speaker = window.speakersMap.get(speakerText.toUpperCase());
                        console.log('[TextEditor] Found speaker:', speaker);
                        speakerElement.textContent = speaker.name;
                        activeBlock.speaker = speaker.name;
                        this.updateBlockData();
                    } else {
                        console.log('[TextEditor] No speaker found for:', speakerText, '- creating new speaker');
                        
                        // Auto-create a new speaker block in the speakers section
                        if (window.addNewSpeakerWithCode) {
                            window.addNewSpeakerWithCode(speakerText);
                        }
                        
                        // Keep the letter as is (it represents a new speaker)
                        activeBlock.speaker = speakerText;
                        this.updateBlockData();
                    }
                }
                // Capture timestamp when leaving speaker block
                if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                    activeBlock.speakerTime = window.mediaPlayer.currentPlayer.currentTime || 0;
                    console.log('[TextEditor] Captured speaker time:', activeBlock.speakerTime);
                    
                    // Store timestamp in data attribute for navigation
                    const speakerElement = activeBlock.element.querySelector('.block-speaker');
                    if (speakerElement) {
                        speakerElement.setAttribute('data-timestamp', activeBlock.speakerTime);
                    }
                }
                
                // Move to text area of same block
                this.activeArea = 'text';
                
                // Clean the text area before focusing
                const textElement = activeBlock.element.querySelector('.block-text');
                if (textElement && !textElement.textContent.trim()) {
                    textElement.innerHTML = '';
                }
                
                this.focusActiveArea();
            } else {
                // Move to next block's speaker area
                const currentIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
                if (currentIndex < this.blocks.length - 1) {
                    this.activeBlockId = this.blocks[currentIndex + 1].id;
                    this.activeArea = 'speaker';
                    
                    // Clean the speaker area before focusing
                    const nextBlock = this.blocks[currentIndex + 1];
                    const speakerEl = nextBlock.element.querySelector('.block-speaker');
                    if (speakerEl && !speakerEl.textContent.trim()) {
                        speakerEl.innerHTML = '';
                    }
                    
                    this.focusActiveArea();
                } else {
                    // Create new block at end
                    const newBlock = this.addBlock(this.activeBlockId);
                    // Focus is already set to speaker area in addBlock, but clean text
                    const textEl = newBlock.element.querySelector('.block-text');
                    if (textEl) {
                        textEl.innerHTML = '';
                    }
                }
            }
        }
        
        // SHIFT+TAB - Navigate backwards
        else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            
            if (this.activeArea === 'text') {
                // Move to speaker area of same block
                this.activeArea = 'speaker';
                
                // Clean the speaker area before focusing
                const speakerEl = activeBlock.element.querySelector('.block-speaker');
                if (speakerEl && !speakerEl.textContent.trim()) {
                    speakerEl.innerHTML = '';
                }
                
                this.focusActiveArea();
            } else {
                // Move to previous block's text area
                const currentIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
                if (currentIndex > 0) {
                    this.activeBlockId = this.blocks[currentIndex - 1].id;
                    this.activeArea = 'text';
                    this.focusActiveArea();
                }
            }
        }
        
        // ENTER - Create new block
        else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // Validate text block before creating new block
            if (this.activeArea === 'text') {
                const textElement = activeBlock.element.querySelector('.block-text');
                const textContent = textElement.textContent.trim();
                
                if (textContent && !this.endsWithPunctuation(textContent)) {
                    // Show inline tooltip
                    this.showInlineTooltip(textElement, 'הטקסט חייב להסתיים בסימן פיסוק');
                    return;
                }
            }
            
            const newBlock = this.addBlock(this.activeBlockId);
            // Focus is already set to text area in addBlock
        }
        
        // SHIFT+ENTER - New line within block or move to next block
        else if (e.key === 'Enter' && e.shiftKey) {
            if (this.activeArea === 'speaker') {
                e.preventDefault();
                
                // Move to text area of current block
                this.activeArea = 'text';
                const textElement = activeBlock.element.querySelector('.block-text');
                if (textElement) {
                    textElement.focus();
                    // Place cursor at beginning
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(textElement);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else if (this.activeArea === 'text') {
                e.preventDefault();
                
                // Validate text block before moving to next block
                const textElement = activeBlock.element.querySelector('.block-text');
                const textContent = textElement.textContent.trim();
                
                if (textContent && !this.endsWithPunctuation(textContent)) {
                    this.showInlineTooltip(textElement, 'הטקסט חייב להסתיים בסימן פיסוק');
                    return;
                }
                
                // Create new block and move to it
                const newBlock = this.addBlock(this.activeBlockId);
                // Focus is already set to text area in addBlock
            }
        }
        
        // BACKSPACE - Navigate back to speaker block when at beginning of text or to previous block
        else if (e.key === 'Backspace') {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            if (this.activeArea === 'text') {
                const textElement = activeBlock.element.querySelector('.block-text');
                
                // Check if cursor is at the beginning
                if (range.startOffset === 0 && range.collapsed) {
                    const container = range.startContainer;
                    const isAtStart = container === textElement || 
                                     (container.parentNode === textElement && 
                                      !container.previousSibling);
                    
                    if (isAtStart && !textElement.textContent.trim()) {
                        e.preventDefault();
                        // Move to speaker block
                        this.activeArea = 'speaker';
                        const speakerElement = activeBlock.element.querySelector('.block-speaker');
                        if (speakerElement) {
                            speakerElement.focus();
                            // Place cursor at end
                            const speakerRange = document.createRange();
                            const speakerSel = window.getSelection();
                            speakerRange.selectNodeContents(speakerElement);
                            speakerRange.collapse(false);
                            speakerSel.removeAllRanges();
                            speakerSel.addRange(speakerRange);
                        }
                    }
                }
            } else if (this.activeArea === 'speaker') {
                const speakerElement = activeBlock.element.querySelector('.block-speaker');
                
                // Check if cursor is at the beginning and speaker is empty
                if (range.startOffset === 0 && range.collapsed) {
                    const container = range.startContainer;
                    const isAtStart = container === speakerElement || 
                                     (container.parentNode === speakerElement && 
                                      !container.previousSibling);
                    
                    if (isAtStart && !speakerElement.textContent.trim()) {
                        e.preventDefault();
                        
                        // Find previous block
                        const currentIndex = this.blocks.findIndex(b => b.id === activeBlock.id);
                        if (currentIndex > 0) {
                            const prevBlock = this.blocks[currentIndex - 1];
                            this.activeBlockId = prevBlock.id;
                            this.activeArea = 'text';
                            
                            // Focus on text area of previous block
                            const prevTextElement = prevBlock.element.querySelector('.block-text');
                            if (prevTextElement) {
                                prevTextElement.focus();
                                // Place cursor at end
                                const prevRange = document.createRange();
                                const prevSel = window.getSelection();
                                prevRange.selectNodeContents(prevTextElement);
                                prevRange.collapse(false);
                                prevSel.removeAllRanges();
                                prevSel.addRange(prevRange);
                            }
                            
                            // Remove current empty block
                            this.removeBlock(activeBlock.id);
                        }
                    }
                }
            }
        }
        
        // Update block data on any change
        setTimeout(() => this.updateBlockData(), 0);
    }
    
    endsWithPunctuation(text) {
        const punctuationMarks = ['.', ',', '!', '?', ':', ';', '״', '"', "'", ')', ']', '}'];
        const lastChar = text.slice(-1);
        return punctuationMarks.includes(lastChar);
    }
    
    isHebrewLetter(char) {
        const code = char.charCodeAt(0);
        return (code >= 0x05D0 && code <= 0x05EA) || // Hebrew letters
               (code >= 0x05F0 && code <= 0x05F4);   // Hebrew ligatures
    }
    
    showInlineTooltip(element, message) {
        // Remove any existing tooltip
        const existingTooltip = document.querySelector('.text-editor-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'text-editor-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            animation: fadeIn 0.2s ease;
            box-shadow: 0 2px 6px rgba(40, 167, 69, 0.3);
        `;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const selection = window.getSelection();
        let top = rect.bottom + 5;
        let left = rect.left;
        
        // Try to position near cursor if possible
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            if (rangeRect.left > 0) {
                left = rangeRect.left;
            }
        }
        
        document.body.appendChild(tooltip);
        
        // Adjust position to fit in viewport
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // Check if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            tooltip.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => tooltip.remove(), 200);
        }, 3000);
        
        // Remove on any click or key press
        const removeTooltip = () => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
            document.removeEventListener('click', removeTooltip);
            document.removeEventListener('keydown', removeTooltip);
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeTooltip);
            document.addEventListener('keydown', removeTooltip);
        }, 100);
    }
    
    handleInput(e) {
        // Process shortcuts FIRST
        if (window.TextEditorShortcuts && window.TextEditorShortcuts.process) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                
                // Only process in text blocks
                if (parentEl && parentEl.classList.contains('block-text')) {
                    const offset = range.startOffset;
                    const currentText = parentEl.textContent || '';
                    
                    // Process shortcuts
                    const result = window.TextEditorShortcuts.process(currentText, offset);
                    
                    if (result.processed) {
                        // Prevent default input
                        e.preventDefault();
                        
                        // Replace text with processed result
                        parentEl.textContent = result.text;
                        
                        // Update block data
                        const activeBlock = this.blocks[this.activeBlockId];
                        if (activeBlock) {
                            activeBlock.content = result.text;
                        }
                        
                        // Restore cursor position
                        if (parentEl.firstChild) {
                            const newRange = document.createRange();
                            newRange.setStart(parentEl.firstChild, Math.min(result.cursorPosition, result.text.length));
                            newRange.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                        }
                        
                        // Update block data
                        this.updateBlockData();
                        
                        // If triggerTimestamp flag is set, immediately check for timestamp conversion
                        if (result.triggerTimestamp) {
                            // Trigger an input event to run the timestamp check
                            setTimeout(() => {
                                const inputEvent = new Event('input', { bubbles: true });
                                parentEl.dispatchEvent(inputEvent);
                            }, 0);
                        }
                        
                        return;
                    }
                }
            }
        }
        
        // Prevent double spaces
        if (e.inputType === 'insertText' && e.data === ' ') {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;
            
            if (textNode.nodeType === Node.TEXT_NODE) {
                const text = textNode.textContent;
                const cursorPos = range.startOffset;
                
                // Check if previous character is also a space
                if (cursorPos > 0 && text[cursorPos - 1] === ' ') {
                    // Prevent the space from being inserted
                    e.preventDefault();
                    return;
                }
            }
        }
        
        // Already handled ... to timestamp conversion above
        /* Commented out - duplicate code
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        
        if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent;
            const cursorPos = range.startOffset;
            
            // Check if we just typed ...
            if (cursorPos >= 3 && text.substring(cursorPos - 3, cursorPos) === '...') {
                // Prevent default input handling
                e.preventDefault();
                e.stopPropagation();
                
                // Get current timestamp from media player
                let currentTime = 0;
                
                // Try to get time from media player
                if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                    currentTime = window.mediaPlayer.currentPlayer.currentTime || 0;
                    console.log('[TextEditor] Got timestamp from media player:', currentTime);
                } else {
                    console.log('[TextEditor] Media player not available, using 00:00:00');
                }
                
                const timestamp = ' [' + this.formatTimestamp(currentTime) + '] ';
                
                // Get the parent element (the contenteditable span)
                const parentElement = textNode.parentElement;
                
                // Use execCommand to insert the timestamp
                const beforeDots = text.substring(0, cursorPos - 3);
                const afterDots = text.substring(cursorPos);
                
                // Set the new content
                parentElement.textContent = beforeDots + timestamp + afterDots;
                
                // Position cursor after timestamp
                const newPosition = beforeDots.length + timestamp.length;
                
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    
                    // Find the text node in the updated element
                    const textNode = parentElement.firstChild || parentElement;
                    
                    try {
                        range.setStart(textNode, newPosition);
                        range.setEnd(textNode, newPosition);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } catch (e) {
                        console.error('Error setting cursor position:', e);
                    }
                });
                
                // Update block data
                this.updateBlockData();
                
                return; // Stop further processing
            }
        }
        */
        
        // Update block data
        this.updateBlockData();
        
        // Check for exact ... pattern for timestamp
        const checkTimestamp = () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.startContainer;
                const parentEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                
                if (parentEl && parentEl.classList.contains('block-text')) {
                    const text = parentEl.textContent || '';
                    
                    // Find all occurrences of exactly three dots
                    const regex = /\.\.\.(?!\.)/g; // Three dots not followed by another dot
                    let match;
                    
                    while ((match = regex.exec(text)) !== null) {
                        const startPos = match.index;
                        
                        // Get current timestamp from media player
                        let currentTime = 0;
                        if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                            currentTime = window.mediaPlayer.currentPlayer.currentTime || 0;
                        }
                        
                        // Format timestamp
                        const hours = Math.floor(currentTime / 3600);
                        const minutes = Math.floor((currentTime % 3600) / 60);
                        const seconds = Math.floor(currentTime % 60);
                        const timestamp = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        
                        // Replace ... with timestamp (with spaces)
                        const newText = text.substring(0, startPos) + ` [${timestamp}] ` + text.substring(startPos + 3);
                        parentEl.textContent = newText;
                        
                        // Update block data
                        const activeBlock = this.blocks[this.activeBlockId];
                        if (activeBlock) {
                            activeBlock.content = newText;
                        }
                        
                        // Set cursor after timestamp
                        const cursorPos = startPos + timestamp.length + 4; // +4 for brackets and spaces
                        if (parentEl.firstChild) {
                            const newRange = document.createRange();
                            const newTextNode = parentEl.firstChild;
                            try {
                                newRange.setStart(newTextNode, Math.min(cursorPos, newText.length));
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                            } catch (e) {
                                console.log('[TextEditor] Error setting cursor after timestamp:', e);
                            }
                        }
                        
                        // Update block data
                        this.updateBlockData();
                        
                        // Only process one timestamp at a time
                        break;
                    }
                }
            }
        };
        
        // Check immediately and also after a delay
        checkTimestamp();
        setTimeout(checkTimestamp, 100);
    }
    
    handleClick(e) {
        // Determine which block and area was clicked
        const blockElement = e.target.closest('.text-block');
        if (blockElement) {
            const blockId = blockElement.getAttribute('data-block-id');
            const area = e.target.getAttribute('data-area');
            
            if (blockId && area) {
                this.activeBlockId = blockId;
                this.activeArea = area;
            }
        }
    }
    
    handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        this.updateBlockData();
    }
    
    updateBlockData() {
        const activeBlock = this.blocks.find(b => b.id === this.activeBlockId);
        if (!activeBlock) return;
        
        const speakerElement = activeBlock.element.querySelector('.block-speaker');
        const textElement = activeBlock.element.querySelector('.block-text');
        
        const previousSpeaker = activeBlock.speaker;
        activeBlock.speaker = speakerElement.textContent;
        activeBlock.text = textElement.textContent;
        
        // Update color if speaker changed
        if (activeBlock.speaker && activeBlock.speaker !== previousSpeaker) {
            this.updateBlockColor(activeBlock);
        }
        
        // Show/hide separator based on content - ALWAYS VISIBLE FOR DEVELOPMENT
        const separator = activeBlock.element.querySelector('.block-separator');
        // if (activeBlock.speaker && activeBlock.text) {
        //     separator.style.display = 'inline';
        // } else {
        //     separator.style.display = 'none';
        // }
        separator.style.display = 'inline'; // Always visible for development
        
        // Update stats
        if (window.textEditor) {
            window.textEditor.updateStats();
        }
    }
    
    updateBlockColor(block) {
        const speakerElement = block.element.querySelector('.block-speaker');
        if (!speakerElement) return;
        
        if (!block.speaker) {
            // Remove color if no speaker
            speakerElement.style.color = '#333';
            return;
        }
        
        // Assign color to new speaker
        if (!this.speakerColors[block.speaker]) {
            this.speakerColors[block.speaker] = this.nextColorIndex;
            this.nextColorIndex = (this.nextColorIndex + 1) % this.colorPalette.length;
        }
        
        // Apply color to speaker text
        const colorIndex = this.speakerColors[block.speaker];
        const color = this.colorPalette[colorIndex];
        speakerElement.style.color = color;
        
        // Dispatch event to update speakers panel colors
        console.log('[TextEditorBlocks] Dispatching speakerColorUpdated event for:', block.speaker, 'with color:', color);
        document.dispatchEvent(new CustomEvent('speakerColorUpdated', {
            detail: {
                speaker: block.speaker,
                color: color,
                colorIndex: colorIndex
            }
        }));
    }
    
    focusActiveArea() {
        const activeBlock = this.blocks.find(b => b.id === this.activeBlockId);
        if (!activeBlock) return;
        
        const targetElement = this.activeArea === 'speaker' 
            ? activeBlock.element.querySelector('.block-speaker')
            : activeBlock.element.querySelector('.block-text');
            
        if (targetElement) {
            // Clear any unwanted content before focusing
            if (!targetElement.textContent.trim()) {
                targetElement.innerHTML = '';
            }
            
            targetElement.focus();
            
            // Multiple cleanup attempts after focus
            setTimeout(() => {
                if (targetElement.innerHTML === ' ' || 
                    targetElement.innerHTML === '&nbsp;' || 
                    targetElement.innerHTML === '\u00A0' ||
                    targetElement.textContent === ' ' ||
                    targetElement.textContent === '\u00A0' ||
                    targetElement.innerHTML.trim() === '' && targetElement.innerHTML !== '') {
                    targetElement.innerHTML = '';
                    targetElement.textContent = '';
                }
                
                // Check for any child nodes that might be spaces
                if (targetElement.childNodes.length === 1 && 
                    targetElement.childNodes[0].nodeType === Node.TEXT_NODE &&
                    targetElement.childNodes[0].textContent === ' ') {
                    targetElement.innerHTML = '';
                }
            }, 0);
            
            // Another cleanup after a short delay
            setTimeout(() => {
                if (targetElement.textContent === ' ' || targetElement.textContent === '\u00A0') {
                    targetElement.textContent = '';
                }
            }, 10);
            
            // Place cursor at end
            const range = document.createRange();
            const selection = window.getSelection();
            
            if (targetElement.childNodes.length > 0) {
                range.selectNodeContents(targetElement);
                range.collapse(false);
            } else {
                // For empty element, set cursor at beginning
                range.setStart(targetElement, 0);
                range.setEnd(targetElement, 0);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    
    formatTimestamp(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    
    highlightTimestamps() {
        // Disabled - causes cursor jumping issues
        // Timestamps will remain as plain text
        return;
    }
    
    checkTimestampClick(e, element) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const clickPos = range.startOffset;
        const text = element.textContent;
        
        // Find timestamp at click position
        const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;
        let match;
        
        while ((match = timestampRegex.exec(text)) !== null) {
            if (clickPos >= match.index && clickPos <= match.index + match[0].length) {
                // Clicked on timestamp - jump to time
                const timeStr = match[0].slice(1, -1); // Remove brackets
                const [h, m, s] = timeStr.split(':').map(Number);
                const totalSeconds = h * 3600 + m * 60 + s;
                
                if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                    window.mediaPlayer.currentPlayer.currentTime = totalSeconds;
                    console.log('[TextEditor] Jumped to timestamp:', timeStr);
                }
                break;
            }
        }
    }
    
    checkTimestampAtCursor() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        if (container.nodeType !== Node.TEXT_NODE) return;
        
        const parentEl = container.parentElement;
        if (!parentEl) return;
        
        // Check if navigation mode is enabled
        const navMode = window.TextEditorNavigation && window.TextEditorNavigation.isEnabled();
        if (!navMode) return;
        
        // Check if we're in a speaker block with hidden timestamp
        if (parentEl.classList.contains('block-speaker')) {
            const timestamp = parentEl.getAttribute('data-timestamp');
            if (timestamp && window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                window.mediaPlayer.currentPlayer.currentTime = parseFloat(timestamp);
                console.log('[Navigation Mode] Auto-jumped to speaker time:', timestamp);
                
                // Visual feedback
                parentEl.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
                setTimeout(() => {
                    parentEl.style.backgroundColor = '';
                }, 300);
            }
            return;
        }
        
        // Check for regular timestamps in text blocks
        if (!parentEl.classList.contains('block-text')) return;
        
        const cursorPos = range.startOffset;
        const text = container.textContent;
        
        // Find timestamp at cursor position
        const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;
        let match;
        
        while ((match = timestampRegex.exec(text)) !== null) {
            if (cursorPos >= match.index && cursorPos <= match.index + match[0].length) {
                // Cursor is on timestamp - jump to time
                const timeStr = match[0].slice(1, -1); // Remove brackets
                const [h, m, s] = timeStr.split(':').map(Number);
                const totalSeconds = h * 3600 + m * 60 + s;
                
                if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                    window.mediaPlayer.currentPlayer.currentTime = totalSeconds;
                    console.log('[Navigation Mode] Auto-jumped to:', timeStr);
                    
                    // Visual feedback
                    parentEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    setTimeout(() => {
                        parentEl.style.backgroundColor = '';
                    }, 300);
                }
                break;
            }
        }
    }
    
    // Get all text content
    getText() {
        return this.blocks.map(block => {
            const speaker = block.speaker ? `${block.speaker}: ` : '';
            return speaker + block.text;
        }).join('\n');
    }
    
    // Set text content
    setText(text) {
        // Clear existing blocks
        this.blocks = [];
        this.editor.innerHTML = '';
        
        // Parse text into blocks
        const lines = text.split('\n');
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            let speaker = '';
            let content = line;
            
            if (colonIndex > 0 && colonIndex < 30) { // Reasonable speaker name length
                speaker = line.substring(0, colonIndex).trim();
                content = line.substring(colonIndex + 1).trim();
            }
            
            const block = this.addBlock();
            block.speaker = speaker;
            block.text = content;
            
            // Update DOM
            const speakerElement = block.element.querySelector('.block-speaker');
            const textElement = block.element.querySelector('.block-text');
            speakerElement.textContent = speaker;
            textElement.textContent = content;
            
            // Apply color for speaker
            if (speaker) {
                this.updateBlockColor(block);
            }
            
            // Update block data to ensure color is set
            this.updateBlockData();
        });
        
        // Focus first block if any
        if (this.blocks.length > 0) {
            this.activeBlockId = this.blocks[0].id;
            this.activeArea = 'speaker';
            this.focusActiveArea();
        }
        
        // Dispatch initial color update event
        console.log('[TextEditorBlocks] Dispatching initial color update with all speakers:', this.speakerColors);
        document.dispatchEvent(new CustomEvent('speakerColorUpdated'));
    }
    
    refreshAllColors() {
        console.log('[TextEditorBlocks] Refreshing all block colors');
        this.blocks.forEach(block => {
            if (block.speaker) {
                this.updateBlockColor(block);
            }
        });
    }
    
    handleArrowNavigation(e, activeBlock) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const element = this.activeArea === 'speaker' 
            ? activeBlock.element.querySelector('.block-speaker')
            : activeBlock.element.querySelector('.block-text');
        
        if (!element) return false;
        
        const currentBlockIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
        
        // Handle UP/DOWN arrow keys
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // Get cursor position relative to element
            const textContent = element.textContent;
            const cursorOffset = range.startOffset;
            
            // Check if we're at the first or last line
            const isAtFirstLine = this.isAtFirstLine(element, range);
            const isAtLastLine = this.isAtLastLine(element, range);
            
            if (e.key === 'ArrowUp' && isAtFirstLine) {
                // Move to previous area or block
                if (this.activeArea === 'text') {
                    // Move to speaker of same block
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    // Position cursor at end
                    const speakerEl = activeBlock.element.querySelector('.block-speaker');
                    this.setCursorAtEnd(speakerEl);
                    return true;
                } else if (currentBlockIndex > 0) {
                    // Move to text area of previous block
                    this.activeBlockId = this.blocks[currentBlockIndex - 1].id;
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    // Position cursor at end
                    const prevBlock = this.blocks[currentBlockIndex - 1];
                    const textEl = prevBlock.element.querySelector('.block-text');
                    this.setCursorAtEnd(textEl);
                    return true;
                }
            }
            
            if (e.key === 'ArrowDown' && isAtLastLine) {
                // Move to next area or block
                if (this.activeArea === 'speaker') {
                    // Move to text of same block
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    // Position cursor at beginning
                    const textEl = activeBlock.element.querySelector('.block-text');
                    this.setCursorAtBeginning(textEl);
                    return true;
                } else if (currentBlockIndex < this.blocks.length - 1) {
                    // Move to speaker area of next block
                    this.activeBlockId = this.blocks[currentBlockIndex + 1].id;
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    // Position cursor at beginning
                    const nextBlock = this.blocks[currentBlockIndex + 1];
                    const speakerEl = nextBlock.element.querySelector('.block-speaker');
                    this.setCursorAtBeginning(speakerEl);
                    return true;
                }
            }
        }
        
        // Handle LEFT/RIGHT arrow keys (accounting for RTL)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const textContent = element.textContent;
            const cursorOffset = range.startOffset;
            const isRTL = window.getComputedStyle(element).direction === 'rtl';
            
            // In RTL: ArrowLeft moves forward (to end), ArrowRight moves backward (to beginning)
            const isAtBeginning = cursorOffset === 0;
            const isAtEnd = cursorOffset === textContent.length;
            
            // Determine logical movement direction
            const movingToLogicalStart = (isRTL && e.key === 'ArrowRight') || (!isRTL && e.key === 'ArrowLeft');
            const movingToLogicalEnd = (isRTL && e.key === 'ArrowLeft') || (!isRTL && e.key === 'ArrowRight');
            
            if (movingToLogicalStart && isAtBeginning) {
                // Move to previous area or block
                if (this.activeArea === 'text') {
                    // Move to end of speaker in same block
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    const speakerEl = activeBlock.element.querySelector('.block-speaker');
                    this.setCursorAtEnd(speakerEl);
                    return true;
                } else if (currentBlockIndex > 0) {
                    // Move to end of text in previous block
                    this.activeBlockId = this.blocks[currentBlockIndex - 1].id;
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    const prevBlock = this.blocks[currentBlockIndex - 1];
                    const textEl = prevBlock.element.querySelector('.block-text');
                    this.setCursorAtEnd(textEl);
                    return true;
                }
            }
            
            if (movingToLogicalEnd && isAtEnd) {
                // Move to next area or block
                if (this.activeArea === 'speaker') {
                    // Move to beginning of text in same block
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    const textEl = activeBlock.element.querySelector('.block-text');
                    this.setCursorAtBeginning(textEl);
                    return true;
                } else if (currentBlockIndex < this.blocks.length - 1) {
                    // Move to beginning of speaker in next block
                    this.activeBlockId = this.blocks[currentBlockIndex + 1].id;
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    const nextBlock = this.blocks[currentBlockIndex + 1];
                    const speakerEl = nextBlock.element.querySelector('.block-speaker');
                    this.setCursorAtBeginning(speakerEl);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    handleHomeEndNavigation(e, activeBlock) {
        const currentBlockIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
        
        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Home - Go to beginning of document
            if (e.key === 'Home') {
                this.activeBlockId = this.blocks[0].id;
                this.activeArea = 'speaker';
                this.focusActiveArea();
                const firstBlock = this.blocks[0];
                const speakerEl = firstBlock.element.querySelector('.block-speaker');
                this.setCursorAtBeginning(speakerEl);
                return true;
            }
            
            // Ctrl+End - Go to end of document
            if (e.key === 'End') {
                const lastBlock = this.blocks[this.blocks.length - 1];
                this.activeBlockId = lastBlock.id;
                this.activeArea = 'text';
                this.focusActiveArea();
                const textEl = lastBlock.element.querySelector('.block-text');
                this.setCursorAtEnd(textEl);
                return true;
            }
        } else {
            // Home - Go to beginning of current line, then beginning of current area, then beginning of block
            if (e.key === 'Home') {
                const element = this.activeArea === 'speaker' 
                    ? activeBlock.element.querySelector('.block-speaker')
                    : activeBlock.element.querySelector('.block-text');
                
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                // If not at beginning of element, just let default behavior handle it
                if (range.startOffset > 0) {
                    return false;
                }
                
                // If at beginning of text area, move to speaker
                if (this.activeArea === 'text') {
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    const speakerEl = activeBlock.element.querySelector('.block-speaker');
                    this.setCursorAtBeginning(speakerEl);
                    return true;
                }
                
                // If at beginning of speaker and not first block, move to previous block's speaker
                if (this.activeArea === 'speaker' && currentBlockIndex > 0) {
                    this.activeBlockId = this.blocks[currentBlockIndex - 1].id;
                    this.activeArea = 'speaker';
                    this.focusActiveArea();
                    const prevBlock = this.blocks[currentBlockIndex - 1];
                    const speakerEl = prevBlock.element.querySelector('.block-speaker');
                    this.setCursorAtBeginning(speakerEl);
                    return true;
                }
            }
            
            // End - Go to end of current line, then end of current area, then end of block
            if (e.key === 'End') {
                const element = this.activeArea === 'speaker' 
                    ? activeBlock.element.querySelector('.block-speaker')
                    : activeBlock.element.querySelector('.block-text');
                
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                // If not at end of element, just let default behavior handle it
                if (range.startOffset < element.textContent.length) {
                    return false;
                }
                
                // If at end of speaker area, move to end of text
                if (this.activeArea === 'speaker') {
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    const textEl = activeBlock.element.querySelector('.block-text');
                    this.setCursorAtEnd(textEl);
                    return true;
                }
                
                // If at end of text and not last block, move to next block's text
                if (this.activeArea === 'text' && currentBlockIndex < this.blocks.length - 1) {
                    this.activeBlockId = this.blocks[currentBlockIndex + 1].id;
                    this.activeArea = 'text';
                    this.focusActiveArea();
                    const nextBlock = this.blocks[currentBlockIndex + 1];
                    const textEl = nextBlock.element.querySelector('.block-text');
                    this.setCursorAtEnd(textEl);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Helper methods for cursor positioning
    isAtFirstLine(element, range) {
        // For single-line elements, check if cursor is at the beginning
        const text = element.textContent;
        if (!text.includes('\n')) {
            return range.startOffset === 0;
        }
        
        // For multi-line, check if cursor is in the first line
        const beforeCursor = text.substring(0, range.startOffset);
        return !beforeCursor.includes('\n');
    }
    
    isAtLastLine(element, range) {
        // For single-line elements, check if cursor is at the end
        const text = element.textContent;
        if (!text.includes('\n')) {
            return range.startOffset === text.length;
        }
        
        // For multi-line, check if cursor is in the last line
        const afterCursor = text.substring(range.startOffset);
        return !afterCursor.includes('\n');
    }
    
    setCursorAtBeginning(element) {
        if (!element) return;
        
        setTimeout(() => {
            element.focus();
            const range = document.createRange();
            const selection = window.getSelection();
            
            if (element.firstChild) {
                range.setStart(element.firstChild, 0);
                range.setEnd(element.firstChild, 0);
            } else {
                range.setStart(element, 0);
                range.setEnd(element, 0);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);
    }
    
    setCursorAtEnd(element) {
        if (!element) return;
        
        setTimeout(() => {
            element.focus();
            const range = document.createRange();
            const selection = window.getSelection();
            
            if (element.firstChild) {
                const length = element.firstChild.textContent.length;
                range.setStart(element.firstChild, length);
                range.setEnd(element.firstChild, length);
            } else {
                range.selectNodeContents(element);
                range.collapse(false);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        }, 0);
    }
}

// Export for use
window.TextEditorBlocks = TextEditorBlocks;