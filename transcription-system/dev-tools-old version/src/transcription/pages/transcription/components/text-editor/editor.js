/*
 * =========================================
 * Text Editor Component JavaScript
 * components/text-editor/editor.js
 * =========================================
 * Text editor functionality
 */

class TextEditor {
    constructor() {
        this.textArea = null;
        this.pageCount = 1;
        this.totalPages = 100;
        this.autoSaveInterval = null;
        this.hasUnsavedChanges = false;
        this.currentProjectId = null;
    }

    // Initialize text editor
    init(projectId = null) {
        this.currentProjectId = projectId;
        this.textArea = document.getElementById('transcriptionText');
        this.pageCountInput = document.getElementById('pageCount');
        this.totalPagesSpan = document.getElementById('totalPages');

        if (this.textArea) {
            this.setupEventListeners();
            this.startAutoSave();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Text change detection
        this.textArea.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
            this.showUnsavedIndicator();
        });

        // Page count change
        if (this.pageCountInput) {
            this.pageCountInput.addEventListener('change', (e) => {
                this.pageCount = parseInt(e.target.value) || 1;
                this.hasUnsavedChanges = true;
            });
        }

        // Keyboard shortcuts
        this.textArea.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Auto-resize
        this.textArea.addEventListener('input', () => {
            this.autoResize();
        });
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveTranscription();
        }

        // Ctrl+Enter to add new speaker
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            this.addNewSpeaker();
        }

        // Ctrl+T to add timestamp
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            this.addTimestamp();
        }

        // Tab to insert speaker format
        if (e.key === 'Tab' && !e.shiftKey) {
            const cursor = this.textArea.selectionStart;
            const lineStart = this.textArea.value.lastIndexOf('\n', cursor - 1) + 1;
            const lineText = this.textArea.value.substring(lineStart, cursor);
            
            if (lineText.trim() === '') {
                e.preventDefault();
                this.insertSpeakerFormat();
            }
        }
    }

    // Auto-resize textarea
    autoResize() {
        if (this.textArea) {
            this.textArea.style.height = 'auto';
            this.textArea.style.height = Math.max(300, this.textArea.scrollHeight) + 'px';
        }
    }

    // Insert speaker format
    insertSpeakerFormat() {
        const speakerNumber = this.getNextSpeakerNumber();
        const speakerText = `דובר ${speakerNumber}: `;
        this.insertTextAtCursor(speakerText);
    }

    // Get next speaker number
    getNextSpeakerNumber() {
        const text = this.textArea.value;
        const matches = text.match(/דובר (\d+):/g);
        if (!matches) return 1;
        
        const numbers = matches.map(match => parseInt(match.match(/\d+/)[0]));
        return Math.max(...numbers) + 1;
    }

    // Add new speaker
    addNewSpeaker() {
        const speakerNumber = this.getNextSpeakerNumber();
        const speakerText = `\nדובר ${speakerNumber}: `;
        this.insertTextAtCursor(speakerText);
    }

    // Add timestamp
    addTimestamp() {
        const now = new Date();
        const timestamp = `[${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
        this.insertTextAtCursor(timestamp);
    }

    // Insert text at cursor position
    insertTextAtCursor(text) {
        const startPos = this.textArea.selectionStart;
        const endPos = this.textArea.selectionEnd;
        const textValue = this.textArea.value;
        
        this.textArea.value = textValue.substring(0, startPos) + text + textValue.substring(endPos);
        this.textArea.selectionStart = this.textArea.selectionEnd = startPos + text.length;
        this.textArea.focus();
        
        this.hasUnsavedChanges = true;
        this.autoResize();
    }

    // Save transcription
    async saveTranscription() {
        if (!this.currentProjectId) {
            this.showMessage('לא נבחר פרויקט לשמירה', 'error');
            return false;
        }

        const speakersList = document.querySelector('.speakers-list');
        const notesArea = document.querySelector('.notes-area');

        try {
            const formData = new FormData();
            formData.append('project_id', this.currentProjectId);
            formData.append('transcription_text', this.textArea.value);
            if (speakersList) formData.append('speakers_list', speakersList.value);
            if (notesArea) formData.append('notes', notesArea.value);

            const response = await fetch('api/projects.php?action=update', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.hasUnsavedChanges = false;
                this.hideUnsavedIndicator();
                this.showMessage('תמלול נשמר בהצלחה', 'success');
                return true;
            } else {
                throw new Error(data.error || 'Failed to save transcription');
            }
        } catch (error) {
            this.showMessage('שגיאה בשמירת התמלול: ' + error.message, 'error');
            return false;
        }
    }

    // Complete transcription
    async completeTranscription() {
        if (!this.currentProjectId) {
            this.showMessage('לא נבחר פרויקט', 'error');
            return;
        }

        if (confirm('האם אתה בטוח שסיימת את התמלול?')) {
            try {
                // First save current work
                const saved = await this.saveTranscription();
                if (!saved) return;
                
                // Then mark as completed
                const formData = new FormData();
                formData.append('project_id', this.currentProjectId);
                formData.append('status', 'completed');

                const response = await fetch('api/projects.php?action=update', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    this.showMessage('התמלול הושלם בהצלחה!', 'success');
                    
                    // Redirect back to main page after 2 seconds
                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        let redirectUrl = '../main/index.php';
                        
                        if (urlParams.has('dev')) {
                            redirectUrl += '?dev=1';
                        }
                        if (urlParams.has('devnav')) {
                            redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'devnav=1';
                        }
                        
                        window.location.href = redirectUrl;
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Failed to complete transcription');
                }
            } catch (error) {
                this.showMessage('שגיאה בהשלמת התמלול: ' + error.message, 'error');
            }
        }
    }

    // Start auto-save
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges && this.currentProjectId) {
                this.saveTranscription();
            }
        }, 60000); // Auto-save every minute
    }

    // Stop auto-save
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Show unsaved changes indicator
    showUnsavedIndicator() {
        const saveButton = document.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
            saveButton.innerHTML = '● שמור תמלול';
        }
    }

    // Hide unsaved changes indicator
    hideUnsavedIndicator() {
        const saveButton = document.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.style.background = '';
            saveButton.innerHTML = 'שמור תמלול';
        }
    }

    // Set text content
    setText(text) {
        if (this.textArea) {
            this.textArea.value = text || '';
            this.autoResize();
            this.hasUnsavedChanges = false;
        }
    }

    // Get text content
    getText() {
        return this.textArea ? this.textArea.value : '';
    }

    // Set project ID
    setProjectId(projectId) {
        this.currentProjectId = projectId;
    }

    // Show message
    showMessage(text, type) {
        if (window.showMessage) {
            window.showMessage(text, type);
        } else {
            console.log(`${type}: ${text}`);
        }
    }
}

// Global text editor instance
let textEditor = new TextEditor();

// Global functions for backward compatibility
function saveTranscription() {
    return textEditor.saveTranscription();
}

function completeTranscription() {
    return textEditor.completeTranscription();
}

// Export for use in other components
window.TextEditor = TextEditor;
window.textEditor = textEditor;