<?php
/**
 * Speakers Panel
 * html/speakers-panel.php
 * 
 * Main speakers management interface
 */
?>

<div class="side-section speakers-section" style="display: flex !important; flex-direction: column !important; height: 100% !important; overflow: hidden !important; padding: 0 !important;">
    <div class="speakers-header-with-toolbar" style="display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 6px 16px !important; background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%) !important; border-bottom: 2px solid rgba(32, 201, 151, 0.3) !important; height: 32px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; margin: 0 !important; width: 100% !important; box-sizing: border-box !important;">
        <h3 style="margin: 0 !important; font-size: 13px !important; font-weight: 600 !important; color: white !important; text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;">דוברים</h3>
        <div style="display: flex !important; gap: 4px !important;">
            <button class="toolbar-btn" title="הוסף דובר" onclick="window.speakersBlocks.addEmptyBlock()" style="background: rgba(255,255,255,0.2) !important; border: none !important; width: 22px !important; height: 22px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; border-radius: 4px !important; transition: all 0.2s !important;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                <i class="fas fa-plus" style="font-size: 11px !important; color: white !important;"></i>
            </button>
        </div>
    </div>
    
    <div class="speakers-content" style="flex: 1 !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; overflow: hidden !important; padding: 0 !important;">
        <div class="speakers-list-container" style="flex: 1 !important; display: flex !important; flex-direction: column !important; min-height: 0 !important; overflow: hidden !important; padding: 0 !important;">
            <!-- Hidden textarea for backward compatibility -->
            <textarea 
                class="speakers-list speakers-textarea" 
                style="display: none;"
                dir="rtl"
            ></textarea>
            
            <!-- New three-block structure -->
            <div class="speakers-blocks-container" style="flex: 1 !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; width: 100% !important; margin: 0 !important;">
                <div class="speakers-blocks-header" style="display: grid !important; grid-template-columns: 50px 1fr 1fr !important; gap: 8px !important; padding: 8px 20px !important; background: linear-gradient(135deg, rgba(40, 167, 69, 0.3) 0%, rgba(32, 201, 151, 0.35) 50%, rgba(23, 162, 184, 0.3) 100%) !important; font-size: 11px !important; font-weight: 600 !important; box-sizing: border-box !important; color: white !important; text-shadow: 0 1px 2px rgba(0,0,0,0.1) !important; border-bottom: 1px solid rgba(32, 201, 151, 0.4) !important; width: 100% !important;">
                    <div style="text-align: center !important;">קוד</div>
                    <div style="text-align: right !important;">שם</div>
                    <div style="text-align: right !important;">תיאור</div>
                </div>
                <div class="speakers-blocks-list" id="speakersBlocksList" style="flex: 1 !important; overflow-y: auto !important; overflow-x: hidden !important; min-height: 100px !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 !important;">
                    <!-- Speaker blocks will be added here dynamically -->
                    <!-- Test block with event handlers -->
                    <div class="speaker-block" style="display: grid !important; grid-template-columns: 50px 1fr 1fr !important; gap: 8px !important; padding: 6px 20px !important; margin: 0 !important; background: white !important; border: 1px solid #e0e0e0 !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; box-sizing: border-box !important; width: 100% !important;">
                            <input type="text" class="speaker-code" value="" maxlength="1" style="text-align: center !important; font-weight: 600 !important; border: 1px solid #ddd !important; padding: 4px !important; border-radius: 3px !important; font-size: 13px !important; text-transform: uppercase !important;" onkeydown="handleSpeakerKeydown(event, this)">
                            <input type="text" class="speaker-name" placeholder="שם הדובר" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;" onkeydown="handleSpeakerKeydown(event, this)">
                            <input type="text" class="speaker-desc" placeholder="תיאור / תפקיד" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;" onkeydown="handleSpeakerKeydown(event, this)">
                        </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Global speakers map for integration
window.speakersMap = new Map();

// Track previous speaker names for updates
window.previousSpeakersMap = new Map();

