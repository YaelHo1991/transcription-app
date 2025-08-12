/*
 * Undo/Redo Module
 * toolbar/formatting/undo-redo/undo-redo.js
 */

(function() {
    console.log('[TextEditor] Undo/redo module loaded');
    
    let undoStack = [];
    let redoStack = [];
    let isUndoRedo = false;
    
    document.addEventListener('DOMContentLoaded', function() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const editor = document.getElementById('textEditor');
        
        if (undoBtn) {
            undoBtn.addEventListener('click', performUndo);
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', performRedo);
        }
        
        if (editor) {
            // Save initial state
            saveState();
            
            // Track changes
            editor.addEventListener('input', function() {
                if (!isUndoRedo) {
                    saveState();
                    redoStack = []; // Clear redo stack on new input
                    updateButtonStates();
                }
            });
            
            // Keyboard shortcuts
            editor.addEventListener('keydown', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        performUndo();
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        performRedo();
                    }
                }
            });
        }
    });
    
    function saveState() {
        const editor = document.getElementById('textEditor');
        if (editor) {
            const state = {
                content: editor.innerHTML,
                selection: saveSelection()
            };
            
            // Don't save if it's the same as the last state
            if (undoStack.length === 0 || undoStack[undoStack.length - 1].content !== state.content) {
                undoStack.push(state);
                
                // Limit stack size
                if (undoStack.length > 50) {
                    undoStack.shift();
                }
            }
        }
    }
    
    function performUndo() {
        if (undoStack.length > 1) {
            isUndoRedo = true;
            
            // Move current state to redo stack
            const currentState = undoStack.pop();
            redoStack.push(currentState);
            
            // Restore previous state
            const prevState = undoStack[undoStack.length - 1];
            restoreState(prevState);
            
            isUndoRedo = false;
            updateButtonStates();
        }
    }
    
    function performRedo() {
        if (redoStack.length > 0) {
            isUndoRedo = true;
            
            // Move state from redo to undo stack
            const redoState = redoStack.pop();
            undoStack.push(redoState);
            
            // Restore state
            restoreState(redoState);
            
            isUndoRedo = false;
            updateButtonStates();
        }
    }
    
    function restoreState(state) {
        const editor = document.getElementById('textEditor');
        if (editor && state) {
            editor.innerHTML = state.content;
            if (state.selection) {
                restoreSelection(state.selection);
            }
            
            // Trigger update events
            if (window.textEditor) {
                window.textEditor.updateStats();
            }
        }
    }
    
    function saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            return {
                startOffset: range.startOffset,
                endOffset: range.endOffset
            };
        }
        return null;
    }
    
    function restoreSelection(savedSelection) {
        // Simple restoration - in production you'd need more complex logic
        const editor = document.getElementById('textEditor');
        if (editor && savedSelection) {
            editor.focus();
        }
    }
    
    function updateButtonStates() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = undoStack.length <= 1;
        }
        
        if (redoBtn) {
            redoBtn.disabled = redoStack.length === 0;
        }
    }
    
    // Export for external use
    window.TextEditorUndoRedo = {
        undo: performUndo,
        redo: performRedo,
        saveState: saveState
    };
})();
