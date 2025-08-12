/*
 * =========================================
 * Speakers UI Handler
 * js/speakers-ui.js
 * =========================================
 * UI interactions and display logic
 */

class SpeakersUI {
    constructor() {
        this.container = null;
        this.saveTimeout = null;
    }

    // Initialize UI
    init() {
        this.container = document.querySelector('.speakers-section');
        if (this.container) {
            this.setupAutoSave();
        }
    }

    // Setup auto-save functionality
    setupAutoSave() {
        const textarea = document.querySelector('.speakers-list');
        if (textarea) {
            textarea.addEventListener('input', () => {
                // Clear existing timeout
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                
                // Show saving indicator
                this.showSavingIndicator();
                
                // Auto-save after 2 seconds of no typing
                this.saveTimeout = setTimeout(() => {
                    this.autoSave();
                }, 2000);
            });
        }
    }

    // Show saving indicator
    showSavingIndicator() {
        const indicator = document.querySelector('.speakers-save-indicator');
        if (indicator) {
            indicator.textContent = 'שומר...';
            indicator.style.color = '#ffc107';
        }
    }

    // Auto save speakers
    async autoSave() {
        if (window.speakersManager && window.speakersManager.hasChanges()) {
            const saved = await window.speakersManager.saveSpeakers();
            const indicator = document.querySelector('.speakers-save-indicator');
            
            if (indicator) {
                if (saved) {
                    indicator.textContent = 'נשמר';
                    indicator.style.color = '#28a745';
                    window.speakersManager.markAsSaved();
                } else {
                    indicator.textContent = 'שגיאה בשמירה';
                    indicator.style.color = '#dc3545';
                }
            }
        }
    }

    // Update speakers list display
    updateSpeakersList(speakers) {
        // Update any UI elements that show speakers
        const dropdown = document.getElementById('speakerDropdown');
        if (dropdown) {
            this.updateSpeakerDropdown(dropdown, speakers);
        }
        
        // Update speaker shortcuts if available
        if (window.updateSpeakerShortcuts) {
            window.updateSpeakerShortcuts(speakers);
        }
    }

    // Update speaker dropdown
    updateSpeakerDropdown(dropdown, speakers) {
        // Clear existing options
        dropdown.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'בחר דובר...';
        dropdown.appendChild(defaultOption);
        
        // Add speaker options
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = `דובר ${speaker.number}: `;
            option.textContent = `דובר ${speaker.number}: ${speaker.name}`;
            if (speaker.role) {
                option.textContent += ` - ${speaker.role}`;
            }
            dropdown.appendChild(option);
        });
    }

    // Show speaker dialog
    showAddSpeakerDialog() {
        // Use blocks system instead
        if (window.speakersBlocks) {
            window.speakersBlocks.addEmptySpeakerBlock();
        } else {
            // Fallback to old dialog
            const dialog = this.createSpeakerDialog();
            document.body.appendChild(dialog);
            
            // Focus on name input
            const nameInput = dialog.querySelector('#speakerNameInput');
            if (nameInput) {
                nameInput.focus();
            }
        }
    }
    
    // Add empty speaker block (for blocks system)
    addEmptySpeakerBlock() {
        if (window.speakersBlocks) {
            window.speakersBlocks.addEmptySpeakerBlock();
        }
    }

    // Create speaker dialog
    createSpeakerDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'speaker-dialog-overlay';
        dialog.innerHTML = `
            <div class="speaker-dialog">
                <div class="speaker-dialog-header">
                    <h3>הוסף דובר חדש</h3>
                    <button class="close-btn" onclick="window.speakersUI.closeSpeakerDialog()">×</button>
                </div>
                <div class="speaker-dialog-body">
                    <div class="form-group">
                        <label>שם הדובר:</label>
                        <input type="text" id="speakerNameInput" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>תפקיד (אופציונלי):</label>
                        <input type="text" id="speakerRoleInput" class="form-control">
                    </div>
                </div>
                <div class="speaker-dialog-footer">
                    <button class="btn btn-primary" onclick="window.speakersUI.confirmAddSpeaker()">הוסף</button>
                    <button class="btn btn-secondary" onclick="window.speakersUI.closeSpeakerDialog()">ביטול</button>
                </div>
            </div>
        `;
        return dialog;
    }

    // Confirm add speaker
    confirmAddSpeaker() {
        const nameInput = document.getElementById('speakerNameInput');
        const roleInput = document.getElementById('speakerRoleInput');
        
        if (nameInput && nameInput.value.trim()) {
            const name = nameInput.value.trim();
            const role = roleInput ? roleInput.value.trim() : '';
            
            if (window.speakersManager) {
                window.speakersManager.addSpeaker(name, role);
            }
            
            this.closeSpeakerDialog();
        } else {
            this.showMessage('נא להזין שם דובר', 'warning');
        }
    }

    // Close speaker dialog
    closeSpeakerDialog() {
        const dialog = document.querySelector('.speaker-dialog-overlay');
        if (dialog) {
            dialog.remove();
        }
    }

    // Show message
    showMessage(text, type = 'info') {
        // Use global message function if available
        if (window.showCustomAlert) {
            window.showCustomAlert(text, type === 'error' ? 'שגיאה' : type === 'success' ? 'הצלחה' : 'הודעה');
        } else if (window.showMessage) {
            window.showMessage(text, type);
        } else {
            console.log(`${type}: ${text}`);
        }
    }
}

// Create global instance
window.speakersUI = new SpeakersUI();