/*
 * =========================================
 * Speakers Blocks System
 * js/speakers-blocks.js
 * =========================================
 * Three-block speaker management with text editor integration
 */

class SpeakersBlocks {
    constructor() {
        this.speakers = new Map(); // Map of code -> {name, description}
        this.blocksList = null;
        this.textareaElement = null;
    }

    init() {
        this.blocksList = document.getElementById('speakersBlocksList');
        this.textareaElement = document.querySelector('.speakers-list');
        
        if (this.blocksList && this.textareaElement) {
            // Parse existing speakers from textarea
            this.parseExistingSpeakers();
            
            // Set up text editor integration
            this.setupTextEditorIntegration();
        }
    }

    parseExistingSpeakers() {
        const text = this.textareaElement.value || '';
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && trimmedLine.startsWith('דובר')) {
                const match = trimmedLine.match(/דובר (\d+):\s*(.+)/);
                if (match) {
                    const number = parseInt(match[1]);
                    const nameAndRole = match[2];
                    const parts = nameAndRole.split(' - ');
                    const name = parts[0].trim();
                    const description = parts[1] ? parts[1].trim() : '';
                    
                    // Convert number to letter code (1->א, 2->ב, etc.)
                    const code = this.numberToHebrewLetter(number);
                    this.speakers.set(code, { name, description });
                }
            }
        });
        
        // Render blocks
        this.renderSpeakerBlocks();
    }

    numberToHebrewLetter(num) {
        const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
        if (num > 0 && num <= letters.length) {
            return letters[num - 1];
        }
        return num.toString(); // Fallback to number if out of range
    }

    hebrewLetterToNumber(letter) {
        const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
        const index = letters.indexOf(letter);
        return index >= 0 ? index + 1 : null;
    }

    renderSpeakerBlocks() {
        this.blocksList.innerHTML = '';
        
        // Always render existing speakers
        let isFirst = true;
        this.speakers.forEach((speaker, code) => {
            const block = this.createSpeakerBlock(code, speaker.name, speaker.description);
            if (isFirst) {
                block.style.borderTop = 'none !important';
                isFirst = false;
            }
            this.blocksList.appendChild(block);
        });
        
        // Always add an empty block at the end
        this.addEmptyBlock();
    }

    createSpeakerBlock(code = '', name = '', description = '') {
        const block = document.createElement('div');
        block.className = 'speaker-block';
        block.style.cssText = 'display: grid !important; grid-template-columns: 50px 1fr 1fr !important; gap: 8px !important; padding: 6px 20px !important; margin: 0 !important; background: white !important; border: 1px solid #e0e0e0 !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; box-sizing: border-box !important; width: 100% !important;';
        
        // Get speaker color from text editor if name exists
        let speakerColor = '#333'; // Default color
        if (name && window.textEditorBlocks && window.textEditorBlocks.speakerColors) {
            const colorIndex = window.textEditorBlocks.speakerColors[name];
            if (colorIndex !== undefined && window.textEditorBlocks.colorPalette) {
                speakerColor = window.textEditorBlocks.colorPalette[colorIndex];
            }
        }
        
        block.innerHTML = `
            <input type="text" class="speaker-code" value="${code}" maxlength="1" data-original-code="${code}" style="text-align: center !important; font-weight: 600 !important; border: 1px solid #ddd !important; padding: 4px !important; border-radius: 3px !important; font-size: 13px !important;">
            <input type="text" class="speaker-name" value="${name}" placeholder="שם הדובר" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;">
            <input type="text" class="speaker-desc" value="${description}" placeholder="תיאור / תפקיד" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;">
        `;
        
        // Add event listeners
        const codeInput = block.querySelector('.speaker-code');
        const nameInput = block.querySelector('.speaker-name');
        const descInput = block.querySelector('.speaker-desc');
        
        // Apply color after element creation
        if (speakerColor !== '#333') {
            codeInput.style.setProperty('color', speakerColor, 'important');
            codeInput.style.setProperty('font-weight', 'bold', 'important');
            nameInput.style.setProperty('color', speakerColor, 'important');
        } else if (code && window.textEditorBlocks && window.textEditorBlocks.speakerColors) {
            // Check if code has a color
            const codeColorIndex = window.textEditorBlocks.speakerColors[code];
            if (codeColorIndex !== undefined && window.textEditorBlocks.colorPalette) {
                const codeColor = window.textEditorBlocks.colorPalette[codeColorIndex];
                codeInput.style.setProperty('color', codeColor, 'important');
                codeInput.style.setProperty('font-weight', 'bold', 'important');
                nameInput.style.setProperty('color', codeColor, 'important');
            }
        }
        
        codeInput.addEventListener('blur', () => this.handleCodeChange(codeInput, nameInput, descInput));
        nameInput.addEventListener('blur', () => this.handleNameChange(codeInput, nameInput, descInput));
        descInput.addEventListener('blur', () => this.handleDescChange(codeInput, nameInput, descInput));
        
        // Use the global handler which includes all keyboard navigation
        codeInput.addEventListener('keydown', (e) => {
            if (window.handleSpeakerKeydown) {
                window.handleSpeakerKeydown(e, codeInput);
            }
        });
        
        nameInput.addEventListener('keydown', (e) => {
            if (window.handleSpeakerKeydown) {
                window.handleSpeakerKeydown(e, nameInput);
            }
        });
        
        descInput.addEventListener('keydown', (e) => {
            if (window.handleSpeakerKeydown) {
                window.handleSpeakerKeydown(e, descInput);
            }
        });
        
        return block;
    }

    handleCodeChange(codeInput, nameInput, descInput) {
        const newCode = codeInput.value.trim().toUpperCase();
        const originalCode = codeInput.dataset.originalCode;
        
        if (newCode && newCode !== originalCode) {
            // Check if new code already exists
            if (this.speakers.has(newCode)) {
                showCustomAlert('קוד זה כבר קיים', 'שגיאה');
                codeInput.value = originalCode;
                return;
            }
            
            // Update speaker map
            if (originalCode && this.speakers.has(originalCode)) {
                const speaker = this.speakers.get(originalCode);
                this.speakers.delete(originalCode);
                this.speakers.set(newCode, speaker);
            } else if (nameInput.value.trim() || descInput.value.trim()) {
                // Only add if there's a name or description
                this.speakers.set(newCode, {
                    name: nameInput.value,
                    description: descInput.value
                });
            }
            
            codeInput.dataset.originalCode = newCode;
            this.updateTextarea();
        }
    }

    handleNameChange(codeInput, nameInput, descInput) {
        const code = codeInput.value.trim();
        if (code) {
            this.speakers.set(code, {
                name: nameInput.value,
                description: descInput.value
            });
            this.updateTextarea();
            
            // Force text editor to refresh colors for this speaker
            if (window.textEditorBlocks && window.textEditorBlocks.refreshAllColors) {
                console.log('[SpeakersBlocks] Triggering text editor color refresh after name change');
                window.textEditorBlocks.refreshAllColors();
            }
            
            // Update color after name change
            setTimeout(() => {
                this.updateSpeakerColors();
            }, 100);
        }
    }

    handleDescChange(codeInput, nameInput, descInput) {
        const code = codeInput.value.trim();
        if (code) {
            this.speakers.set(code, {
                name: nameInput.value,
                description: descInput.value
            });
            this.updateTextarea();
        }
    }

    updateTextarea() {
        // Update hidden textarea for backward compatibility
        const lines = [];
        let number = 1;
        
        this.speakers.forEach((speaker, code) => {
            const num = this.hebrewLetterToNumber(code) || number;
            const line = speaker.description ? 
                `דובר ${num}: ${speaker.name} - ${speaker.description}` :
                `דובר ${num}: ${speaker.name}`;
            lines.push(line);
            number++;
        });
        
        this.textareaElement.value = lines.join('\n');
        
        // Trigger change event
        this.textareaElement.dispatchEvent(new Event('input'));
        
        // Update manager if available
        if (window.speakersManager) {
            window.speakersManager.parseSpeakers();
        }
    }

    addEmptyBlock() {
        // Find next available code
        const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
        let nextCode = '';
        
        for (const letter of letters) {
            if (!this.speakers.has(letter)) {
                nextCode = letter;
                break;
            }
        }
        
        const block = this.createSpeakerBlock(nextCode, '', '');
        this.blocksList.appendChild(block);
        
        // Focus on code input of new block
        const codeInput = block.querySelector('.speaker-code');
        if (codeInput) {
            codeInput.focus();
        }
    }
    
    addEmptySpeakerBlock() {
        // Alias for UI compatibility
        this.addEmptyBlock();
    }

    setupTextEditorIntegration() {
        // Listen for TAB key in text editor
        document.addEventListener('speakerTabRequest', (e) => {
            const code = e.detail.code.toUpperCase();
            const callback = e.detail.callback;
            
            if (this.speakers.has(code)) {
                // Return existing speaker name
                const speaker = this.speakers.get(code);
                callback(speaker.name);
            } else {
                // Auto-add new speaker with empty name
                this.speakers.set(code, { name: '', description: '' });
                this.renderSpeakerBlocks();
                this.updateTextarea();
                
                // Focus on the new speaker's name field
                setTimeout(() => {
                    const blocks = this.blocksList.querySelectorAll('.speaker-block');
                    for (const block of blocks) {
                        const codeInput = block.querySelector('.speaker-code');
                        if (codeInput.value === code) {
                            const nameInput = block.querySelector('.speaker-name');
                            nameInput.focus();
                            nameInput.style.border = '2px solid #28a745';
                            setTimeout(() => {
                                nameInput.style.border = '';
                            }, 2000);
                            break;
                        }
                    }
                }, 100);
                
                // Return empty name for now
                callback('');
            }
        });
    }

    // Get speaker by code (for text editor)
    getSpeakerByCode(code) {
        return this.speakers.get(code.toUpperCase());
    }
    
    // Update speaker colors to match text editor
    updateSpeakerColors() {
        console.log('[SpeakersBlocks] Updating speaker colors...');
        if (!window.textEditorBlocks || !window.textEditorBlocks.speakerColors) {
            console.log('[SpeakersBlocks] Text editor blocks not available');
            return;
        }
        
        console.log('[SpeakersBlocks] Speaker colors from text editor:', window.textEditorBlocks.speakerColors);
        console.log('[SpeakersBlocks] Color palette:', window.textEditorBlocks.colorPalette);
        
        const blocks = this.blocksList.querySelectorAll('.speaker-block');
        blocks.forEach(block => {
            const nameInput = block.querySelector('.speaker-name');
            const codeInput = block.querySelector('.speaker-code');
            if (nameInput && codeInput) {
                const name = nameInput.value.trim();
                const code = codeInput.value.trim();
                
                // Check both name and code for color match
                let colorIndex = undefined;
                let color = '#333';
                
                if (name) {
                    console.log('[SpeakersBlocks] Checking color for speaker name:', name);
                    colorIndex = window.textEditorBlocks.speakerColors[name];
                }
                
                // Also check if the code itself has a color (for single-letter speakers)
                if (colorIndex === undefined && code) {
                    console.log('[SpeakersBlocks] Checking color for speaker code:', code);
                    colorIndex = window.textEditorBlocks.speakerColors[code];
                }
                
                if (colorIndex !== undefined && window.textEditorBlocks.colorPalette) {
                    color = window.textEditorBlocks.colorPalette[colorIndex];
                    console.log('[SpeakersBlocks] Applying color:', color, 'to speaker:', name || code);
                } else {
                    console.log('[SpeakersBlocks] No color found for speaker:', name || code);
                }
                
                nameInput.style.setProperty('color', color, 'important');
                codeInput.style.setProperty('color', color, 'important');
                codeInput.style.setProperty('font-weight', 'bold', 'important');
            }
        });
    }
}

// Create global instance
window.speakersBlocks = new SpeakersBlocks();

// Listen for text editor color updates
document.addEventListener('speakerColorUpdated', () => {
    if (window.speakersBlocks) {
        window.speakersBlocks.updateSpeakerColors();
    }
});