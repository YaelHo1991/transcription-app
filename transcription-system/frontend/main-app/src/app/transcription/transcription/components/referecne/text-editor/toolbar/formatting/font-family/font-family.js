/*
 * Font Family Module
 * toolbar/formatting/font-family/font-family.js
 */

(function() {
    console.log('[TextEditor] Font family module loaded');
    
    document.addEventListener('DOMContentLoaded', function() {
        const fontFamilySelect = document.getElementById('fontFamily');
        
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', function(e) {
                const selectedFont = e.target.value;
                applyFontFamily(selectedFont);
            });
        }
    });
    
    function applyFontFamily(fontFamily) {
        console.log('[FontFamily] Applying font family:', fontFamily);
        
        // Get the editor element
        const editor = document.getElementById('textEditor');
        if (!editor) return;
        
        // Apply to the entire editor
        editor.style.fontFamily = fontFamily;
        
        // Also apply to all blocks
        const blocks = editor.querySelectorAll('.text-block');
        blocks.forEach(block => {
            block.style.fontFamily = fontFamily;
        });
        
        // Update any text areas within blocks
        const textAreas = editor.querySelectorAll('.block-speaker, .block-text');
        textAreas.forEach(area => {
            area.style.fontFamily = fontFamily;
        });
        
        // Store the current font family
        editor.dataset.currentFontFamily = fontFamily;
        
        console.log('[FontFamily] Font family applied to editor and all blocks');
    }
    
    // Export for external use
    window.TextEditorFontFamily = {
        apply: applyFontFamily
    };
})();
