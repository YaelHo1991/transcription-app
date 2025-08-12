/**
 * Simple initialization to ensure everything connects
 */

console.log('Simple Init: Starting...');

// Wait for everything to load
window.addEventListener('load', function() {
    console.log('Simple Init: Page fully loaded');
    
    // Give extra time for all scripts to initialize
    setTimeout(function() {
        console.log('Simple Init: Checking components...');
        
        // Check if we have media player
        if (window.mediaPlayer) {
            console.log('✓ Media Player found');
        } else {
            console.error('✗ Media Player NOT found');
        }
        
        // Check if we have loadProject function
        if (window.loadProject) {
            console.log('✓ loadProject function found');
        } else {
            console.error('✗ loadProject function NOT found');
        }
        
        // Try to load first project automatically
        const firstProject = document.querySelector('.project-item');
        if (firstProject) {
            console.log('Simple Init: Found first project, clicking it...');
            firstProject.click();
        } else {
            console.log('Simple Init: No projects found in sidebar');
        }
        
    }, 2000); // Wait 2 seconds after page load
});

// Add global debug function
window.debugTranscription = function() {
    console.log('=== TRANSCRIPTION DEBUG ===');
    console.log('Media Player:', window.mediaPlayer);
    console.log('Current Media Files:', window.currentMediaFiles);
    console.log('Load Project Function:', window.loadProject);
    console.log('Projects in sidebar:', document.querySelectorAll('.project-item').length);
    console.log('Audio element:', document.getElementById('audioPlayer'));
    console.log('Video element:', document.getElementById('videoPlayer'));
    console.log('=========================');
}

console.log('Simple Init: Script loaded. Call debugTranscription() to see status.');