// Update speakers map when values change
function updateSpeakersMap() {
    // Save previous state
    window.previousSpeakersMap = new Map(window.speakersMap);
    
    window.speakersMap.clear();
    const blocks = document.querySelectorAll('.speaker-block');
    blocks.forEach(block => {
        const code = block.querySelector('.speaker-code').value.trim().toUpperCase();
        const name = block.querySelector('.speaker-name').value.trim();
        const desc = block.querySelector('.speaker-desc').value.trim();
        
        if (code && name) {
            window.speakersMap.set(code, { name, description: desc });
        }
    });
    
    // Force speaker blocks color update
    if (window.speakersBlocks) {
        setTimeout(() => {
            window.speakersBlocks.updateSpeakerColors();
        }, 100);
    }
}

// Update speaker names in transcription when changed
function updateTranscriptionSpeakers() {
    if (!window.textEditor || !window.textEditor.blockEditor) return;
    
    const blocks = window.textEditor.blockEditor.blocks;
    let updated = false;
    
    blocks.forEach(block => {
        if (block.speaker && block.speaker.length === 1) {
            // This is a speaker code
            const code = block.speaker.toUpperCase();
            if (window.speakersMap.has(code)) {
                const newName = window.speakersMap.get(code).name;
                const oldName = window.previousSpeakersMap.get(code)?.name;
                
                if (newName && newName !== oldName) {
                    // Update the speaker name in the block
                    block.speaker = newName;
                    const speakerElement = block.element.querySelector('.block-speaker');
                    if (speakerElement) {
                        speakerElement.textContent = newName;
                    }
                    updated = true;
                }
            }
        } else if (block.speaker) {
            // This might be a full name - check if it matches any previous name
            window.previousSpeakersMap.forEach((oldSpeaker, code) => {
                if (oldSpeaker.name === block.speaker && window.speakersMap.has(code)) {
                    const newName = window.speakersMap.get(code).name;
                    if (newName !== oldSpeaker.name) {
                        // Update the speaker name
                        block.speaker = newName;
                        const speakerElement = block.element.querySelector('.block-speaker');
                        if (speakerElement) {
                            speakerElement.textContent = newName;
                        }
                        updated = true;
                    }
                }
            });
        }
    });
    
    if (updated && window.textEditor.blockEditor.updateBlockData) {
        window.textEditor.blockEditor.updateBlockData();
    }
}

// Check for duplicate codes
function validateSpeakerCode(input) {
    const code = input.value.trim().toUpperCase();
    if (!code) return true;
    
    const blocks = document.querySelectorAll('.speaker-block');
    let duplicateFound = false;
    
    blocks.forEach(block => {
        const codeInput = block.querySelector('.speaker-code');
        if (codeInput !== input && codeInput.value.trim().toUpperCase() === code) {
            duplicateFound = true;
        }
    });
    
    if (duplicateFound) {
        input.style.borderColor = '#ef4444';
        input.style.backgroundColor = '#fee2e2';
        // Use custom modal
        showSpeakerCustomAlert(`הקוד "${code}" כבר בשימוש. אנא בחר קוד אחר.`, 'שגיאה');
        input.value = input.dataset.previousValue || '';
        return false;
    } else {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
        input.dataset.previousValue = code;
        return true;
    }
}

