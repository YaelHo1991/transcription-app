/*
 * =========================================
 * Remarks Component JavaScript
 * components/remarks/remarks.js
 * =========================================
 * Remarks and notes functionality
 */

class RemarksManager {
    constructor() {
        this.notesTextarea = null;
        this.currentProjectId = null;
        this.hasUnsavedChanges = false;
    }

    // Initialize remarks manager
    init(projectId = null) {
        this.currentProjectId = projectId;
        this.notesTextarea = document.querySelector('.notes-area');
        
        if (this.notesTextarea) {
            this.setupEventListeners();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        this.notesTextarea.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
        });
    }

    // Save remarks
    async saveRemarks() {
        if (!this.currentProjectId) {
            this.showMessage('לא נבחר פרויקט לשמירה', 'error');
            return false;
        }

        try {
            const formData = new FormData();
            formData.append('project_id', this.currentProjectId);
            formData.append('notes', this.notesTextarea.value);

            const response = await fetch('../../../core/api/projects.php?action=update', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.hasUnsavedChanges = false;
                this.showMessage('הערות נשמרו בהצלחה', 'success');
                return true;
            } else {
                throw new Error(data.error || 'Failed to save remarks');
            }
        } catch (error) {
            this.showMessage('שגיאה בשמירת ההערות: ' + error.message, 'error');
            return false;
        }
    }

    // Clear remarks
    clearRemarks() {
        if (confirm('האם אתה בטוח שברצונך לנקות את כל ההערות?')) {
            this.notesTextarea.value = '';
            this.hasUnsavedChanges = true;
        }
    }

    // Set remarks text
    setRemarksText(text) {
        if (this.notesTextarea) {
            this.notesTextarea.value = text || '';
            this.hasUnsavedChanges = false;
        }
    }

    // Get remarks text
    getRemarksText() {
        return this.notesTextarea ? this.notesTextarea.value : '';
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

// Global remarks manager instance
let remarksManager = new RemarksManager();

// Global functions for backward compatibility
function saveRemarks() {
    return remarksManager.saveRemarks();
}

function clearRemarks() {
    remarksManager.clearRemarks();
}

// Export for use in other components
window.RemarksManager = RemarksManager;
window.remarksManager = remarksManager;