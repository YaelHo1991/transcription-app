/*
 * Text Style Module (Bold, Italic, Underline)
 * toolbar/formatting/text-style/text-style.js
 */

(function() {
    console.log('[TextEditor] Text style module loaded');
    
    document.addEventListener('DOMContentLoaded', function() {
        // Bold button
        const boldBtn = document.getElementById('boldBtn');
        if (boldBtn) {
            boldBtn.addEventListener('click', function() {
                document.execCommand('bold', false, null);
                updateButtonState();
            });
        }
        
        // Italic button
        const italicBtn = document.getElementById('italicBtn');
        if (italicBtn) {
            italicBtn.addEventListener('click', function() {
                document.execCommand('italic', false, null);
                updateButtonState();
            });
        }
        
        // Underline button
        const underlineBtn = document.getElementById('underlineBtn');
        if (underlineBtn) {
            underlineBtn.addEventListener('click', function() {
                document.execCommand('underline', false, null);
                updateButtonState();
            });
        }
        
        // Listen for selection changes to update button states
        document.addEventListener('selectionchange', updateButtonState);
        
        // Keyboard shortcuts
        document.getElementById('textEditor').addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold', false, null);
                        updateButtonState();
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic', false, null);
                        updateButtonState();
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline', false, null);
                        updateButtonState();
                        break;
                }
            }
        });
    });
    
    function updateButtonState() {
        const boldBtn = document.getElementById('boldBtn');
        const italicBtn = document.getElementById('italicBtn');
        const underlineBtn = document.getElementById('underlineBtn');
        
        if (boldBtn) {
            if (document.queryCommandState('bold')) {
                boldBtn.classList.add('active');
            } else {
                boldBtn.classList.remove('active');
            }
        }
        
        if (italicBtn) {
            if (document.queryCommandState('italic')) {
                italicBtn.classList.add('active');
            } else {
                italicBtn.classList.remove('active');
            }
        }
        
        if (underlineBtn) {
            if (document.queryCommandState('underline')) {
                underlineBtn.classList.add('active');
            } else {
                underlineBtn.classList.remove('active');
            }
        }
    }
    
    // Export for external use
    window.TextEditorTextStyle = {
        bold: () => document.execCommand('bold', false, null),
        italic: () => document.execCommand('italic', false, null),
        underline: () => document.execCommand('underline', false, null),
        updateState: updateButtonState
    };
})();
