/*
 * Auto-Detect Textarea Bridge
 * Creates a hidden textarea that mirrors the block editor content
 */

(function() {
    console.log('[Textarea Bridge] Initializing bridge for auto-detect...');
    
    let bridge = null;
    let editor = null;
    
    function createBridge() {
        // Get the editor
        editor = document.getElementById('textEditor');
        if (!editor) {
            setTimeout(createBridge, 500);
            return;
        }
        
        // Create a hidden textarea with ID that auto-detect expects
        bridge = document.createElement('textarea');
        bridge.id = 'transcriptionText';
        bridge.style.position = 'absolute';
        bridge.style.left = '-9999px';
        bridge.style.width = '1px';
        bridge.style.height = '1px';
        document.body.appendChild(bridge);
        
        console.log('[Textarea Bridge] Hidden textarea created');
        
        // Update textarea whenever blocks change
        editor.addEventListener('input', function(e) {
            if (e.target.classList.contains('block-speaker') || 
                e.target.classList.contains('block-text')) {
                updateBridge();
            }
        });
        
        // Initial update
        updateBridge();
        
        // Patch auto-detect to use our bridge
        patchAutoDetect();
    }
    
    function updateBridge() {
        if (!bridge || !editor) return;
        
        // Get all text from blocks
        let text = '';
        const blocks = editor.querySelectorAll('.text-block');
        blocks.forEach(block => {
            const speaker = block.querySelector('.block-speaker');
            const content = block.querySelector('.block-text');
            if (speaker && speaker.textContent) {
                text += speaker.textContent + ': ';
            }
            if (content && content.textContent) {
                text += content.textContent;
            }
            text += '\n';
        });
        
        // Update bridge textarea
        const oldValue = bridge.value;
        bridge.value = text;
        
        // If text changed, trigger input event
        if (oldValue !== text) {
            const event = new Event('input', { bubbles: true });
            bridge.dispatchEvent(event);
            console.log('[Textarea Bridge] Updated bridge, length:', text.length);
        }
    }
    
    function patchAutoDetect() {
        let attempts = 0;
        
        function tryPatch() {
            attempts++;
            
            // Check if auto-detect exists
            if (window.autoDetectRegular || window.autoDetectEnhanced) {
                // Force them to use our bridge textarea
                if (window.autoDetectRegular) {
                    window.autoDetectRegular.textEditor = bridge;
                    console.log('[Textarea Bridge] Patched regular mode to use bridge');
                }
                if (window.autoDetectEnhanced) {
                    window.autoDetectEnhanced.textEditor = bridge;
                    console.log('[Textarea Bridge] Patched enhanced mode to use bridge');
                }
                
                // Re-setup event listeners
                if (window.autoDetectRegular && window.autoDetectRegular.setupEventListeners) {
                    window.autoDetectRegular.setupEventListeners();
                }
                if (window.autoDetectEnhanced && window.autoDetectEnhanced.setupEventListeners) {
                    window.autoDetectEnhanced.setupEventListeners();
                }
                
                console.log('[Textarea Bridge] Auto-detect patched successfully');
            } else if (attempts < 20) {
                setTimeout(tryPatch, 500);
            }
        }
        
        tryPatch();
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBridge);
    } else {
        createBridge();
    }
})();