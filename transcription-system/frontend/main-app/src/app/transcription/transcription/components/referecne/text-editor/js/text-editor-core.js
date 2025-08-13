/*
 * =========================================
 * Text Editor Core JavaScript
 * js/text-editor-core.js
 * =========================================
 */

class TextEditor {
    constructor() {
        console.log('[TextEditor] Initializing text editor core...');
        this.editor = document.getElementById('textEditor');
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        this.lineCount = document.getElementById('lineCount');
        
        if (this.editor) {
            // Initialize block system
            this.initializeBlockSystem();
            
            this.setupEventListeners();
            this.updateStats();
            
            // Make the editor focusable
            this.editor.setAttribute('tabindex', '0');
            
            // Auto-focus the editor
            setTimeout(() => {
                if (this.blockEditor) {
                    this.blockEditor.focusActiveArea();
                } else {
                    this.editor.focus();
                }
            }, 100);
            
            console.log('[TextEditor] Core initialized successfully');
        } else {
            console.error('[TextEditor] Editor element not found!');
        }
    }
    
    initializeBlockSystem() {
        console.log('[TextEditor] Initializing block system...');
        
        // Clear contenteditable from main editor
        this.editor.removeAttribute('contenteditable');
        
        // Initialize block editor
        if (window.TextEditorBlocks) {
            this.blockEditor = new window.TextEditorBlocks(this.editor);
            // Expose globally for speaker color sync
            window.textEditorBlocks = this.blockEditor;
            console.log('[TextEditor] Block system initialized');
            
            // Dispatch ready event
            document.dispatchEvent(new Event('textEditorReady'));
        } else {
            console.warn('[TextEditor] Block system not available, using standard editor');
            this.editor.setAttribute('contenteditable', 'true');
        }
    }
    
    setupEventListeners() {
        // Update stats on input
        this.editor.addEventListener('input', () => {
            this.updateStats();
        });
        
        // Handle paste events
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
        
        // Ensure focus on click
        this.editor.addEventListener('click', () => {
            this.editor.focus();
        });
        
        // Block media player shortcuts when editor is focused
        this.editor.addEventListener('focus', () => {
            window.textEditorFocused = true;
            console.log('[TextEditor] Editor focused - media shortcuts blocked');
        });
        
        this.editor.addEventListener('blur', () => {
            window.textEditorFocused = false;
            console.log('[TextEditor] Editor blurred - media shortcuts enabled');
        });
        
        // Handle keyboard events
        this.editor.addEventListener('keydown', (e) => {
            // Only block keys that are used for typing
            const typingKeys = [
                ' ', // Space
                'Tab', // Tab
                'Enter', // Enter
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', // Arrow keys
                'Backspace', 'Delete', // Delete keys
                'Home', 'End', 'PageUp', 'PageDown' // Navigation keys
            ];
            
            // Check if it's a character key (a-z, 0-9, etc) or a typing key
            const isTypingKey = typingKeys.includes(e.key) || 
                               (e.key.length === 1 && !e.ctrlKey && !e.altKey) || // Single character
                               (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey); // Numbers without modifiers
            
            if (isTypingKey) {
                // e.stopPropagation(); // Commented out to allow auto-detect to work
            }
            
            // Handle TAB key - insert tab character instead of changing focus
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '\t');
            }
        });
        
        // Also block keyup events from propagating
        this.editor.addEventListener('keyup', (e) => {
            // e.stopPropagation(); // Commented out to allow auto-detect to work
        });
        
        // Block keypress events
        this.editor.addEventListener('keypress', (e) => {
            // e.stopPropagation(); // Commented out to allow auto-detect to work
        });
    }
    
    updateStats() {
        const text = this.editor.innerText || '';
        
        // Word count
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        if (this.wordCount) {
            this.wordCount.textContent = words.length;
        }
        
        // Character count
        if (this.charCount) {
            this.charCount.textContent = text.length;
        }
        
        // Line count
        const lines = text.split('\n');
        if (this.lineCount) {
            this.lineCount.textContent = lines.length;
        }
    }
    
    // Public methods
    getText() {
        if (this.blockEditor) {
            return this.blockEditor.getText();
        }
        return this.editor.innerText || '';
    }
    
    setText(text) {
        if (this.blockEditor) {
            this.blockEditor.setText(text);
        } else {
            this.editor.innerText = text;
        }
        this.updateStats();
    }
    
    insertText(text) {
        if (this.blockEditor) {
            // Insert text at current position in block editor
            document.execCommand('insertText', false, text);
        } else {
            document.execCommand('insertText', false, text);
        }
        this.updateStats();
    }
    
    focus() {
        if (this.blockEditor) {
            this.blockEditor.focusActiveArea();
        } else {
            this.editor.focus();
        }
    }
    
    // Add init method for compatibility
    init() {
        console.log('[TextEditor] Init called (already initialized in constructor)');
    }
    
    // Add missing methods for compatibility
    setProjectId(projectId) {
        console.log('[TextEditor] Setting project ID:', projectId);
        this.currentProjectId = projectId;
    }
    
    loadText(text) {
        console.log('[TextEditor] Loading text...');
        if (text) {
            this.setText(text);
        }
    }
    
    clear() {
        console.log('[TextEditor] Clearing editor');
        this.editor.innerHTML = '';
        this.updateStats();
    }
    
    enable() {
        console.log('[TextEditor] Enabling editor');
        this.editor.contentEditable = true;
        this.editor.classList.remove('disabled');
    }
    
    disable() {
        console.log('[TextEditor] Disabling editor');
        this.editor.contentEditable = false;
        this.editor.classList.add('disabled');
    }
}

// Make TextEditor available globally
window.TextEditor = TextEditor;