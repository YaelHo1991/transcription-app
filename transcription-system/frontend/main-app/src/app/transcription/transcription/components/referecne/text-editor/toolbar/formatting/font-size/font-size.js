/*
 * Font Size Module
 * toolbar/formatting/font-size/font-size.js
 */

(function() {
    console.log('[TextEditor] Font size module loaded');
    
    document.addEventListener('DOMContentLoaded', function() {
        const fontSizeSelect = document.getElementById('fontSize');
        
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', function(e) {
                const selectedSize = e.target.value;
                applyFontSize(selectedSize);
            });
        }
    });
    
    function applyFontSize(size) {
        console.log('[FontSize] Applying font size:', size);
        
        // Get the editor element
        const editor = document.getElementById('textEditor');
        if (!editor) return;
        
        // Apply to the entire editor for now
        editor.style.fontSize = size + 'px';
        
        // Also apply to all blocks
        const blocks = editor.querySelectorAll('.text-block');
        blocks.forEach(block => {
            block.style.fontSize = size + 'px';
        });
        
        // Update any text areas within blocks
        const textAreas = editor.querySelectorAll('.block-speaker, .block-text');
        textAreas.forEach(area => {
            area.style.fontSize = size + 'px';
        });
        
        // Store the current font size
        editor.dataset.currentFontSize = size;
        
        console.log('[FontSize] Font size applied to editor and all blocks');
    }
    
    // Export for external use
    window.TextEditorFontSize = {
        apply: applyFontSize
    };
})();
