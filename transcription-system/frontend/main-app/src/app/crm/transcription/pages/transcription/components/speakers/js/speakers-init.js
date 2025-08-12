/*
 * =========================================
 * Speakers Component Initialization
 * js/speakers-init.js
 * =========================================
 * Initialize speaker functionality on page load
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Speakers] Initializing speakers component...');
    
    // Initialize speakers manager
    if (window.speakersManager) {
        // Get project ID if available
        const projectId = window.currentProjectId || null;
        window.speakersManager.init(projectId);
        console.log('[Speakers] Manager initialized');
    }
    
    // Initialize speakers UI
    if (window.speakersUI) {
        window.speakersUI.init();
        console.log('[Speakers] UI initialized');
    }
    
    // Initialize speakers blocks system
    if (window.speakersBlocks) {
        window.speakersBlocks.init();
        console.log('[Speakers] Blocks system initialized');
        
        // Add a test block to verify it's working
        setTimeout(() => {
            const blocksList = document.getElementById('speakersBlocksList');
            if (blocksList && blocksList.children.length === 0) {
                console.log('[Speakers] No blocks found, adding empty block');
                window.speakersBlocks.addEmptyBlock();
            }
            
            // Update colors after text editor is loaded
            if (window.speakersBlocks) {
                console.log('[Speakers Init] Initial color update after delay');
                window.speakersBlocks.updateSpeakerColors();
            }
        }, 1000);
        
        // Set up periodic color updates
        setInterval(() => {
            if (window.speakersBlocks && window.textEditorBlocks) {
                console.log('[Speakers Init] Periodic color update triggered');
                console.log('[Speakers Init] textEditorBlocks available:', !!window.textEditorBlocks);
                console.log('[Speakers Init] speakerColors:', window.textEditorBlocks.speakerColors);
                window.speakersBlocks.updateSpeakerColors();
            }
        }, 1000);
    }
    
    // Setup global functions for backward compatibility
    window.addNewSpeaker = function() {
        if (window.speakersUI) {
            window.speakersUI.showAddSpeakerDialog();
        }
    };
    
    window.saveSpeakers = async function() {
        if (window.speakersManager) {
            return await window.speakersManager.saveSpeakers();
        }
        return false;
    };
    
    window.getSpeakers = function() {
        if (window.speakersManager) {
            return window.speakersManager.getSpeakers();
        }
        return [];
    };
    
    window.setSpeakersText = function(text) {
        if (window.speakersManager) {
            window.speakersManager.setSpeakersText(text);
        }
    };
    
    window.getSpeakersText = function() {
        if (window.speakersManager) {
            return window.speakersManager.getSpeakersText();
        }
        return '';
    };
    
    // Listen for project changes
    window.addEventListener('projectChanged', function(e) {
        if (e.detail && e.detail.projectId) {
            console.log('[Speakers] Project changed to:', e.detail.projectId);
            if (window.speakersManager) {
                window.speakersManager.setProjectId(e.detail.projectId);
            }
        }
    });
    
    // Listen for save requests
    window.addEventListener('saveAll', async function() {
        console.log('[Speakers] Save all requested');
        if (window.speakersManager && window.speakersManager.hasChanges()) {
            await window.speakersManager.saveSpeakers();
        }
    });
    
    console.log('[Speakers] Component initialization complete');
});