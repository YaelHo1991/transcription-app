/*
 * =========================================
 * Speakers Manager
 * js/speakers-manager.js
 * =========================================
 * Core speaker management functionality
 */

class SpeakersManager {
    constructor() {
        this.speakersTextarea = null;
        this.speakers = [];
        this.currentProjectId = null;
        this.hasUnsavedChanges = false;
    }

    // Initialize speakers manager
    init(projectId = null) {
        this.currentProjectId = projectId;
        this.speakersTextarea = document.querySelector('.speakers-list');
        
        if (this.speakersTextarea) {
            this.setupEventListeners();
            this.parseSpeakers();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        this.speakersTextarea.addEventListener('input', () => {
            this.hasUnsavedChanges = true;
            this.parseSpeakers();
        });
    }

    // Parse speakers from textarea
    parseSpeakers() {
        const text = this.speakersTextarea.value || '';
        const lines = text.split('\n');
        this.speakers = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && trimmedLine.startsWith('דובר')) {
                const match = trimmedLine.match(/דובר (\d+):\s*(.+)/);
                if (match) {
                    const number = parseInt(match[1]);
                    const nameAndRole = match[2];
                    const parts = nameAndRole.split(' - ');
                    const name = parts[0].trim();
                    const role = parts[1] ? parts[1].trim() : '';
                    
                    this.speakers.push({
                        number: number,
                        name: name,
                        role: role,
                        fullLine: trimmedLine
                    });
                }
            }
        });

        // Update any UI elements that depend on speakers
        if (window.speakersUI) {
            window.speakersUI.updateSpeakersList(this.speakers);
        }
    }

    // Get all speakers
    getSpeakers() {
        return this.speakers;
    }

    // Get speaker by number
    getSpeakerByNumber(number) {
        return this.speakers.find(s => s.number === number);
    }

    // Get speaker display name
    getSpeakerDisplayName(number) {
        const speaker = this.getSpeakerByNumber(number);
        if (speaker) {
            return speaker.role ? `${speaker.name} - ${speaker.role}` : speaker.name;
        }
        return `דובר ${number}`;
    }

    // Add new speaker
    addSpeaker(name, role = '') {
        const maxNumber = Math.max(0, ...this.speakers.map(s => s.number));
        const newNumber = maxNumber + 1;
        const newLine = role ? 
            `דובר ${newNumber}: ${name} - ${role}` : 
            `דובר ${newNumber}: ${name}`;
        
        // Add to textarea
        if (this.speakersTextarea.value) {
            this.speakersTextarea.value += '\n' + newLine;
        } else {
            this.speakersTextarea.value = newLine;
        }
        
        // Trigger input event to update speakers list
        this.speakersTextarea.dispatchEvent(new Event('input'));
        return newNumber;
    }

    // Update speaker
    updateSpeaker(number, name, role = '') {
        const lines = this.speakersTextarea.value.split('\n');
        const newLine = role ? 
            `דובר ${number}: ${name} - ${role}` : 
            `דובר ${number}: ${name}`;
        
        const updatedLines = lines.map(line => {
            if (line.trim().startsWith(`דובר ${number}:`)) {
                return newLine;
            }
            return line;
        });
        
        this.speakersTextarea.value = updatedLines.join('\n');
        this.speakersTextarea.dispatchEvent(new Event('input'));
    }

    // Remove speaker
    removeSpeaker(number) {
        const lines = this.speakersTextarea.value.split('\n');
        const filteredLines = lines.filter(line => {
            return !line.trim().startsWith(`דובר ${number}:`);
        });
        
        this.speakersTextarea.value = filteredLines.join('\n');
        this.speakersTextarea.dispatchEvent(new Event('input'));
    }

    // Check if has unsaved changes
    hasChanges() {
        return this.hasUnsavedChanges;
    }

    // Mark changes as saved
    markAsSaved() {
        this.hasUnsavedChanges = false;
    }

    // Get speakers text
    getSpeakersText() {
        return this.speakersTextarea.value;
    }

    // Set speakers text
    setSpeakersText(text) {
        this.speakersTextarea.value = text;
        this.parseSpeakers();
    }
}

// Create global instance
window.speakersManager = new SpeakersManager();