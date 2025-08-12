// Simple test to see if auto-detect is working
console.log('=== SIMPLE AUTO-DETECT TEST ===');

setTimeout(() => {
    console.log('\nChecking auto-detect status:');
    console.log('- autoDetectRegular exists:', !!window.autoDetectRegular);
    console.log('- autoDetectEnhanced exists:', !!window.autoDetectEnhanced);
    
    if (window.autoDetectRegular) {
        console.log('- Regular enabled:', window.autoDetectRegular.enabled);
        console.log('- Regular textEditor:', window.autoDetectRegular.textEditor);
        console.log('- Regular handleTyping:', typeof window.autoDetectRegular.handleTyping);
        
        // Try to manually trigger typing
        console.log('\nManually triggering handleTyping...');
        try {
            window.autoDetectRegular.handleTyping();
            console.log('- handleTyping called successfully');
        } catch (e) {
            console.error('- handleTyping error:', e);
        }
    }
    
    // Check the editor
    const editor = document.getElementById('textEditor');
    console.log('\nEditor check:');
    console.log('- Editor exists:', !!editor);
    console.log('- Editor.value:', editor?.value);
    
    // Check for control UI
    const controlUI = document.querySelector('.auto-detect-control');
    console.log('\nControl UI exists:', !!controlUI);
    
}, 2000);