// Inline handler for Enter key
function handleSpeakerKeydown(event, input) {
    // Validate code on any change
    if (input.classList.contains('speaker-code')) {
        setTimeout(() => {
            if (validateSpeakerCode(input)) {
                updateSpeakersMap();
                updateTranscriptionSpeakers();
            }
        }, 50);
    }
    
    const block = input.closest('.speaker-block');
    const blocksList = document.getElementById('speakersBlocksList');
    const blocks = Array.from(blocksList.querySelectorAll('.speaker-block'));
    const currentIndex = blocks.indexOf(block);
    
    // TAB - Move to next field
    if (event.key === 'Tab' && !event.shiftKey) {
        const inputs = Array.from(block.querySelectorAll('input'));
        const inputIndex = inputs.indexOf(input);
        
        if (inputIndex === inputs.length - 1) {
            // Last input in block, move to next block
            event.preventDefault();
            if (currentIndex < blocks.length - 1) {
                const nextBlock = blocks[currentIndex + 1];
                const firstInput = nextBlock.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        }
    }
    
    // SHIFT+TAB - Move to previous field
    else if (event.key === 'Tab' && event.shiftKey) {
        const inputs = Array.from(block.querySelectorAll('input'));
        const inputIndex = inputs.indexOf(input);
        
        if (inputIndex === 0) {
            // First input in block, move to previous block
            event.preventDefault();
            if (currentIndex > 0) {
                const prevBlock = blocks[currentIndex - 1];
                const lastInput = prevBlock.querySelectorAll('input')[2];
                if (lastInput) lastInput.focus();
            }
        }
    }
    
    // BACKSPACE - Delete block if empty and move to previous
    else if (event.key === 'Backspace') {
        const inputs = Array.from(block.querySelectorAll('input'));
        const allEmpty = inputs.every(inp => !inp.value.trim());
        const cursorAtStart = input.selectionStart === 0;
        
        if (allEmpty && blocks.length > 1) {
            event.preventDefault();
            
            // Move to previous block
            if (currentIndex > 0) {
                const prevBlock = blocks[currentIndex - 1];
                const targetInput = prevBlock.querySelector('.speaker-' + input.className.split('-')[1]);
                if (targetInput) {
                    targetInput.focus();
                    // Place cursor at end
                    targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length);
                }
            }
            
            // Remove current block
            block.remove();
            updateSpeakersMap();
            updateTranscriptionSpeakers();
        } else if (cursorAtStart && input.classList.contains('speaker-name')) {
            // At start of name field, move to code field
            event.preventDefault();
            const codeInput = block.querySelector('.speaker-code');
            if (codeInput) {
                codeInput.focus();
                codeInput.setSelectionRange(codeInput.value.length, codeInput.value.length);
            }
        } else if (cursorAtStart && input.classList.contains('speaker-desc')) {
            // At start of desc field, move to name field
            event.preventDefault();
            const nameInput = block.querySelector('.speaker-name');
            if (nameInput) {
                nameInput.focus();
                nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
            }
        }
    }
    
    // Arrow keys navigation
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentIndex > 0) {
            const prevBlock = blocks[currentIndex - 1];
            const targetInput = prevBlock.querySelector('.speaker-' + input.className.split('-')[1]);
            if (targetInput) targetInput.focus();
        }
    }
    else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (currentIndex < blocks.length - 1) {
            const nextBlock = blocks[currentIndex + 1];
            const targetInput = nextBlock.querySelector('.speaker-' + input.className.split('-')[1]);
            if (targetInput) targetInput.focus();
        }
    }
    else if (event.key === 'ArrowRight' && input.selectionStart === input.value.length) {
        const inputs = Array.from(block.querySelectorAll('input'));
        const inputIndex = inputs.indexOf(input);
        if (inputIndex < inputs.length - 1) {
            event.preventDefault();
            inputs[inputIndex + 1].focus();
            inputs[inputIndex + 1].setSelectionRange(0, 0);
        }
    }
    else if (event.key === 'ArrowLeft' && input.selectionStart === 0) {
        const inputs = Array.from(block.querySelectorAll('input'));
        const inputIndex = inputs.indexOf(input);
        if (inputIndex > 0) {
            event.preventDefault();
            inputs[inputIndex - 1].focus();
            const prevInput = inputs[inputIndex - 1];
            prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
        }
    }
    
    // ENTER - Create new block
    else if (event.key === 'Enter') {
        event.preventDefault();
        
        const isLastBlock = block === blocks[blocks.length - 1];
        
        if (isLastBlock) {
            // Update speakers map first
            updateSpeakersMap();
            
            // Create new block
            const newBlock = block.cloneNode(true);
            newBlock.style.borderTop = '1px solid #e0e0e0 !important';
            
            // Clear values in new block
            const inputs = newBlock.querySelectorAll('input');
            inputs.forEach(inp => {
                inp.value = '';
                inp.dataset.previousValue = '';
                if (inp.classList.contains('speaker-code')) {
                    // Find next available letter
                    const usedCodes = blocks.map(b => b.querySelector('.speaker-code').value.toUpperCase()).filter(v => v);
                    const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
                    for (let letter of letters) {
                        if (!usedCodes.includes(letter)) {
                            inp.value = letter;
                            inp.dataset.previousValue = letter;
                            break;
                        }
                    }
                }
            });
            
            blocksList.appendChild(newBlock);
            
            // Focus on the code input of new block
            const codeInput = newBlock.querySelector('.speaker-code');
            if (codeInput) {
                codeInput.focus();
            }
        } else {
            // Not last block, move to next block's first input
            const nextBlock = blocks[currentIndex + 1];
            const firstInput = nextBlock.querySelector('.speaker-code');
            if (firstInput) firstInput.focus();
        }
    }
    
    // Update speakers map and transcription on any change
    setTimeout(() => {
        updateSpeakersMap();
        updateTranscriptionSpeakers();
    }, 100);
}

