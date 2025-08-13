/*
 * Text Alignment Module
 * toolbar/formatting/text-align/text-align.js
 */

(function() {
    console.log('[TextEditor] Text align module loaded');
    
    document.addEventListener('DOMContentLoaded', function() {
        const alignRightBtn = document.getElementById('alignRightBtn');
        const alignCenterBtn = document.getElementById('alignCenterBtn');
        const alignLeftBtn = document.getElementById('alignLeftBtn');
        
        if (alignRightBtn) {
            alignRightBtn.addEventListener('click', function() {
                applyAlignment('right');
            });
        }
        
        if (alignCenterBtn) {
            alignCenterBtn.addEventListener('click', function() {
                applyAlignment('center');
            });
        }
        
        if (alignLeftBtn) {
            alignLeftBtn.addEventListener('click', function() {
                applyAlignment('left');
            });
        }
        
        // Listen for selection changes to update button states
        document.addEventListener('selectionchange', updateAlignmentState);
    });
    
    function applyAlignment(alignment) {
        let command;
        switch(alignment) {
            case 'left':
                command = 'justifyLeft';
                break;
            case 'center':
                command = 'justifyCenter';
                break;
            case 'right':
                command = 'justifyRight';
                break;
            default:
                return;
        }
        
        document.execCommand(command, false, null);
        updateAlignmentState();
    }
    
    function updateAlignmentState() {
        const alignRightBtn = document.getElementById('alignRightBtn');
        const alignCenterBtn = document.getElementById('alignCenterBtn');
        const alignLeftBtn = document.getElementById('alignLeftBtn');
        
        // Remove active class from all buttons
        [alignRightBtn, alignCenterBtn, alignLeftBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Check current alignment and set active button
        if (document.queryCommandState('justifyRight')) {
            if (alignRightBtn) alignRightBtn.classList.add('active');
        } else if (document.queryCommandState('justifyCenter')) {
            if (alignCenterBtn) alignCenterBtn.classList.add('active');
        } else if (document.queryCommandState('justifyLeft')) {
            if (alignLeftBtn) alignLeftBtn.classList.add('active');
        } else {
            // Default to right alignment for RTL
            if (alignRightBtn) alignRightBtn.classList.add('active');
        }
    }
    
    // Export for external use
    window.TextEditorAlignment = {
        alignLeft: () => applyAlignment('left'),
        alignCenter: () => applyAlignment('center'),
        alignRight: () => applyAlignment('right'),
        updateState: updateAlignmentState
    };
})();
