/*
 * Navigation Mode Control
 * toolbar/transcription-tools/navigation-mode/navigation-mode.js
 * 
 * Controls automatic media player jumping when hovering/navigating timestamps
 */

(function() {
    console.log('[TextEditor] Navigation mode loaded');
    
    let navigationMode = false;
    let lastJumpTime = 0;
    const JUMP_DELAY = 500; // Minimum delay between jumps (ms)
    
    document.addEventListener('DOMContentLoaded', function() {
        const navigationBtn = document.getElementById('navigationModeBtn');
        const navigationStatus = document.getElementById('navigationStatus');
        
        if (navigationBtn) {
            navigationBtn.addEventListener('click', function() {
                navigationMode = !navigationMode;
                navigationStatus.textContent = navigationMode ? 'פעיל' : 'כבוי';
                navigationBtn.classList.toggle('active', navigationMode);
                
                // Update editor class
                const editor = document.getElementById('textEditor');
                if (editor) {
                    editor.classList.toggle('navigation-mode', navigationMode);
                }
                
                console.log('[Navigation Mode]', navigationMode ? 'Enabled' : 'Disabled');
            });
        }
        
        // Setup timestamp hover/focus handlers
        setupTimestampNavigation();
    });
    
    function setupTimestampNavigation() {
        const editor = document.getElementById('textEditor');
        if (!editor) return;
        
        // Use event delegation for timestamps
        editor.addEventListener('mouseover', function(e) {
            if (!navigationMode) return;
            
            if (e.target.classList.contains('timestamp')) {
                handleTimestampNavigation(e.target);
            }
        });
        
        // Handle keyboard navigation
        editor.addEventListener('keyup', function(e) {
            if (!navigationMode) return;
            
            // Check if we're on a timestamp
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                // Find timestamp element
                let timestampEl = null;
                if (container.nodeType === Node.TEXT_NODE) {
                    timestampEl = container.parentElement;
                } else {
                    timestampEl = container;
                }
                
                // Check if it's a timestamp or inside one
                if (timestampEl && timestampEl.closest) {
                    timestampEl = timestampEl.closest('.timestamp');
                }
                
                if (timestampEl && timestampEl.classList.contains('timestamp')) {
                    handleTimestampNavigation(timestampEl);
                }
            }
        });
    }
    
    function handleTimestampNavigation(timestampEl) {
        // Prevent too frequent jumps
        const now = Date.now();
        if (now - lastJumpTime < JUMP_DELAY) return;
        
        const timeText = timestampEl.textContent;
        const timeStr = timeText.replace(/[\[\]]/g, ''); // Remove brackets
        const [h, m, s] = timeStr.split(':').map(Number);
        
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            const totalSeconds = h * 3600 + m * 60 + s;
            
            if (window.mediaPlayer && window.mediaPlayer.currentPlayer) {
                window.mediaPlayer.currentPlayer.currentTime = totalSeconds;
                lastJumpTime = now;
                console.log('[Navigation Mode] Auto-jumped to:', timeStr);
                
                // Visual feedback
                timestampEl.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                setTimeout(() => {
                    timestampEl.style.backgroundColor = '';
                }, 300);
            }
        }
    }
    
    // Export for external use
    window.TextEditorNavigation = {
        toggle: function() {
            const btn = document.getElementById('navigationModeBtn');
            if (btn) btn.click();
        },
        isEnabled: function() {
            return navigationMode;
        },
        setEnabled: function(enabled) {
            if (navigationMode !== enabled) {
                this.toggle();
            }
        }
    };
})();