// Listen for speaker tab requests from text editor
document.addEventListener('speakerTabRequest', (e) => {
    const code = e.detail.code.toUpperCase();
    const callback = e.detail.callback;
    
    // Update speakers map first
    updateSpeakersMap();
    
    if (window.speakersMap.has(code)) {
        const speaker = window.speakersMap.get(code);
        callback(speaker.name);
    } else {
        // Auto-add new speaker
        const blocksList = document.getElementById('speakersBlocksList');
        const blocks = blocksList.querySelectorAll('.speaker-block');
        const lastBlock = blocks[blocks.length - 1];
        
        // Check if last block is empty, if not create new one
        const lastCode = lastBlock.querySelector('.speaker-code').value.trim();
        if (lastCode) {
            // Create new block
            const newBlock = lastBlock.cloneNode(true);
            newBlock.style.borderTop = '1px solid #e0e0e0 !important';
            const inputs = newBlock.querySelectorAll('input');
            inputs.forEach(inp => inp.value = '');
            newBlock.querySelector('.speaker-code').value = code;
            blocksList.appendChild(newBlock);
            
            // Focus on name input
            const nameInput = newBlock.querySelector('.speaker-name');
            nameInput.focus();
            nameInput.style.border = '2px solid #28a745';
            setTimeout(() => {
                nameInput.style.border = '1px solid #ddd';
            }, 2000);
        } else {
            // Use existing empty block
            lastBlock.querySelector('.speaker-code').value = code;
            const nameInput = lastBlock.querySelector('.speaker-name');
            nameInput.focus();
            nameInput.style.border = '2px solid #28a745';
            setTimeout(() => {
                nameInput.style.border = '1px solid #ddd';
            }, 2000);
        }
        
        callback('');
    }
});

// Initialize on load
setTimeout(updateSpeakersMap, 500);

// Listen for text editor ready
document.addEventListener('textEditorReady', () => {
    console.log('[Speakers Panel] Text editor ready, updating colors');
    if (window.speakersBlocks) {
        window.speakersBlocks.updateSpeakerColors();
    }
});

// Also try to update colors periodically until text editor is available
let colorUpdateAttempts = 0;
const tryColorUpdate = setInterval(() => {
    colorUpdateAttempts++;
    if (window.textEditorBlocks && window.speakersBlocks) {
        console.log('[Speakers Panel] Text editor blocks found, updating colors');
        window.speakersBlocks.updateSpeakerColors();
        clearInterval(tryColorUpdate);
    } else if (colorUpdateAttempts > 20) {
        console.log('[Speakers Panel] Giving up on color update after 20 attempts');
        clearInterval(tryColorUpdate);
    }
}, 500);

