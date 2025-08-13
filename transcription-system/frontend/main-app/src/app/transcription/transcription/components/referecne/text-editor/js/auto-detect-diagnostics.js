/*
 * Auto-Detect Diagnostics
 * Quick diagnostic to see what's happening
 */

console.log('=== AUTO-DETECT DIAGNOSTICS ===');

// Check every 500ms for 5 seconds
let checkCount = 0;
const diagInterval = setInterval(() => {
    checkCount++;
    console.log(`\n--- Check #${checkCount} ---`);
    
    // 1. Check if editor exists
    const editor = document.getElementById('textEditor');
    console.log('1. Editor element exists:', !!editor);
    
    if (editor) {
        console.log('   - Editor tagName:', editor.tagName);
        console.log('   - Editor has .value:', 'value' in editor);
        console.log('   - Editor .value type:', typeof editor.value);
        console.log('   - Editor innerText length:', editor.innerText?.length || 0);
    }
    
    // 2. Check if auto-detect exists
    console.log('2. Auto-detect Regular exists:', !!window.autoDetectRegular);
    console.log('   Auto-detect Enhanced exists:', !!window.autoDetectEnhanced);
    
    // 3. Check auto-detect setup
    if (window.autoDetectRegular) {
        console.log('3. Regular mode:');
        console.log('   - enabled:', window.autoDetectRegular.enabled);
        console.log('   - textEditor:', !!window.autoDetectRegular.textEditor);
        console.log('   - textEditor ID:', window.autoDetectRegular.textEditor?.id);
        console.log('   - mediaPlayer:', !!window.autoDetectRegular.mediaPlayer);
    }
    
    // 4. Try to find what element auto-detect is actually using
    const transcriptionText = document.getElementById('transcriptionText');
    console.log('4. transcriptionText element exists:', !!transcriptionText);
    
    // 5. Check event listeners
    if (editor) {
        // Create a test input event
        const testEvent = new Event('input', { bubbles: true });
        
        // Add temporary listener to see if events reach the editor
        const tempHandler = (e) => {
            console.log('5. TEST: Input event received on editor!');
            editor.removeEventListener('input', tempHandler);
        };
        editor.addEventListener('input', tempHandler);
        
        // Dispatch test event
        editor.dispatchEvent(testEvent);
    }
    
    if (checkCount >= 10) {
        clearInterval(diagInterval);
        console.log('\n=== DIAGNOSTICS COMPLETE ===');
    }
}, 500);