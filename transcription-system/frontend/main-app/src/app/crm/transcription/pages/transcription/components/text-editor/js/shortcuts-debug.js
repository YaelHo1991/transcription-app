/*
 * Shortcuts Debug Tool
 * js/shortcuts-debug.js
 */

window.debugShortcuts = function() {
    console.log('=== SHORTCUTS SYSTEM DEBUG ===');
    
    // Check if shortcuts manager is loaded
    console.log('1. TextEditorShortcuts loaded:', !!window.TextEditorShortcuts);
    
    if (window.TextEditorShortcuts) {
        // Get all shortcuts
        const shortcuts = window.TextEditorShortcuts.getAll();
        console.log('2. Current shortcuts:', shortcuts);
        
        // Test variations generation
        const testVariations = window.TextEditorShortcuts.generateVariations("ע'ד", "עורך דין");
        console.log('3. Test variations for ע\'ד:', testVariations);
    }
    
    // Check button
    const btn = document.getElementById('textShortcutsBtn');
    console.log('4. Shortcuts button exists:', !!btn);
    if (btn) {
        console.log('   - Button text:', btn.textContent);
        console.log('   - Button onclick:', btn.onclick);
        console.log('   - Event listeners:', btn._listeners || 'Cannot access');
        
        // Simulate click - DISABLED
        // console.log('5. Simulating button click...');
        // btn.click();
    }
    
    // Check modal
    setTimeout(() => {
        const modal = document.getElementById('shortcutsModal');
        console.log('6. Modal exists:', !!modal);
        if (modal) {
            console.log('   - Modal classes:', modal.className);
            console.log('   - Modal style display:', modal.style.display);
            console.log('   - Modal computed display:', window.getComputedStyle(modal).display);
            console.log('   - Modal innerHTML length:', modal.innerHTML.length);
            
            // Check modal content
            const modalContent = modal.querySelector('.modal-content');
            console.log('7. Modal content exists:', !!modalContent);
            
            const shortcutsList = modal.querySelector('.shortcuts-list');
            console.log('8. Shortcuts list exists:', !!shortcutsList);
            if (shortcutsList) {
                console.log('   - List children:', shortcutsList.children.length);
            }
        }
    }, 500);
    
    // Test text replacement
    console.log('9. Testing text replacement...');
    const editor = document.getElementById('textEditor');
    if (editor && window.TextEditorShortcuts) {
        const originalText = editor.innerText;
        editor.innerText = 'בדיקה: ע\'ד ';
        editor.focus();
        
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Simulate space key
        const event = new KeyboardEvent('keyup', {
            key: ' ',
            code: 'Space',
            bubbles: true
        });
        editor.dispatchEvent(event);
        
        console.log('   - Text before:', 'בדיקה: ע\'ד ');
        console.log('   - Text after:', editor.innerText);
        console.log('   - Replacement successful:', editor.innerText.includes('עורך דין'));
        
        // Restore original text
        editor.innerText = originalText;
    }
    
    console.log('=== END DEBUG ===');
};

// Auto-run debug after 3 seconds - DISABLED
// setTimeout(() => {
//     console.log('Running auto-debug...');
//     window.debugShortcuts();
// }, 3000);