// Add new speaker with specific code
window.addNewSpeakerWithCode = function(code) {
    const blocksList = document.getElementById('speakersBlocksList');
    const blocks = blocksList.querySelectorAll('.speaker-block');
    
    // Check if code already exists
    for (let block of blocks) {
        const codeInput = block.querySelector('.speaker-code');
        if (codeInput.value.trim().toUpperCase() === code.toUpperCase()) {
            // Code already exists, focus on name field
            const nameInput = block.querySelector('.speaker-name');
            if (nameInput && !nameInput.value.trim()) {
                nameInput.focus();
                nameInput.style.border = '2px solid #28a745';
                setTimeout(() => {
                    nameInput.style.border = '1px solid #ddd';
                }, 2000);
            }
            return;
        }
    }
    
    // Find empty block or create new one
    let targetBlock = null;
    const lastBlock = blocks[blocks.length - 1];
    
    if (lastBlock) {
        const lastCode = lastBlock.querySelector('.speaker-code').value.trim();
        const lastName = lastBlock.querySelector('.speaker-name').value.trim();
        
        if (!lastCode && !lastName) {
            // Use existing empty block
            targetBlock = lastBlock;
        }
    }
    
    if (!targetBlock) {
        // Create new block
        targetBlock = document.createElement('div');
        targetBlock.className = 'speaker-block';
        targetBlock.style.cssText = 'display: grid !important; grid-template-columns: 50px 1fr 1fr !important; gap: 8px !important; padding: 6px 20px !important; margin: 0 !important; background: white !important; border: 1px solid #e0e0e0 !important; border-left: none !important; border-right: none !important; border-radius: 0 !important; box-sizing: border-box !important; width: 100% !important;';
        targetBlock.innerHTML = `
            <input type="text" class="speaker-code" value="" maxlength="1" style="text-align: center !important; font-weight: 600 !important; border: 1px solid #ddd !important; padding: 4px !important; border-radius: 3px !important; font-size: 13px !important; text-transform: uppercase !important;" onkeydown="handleSpeakerKeydown(event, this)">
            <input type="text" class="speaker-name" placeholder="שם הדובר" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;" onkeydown="handleSpeakerKeydown(event, this)">
            <input type="text" class="speaker-desc" placeholder="תיאור / תפקיד" style="direction: rtl !important; text-align: right !important; border: 1px solid #ddd !important; padding: 4px 8px !important; border-radius: 3px !important; font-size: 13px !important;" onkeydown="handleSpeakerKeydown(event, this)">
        `;
        blocksList.appendChild(targetBlock);
    }
    
    // Set the code and focus on name
    const codeInput = targetBlock.querySelector('.speaker-code');
    const nameInput = targetBlock.querySelector('.speaker-name');
    
    codeInput.value = code.toUpperCase();
    codeInput.dataset.previousValue = code.toUpperCase();
    
    nameInput.focus();
    nameInput.style.border = '2px solid #28a745';
    setTimeout(() => {
        nameInput.style.border = '1px solid #ddd';
    }, 2000);
    
    // Update speakers map
    updateSpeakersMap();
};

// Custom modal functions for speakers
function showSpeakerCustomAlert(message, title = 'הודעה') {
    const modal = createSpeakerCustomModal();
    const titleEl = modal.querySelector('.custom-modal-title');
    const textEl = modal.querySelector('.custom-modal-text');
    const buttonsEl = modal.querySelector('.custom-modal-buttons');
    
    titleEl.textContent = title;
    textEl.textContent = message;
    buttonsEl.innerHTML = `
        <button onclick="closeSpeakerCustomModal()" style="padding: 10px 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; border: none; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(32, 201, 151, 0.3);">
            אישור
        </button>
    `;
    
    document.body.appendChild(modal);
}

function createSpeakerCustomModal() {
    const modal = document.createElement('div');
    modal.className = 'speaker-custom-message-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; width: 90%; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
            <div class="modal-header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%); color: white; padding: 20px; border: none;">
                <h3 class="custom-modal-title" style="margin: 0; font-size: 18px; font-weight: 600;"></h3>
            </div>
            <div class="modal-body" style="background: white; padding: 30px; text-align: center;">
                <p class="custom-modal-text" style="margin: 0; font-size: 16px; color: #333; line-height: 1.5;"></p>
            </div>
            <div class="modal-footer" style="background: #f8f9fa; padding: 20px; display: flex; justify-content: center; gap: 10px; border: none;">
                <div class="custom-modal-buttons"></div>
            </div>
        </div>
    `;
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeSpeakerCustomModal();
        }
    });
    
    return modal;
}

window.closeSpeakerCustomModal = function() {
    const modal = document.querySelector('.speaker-custom-message-modal');
    if (modal) {
        modal.remove();
    }
};

// Test function for debugging
window.testSpeakerTransform = function(code) {
    updateSpeakersMap();
    if (window.speakersMap.has(code.toUpperCase())) {
        const speaker = window.speakersMap.get(code.toUpperCase());
        console.log('Speaker found:', code, '->', speaker.name);
        return speaker.name;
    } else {
        console.log('Speaker not found:', code);
        return null;
    }
};
</script>