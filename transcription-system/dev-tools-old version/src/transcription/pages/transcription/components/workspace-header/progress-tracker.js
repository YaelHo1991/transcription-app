/**
 * Transcription Progress Tracker
 * Calculates progress based on media duration and transcription text
 */

let progressUpdateInterval = null;

function calculateTranscriptionProgress() {
    // Get media duration
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');
    
    let mediaDuration = 0;
    if (audioPlayer && audioPlayer.duration && !isNaN(audioPlayer.duration)) {
        mediaDuration = audioPlayer.duration;
    } else if (videoPlayer && videoPlayer.duration && !isNaN(videoPlayer.duration)) {
        mediaDuration = videoPlayer.duration;
    }
    
    // Get transcription text
    const transcriptionTextarea = document.querySelector('.transcription-textarea');
    const transcriptionText = transcriptionTextarea ? transcriptionTextarea.value : '';
    
    // Calculate progress based on text length vs expected text for duration
    // Assume average speaking rate of 150 words per minute
    // Average word length in Hebrew is about 4-5 characters
    const wordsPerMinute = 150;
    const avgWordLength = 4.5;
    const expectedCharacters = (mediaDuration / 60) * wordsPerMinute * avgWordLength;
    
    let progress = 0;
    if (expectedCharacters > 0) {
        progress = Math.min(100, (transcriptionText.length / expectedCharacters) * 100);
    }
    
    // Update UI
    updateProgressDisplay(progress);
}

function updateProgressDisplay(progress) {
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('transcriptionProgress');
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    
    if (progressText) {
        progressText.textContent = Math.round(progress) + '%';
    }
}

// Initialize progress tracking
function initProgressTracking() {
    // Calculate initial progress
    calculateTranscriptionProgress();
    
    // Update progress every 5 seconds
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
    }
    progressUpdateInterval = setInterval(calculateTranscriptionProgress, 5000);
    
    // Also update on text change
    const transcriptionTextarea = document.querySelector('.transcription-textarea');
    if (transcriptionTextarea) {
        transcriptionTextarea.addEventListener('input', debounce(calculateTranscriptionProgress, 1000));
    }
}

// Debounce function to limit updates
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start tracking when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for media to load
    setTimeout(initProgressTracking, 1000);
    
    // Reinitialize when media changes
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');
    
    if (audioPlayer) {
        audioPlayer.addEventListener('loadedmetadata', initProgressTracking);
    }
    
    if (videoPlayer) {
        videoPlayer.addEventListener('loadedmetadata', initProgressTracking);
    }
});

// Export for external use
window.calculateTranscriptionProgress = calculateTranscriptionProgress;
window.initProgressTracking = initProgressTracking;