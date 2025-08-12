// Debug Media Loading - Temporary debug script

console.log('=== MEDIA LOADING DEBUG ===');

// Check what functions are available
console.log('window.loadAudio exists:', typeof window.loadAudio);
console.log('window.loadVideo exists:', typeof window.loadVideo);
console.log('window.setMediaFiles exists:', typeof window.setMediaFiles);
console.log('window.loadMediaFiles exists:', typeof window.loadMediaFiles);
console.log('window.loadMediaFile exists:', typeof window.loadMediaFile);
console.log('window.mediaProjectLoader exists:', typeof window.mediaProjectLoader);
console.log('window.MediaProjectLoader exists:', typeof window.MediaProjectLoader);

// Check for audio player
console.log('audioPlayer element:', document.getElementById('audioPlayer'));

// Listen for all custom events
window.addEventListener('mediaLoaded', function(e) {
    console.log('[DEBUG] mediaLoaded event:', e.detail);
});

// Override loadAudio to see if it's called
const originalLoadAudio = window.loadAudio;
window.loadAudio = function(src) {
    console.log('[DEBUG] loadAudio called with:', src);
    if (originalLoadAudio) {
        return originalLoadAudio.call(this, src);
    }
};

// Override setMediaFiles to see if it's called
const originalSetMediaFiles = window.setMediaFiles;
window.setMediaFiles = function(files) {
    console.log('[DEBUG] setMediaFiles called with:', files);
    if (originalSetMediaFiles) {
        return originalSetMediaFiles.call(this, files);
    }
};

// Check media files after a delay
setTimeout(function() {
    console.log('=== DELAYED CHECK ===');
    console.log('window.currentMediaFiles:', window.currentMediaFiles);
    console.log('Audio player src:', document.getElementById('audioPlayer')?.src);
}, 2000);