/**
 * Navigation Component
 * Handles project and media navigation
 */

(function() {
    'use strict';

// Project navigation functions
function previousProject() {
    console.log('[previousProject] Called');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    console.log('[previousProject] Found', projectItems.length, 'projects');
    console.log('[previousProject] Active item:', activeItem);
    
    if (!activeItem || projectItems.length <= 1) return;
    
    let currentIndex = Array.from(projectItems).indexOf(activeItem);
    console.log('[previousProject] Current index:', currentIndex);
    
    if (currentIndex > 0) {
        const prevItem = projectItems[currentIndex - 1];
        console.log('[previousProject] Clicking on project at index:', currentIndex - 1);
        console.log('[previousProject] Previous project item:', prevItem);
        console.log('[previousProject] Previous project ID:', prevItem.dataset.projectId);
        
        // Try clicking the project item
        prevItem.click();
        
        // Also try calling selectProject directly if available
        setTimeout(() => {
            if (window.selectProject && prevItem.dataset.projectId) {
                console.log('[previousProject] Calling selectProject directly with ID:', prevItem.dataset.projectId);
                window.selectProject(prevItem.dataset.projectId);
            }
        }, 100);
    }
}

function nextProject() {
    console.log('[nextProject] Called');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    console.log('[nextProject] Found', projectItems.length, 'projects');
    console.log('[nextProject] Active item:', activeItem);
    
    if (!activeItem || projectItems.length <= 1) return;
    
    let currentIndex = Array.from(projectItems).indexOf(activeItem);
    console.log('[nextProject] Current index:', currentIndex);
    
    if (currentIndex < projectItems.length - 1) {
        const nextItem = projectItems[currentIndex + 1];
        console.log('[nextProject] Clicking on project at index:', currentIndex + 1);
        console.log('[nextProject] Next project item:', nextItem);
        console.log('[nextProject] Next project ID:', nextItem.dataset.projectId);
        
        // Try clicking the project item
        nextItem.click();
        
        // Also try calling selectProject directly if available
        setTimeout(() => {
            if (window.selectProject && nextItem.dataset.projectId) {
                console.log('[nextProject] Calling selectProject directly with ID:', nextItem.dataset.projectId);
                window.selectProject(nextItem.dataset.projectId);
            }
        }, 100);
    }
}

// Media loading state
let currentMediaFiles = [];
let currentMediaIndex = 0;
let currentProjectId = null;

// Expose to window for debugging
window.getCurrentMediaFiles = () => currentMediaFiles;
window.getCurrentMediaIndex = () => currentMediaIndex;

// Media loading functions
function loadMediaFiles(files, projectId) {
    console.log('[loadMediaFiles] Loading media files:', files);
    console.log('[loadMediaFiles] Project ID:', projectId);
    
    // Store files globally
    currentMediaFiles = files || [];
    window.currentMediaFiles = currentMediaFiles; // Also store on window for debugging
    currentProjectId = projectId;
    currentMediaIndex = 0;
    
    console.log('[loadMediaFiles] Stored', currentMediaFiles.length, 'files');
    console.log('[loadMediaFiles] Current media files:', currentMediaFiles);
    
    // Update media navigation UI
    updateMediaNavigationUI();
    
    // Load first file if available
    if (currentMediaFiles.length > 0) {
        loadMediaFile(0);
    }
}

function loadMediaFile(index) {
    console.log('[loadMediaFile] Called with index:', index);
    console.log('[loadMediaFile] Current files array length:', currentMediaFiles.length);
    console.log('[loadMediaFile] Current files:', currentMediaFiles);
    
    if (index < 0 || index >= currentMediaFiles.length) {
        console.error('[loadMediaFile] Index out of bounds:', index);
        return;
    }
    
    // Update the current index FIRST
    currentMediaIndex = index;
    console.log('[loadMediaFile] Updated currentMediaIndex to:', currentMediaIndex);
    
    const file = currentMediaFiles[index];
    
    console.log('[loadMediaFile] Loading file at index:', index);
    console.log('[loadMediaFile] File:', file);
    
    // Update UI
    updateCurrentFileName(file.original_name || file.filename || 'Unknown');
    updateMediaCounter(index + 1, currentMediaFiles.length);
    updateMediaFileInfo(file);
    
    // Always notify about media type for container sizing (navigation is in main window, not iframe)
    const mediaType = file.file_type || file.mime_type || '';
    // Fire a custom event that the mode detector can listen to
    window.dispatchEvent(new CustomEvent('mediaLoaded', { 
        detail: { 
            mediaType: mediaType,
            fileIndex: index 
        }
    }));
    
    // Actually load the media file
    const filePath = file.full_path || file.path || file.stream_url;
    if (filePath) {
        const isVideo = mediaType.includes('video');
        
        console.log('[loadMediaFile] Loading media:', filePath, 'isVideo:', isVideo);
        
        // Use the new media player API
        if (window.mediaPlayer && window.mediaPlayer.loadMedia) {
            window.mediaPlayer.loadMedia(filePath, file.original_name || file.filename, mediaType);
            console.log('[loadMediaFile] Media loaded successfully with type:', mediaType);
        } else {
            console.error('[loadMediaFile] Media player not available!');
        }
    } else {
        console.error('No file path available for media file:', file);
    }
    
    // Update navigation buttons
    updateMediaNavigationButtons();
}

function updateMediaFileInfo(file) {
    // Update duration
    const durationEl = document.getElementById('fileDuration');
    if (durationEl) {
        durationEl.textContent = file.duration || '00:00:00';
    }
    
    // Update size
    const sizeEl = document.getElementById('fileSize');
    if (sizeEl) {
        const sizeInMB = file.file_size ? (file.file_size / (1024 * 1024)).toFixed(2) : '0';
        sizeEl.textContent = `${sizeInMB} MB`;
    }
    
    // Update type
    const typeEl = document.getElementById('fileType');
    if (typeEl) {
        const fileType = file.file_type || file.mime_type || '';
        const isVideo = fileType.includes('video');
        typeEl.textContent = isVideo ? 'וידאו' : 'אודיו';
    }
}

function updateMediaNavigationUI() {
    updateMediaCounter(currentMediaIndex + 1, currentMediaFiles.length);
    updateMediaNavigationButtons();
}

function updateMediaNavigationButtons() {
    const prevBtn = document.getElementById('prevMediaBtn');
    const nextBtn = document.getElementById('nextMediaBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentMediaIndex === 0 || currentMediaFiles.length === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = currentMediaIndex >= currentMediaFiles.length - 1 || currentMediaFiles.length === 0;
    }
}

// Media navigation functions
function navigateMedia(direction) {
    console.log('[navigateMedia] Direction:', direction);
    console.log('[navigateMedia] Current index:', currentMediaIndex);
    console.log('[navigateMedia] Total files:', currentMediaFiles.length);
    console.log('[navigateMedia] Current files array:', currentMediaFiles);
    
    if (direction === 'prev' && currentMediaIndex > 0) {
        console.log('[navigateMedia] Going to previous file, index:', currentMediaIndex - 1);
        loadMediaFile(currentMediaIndex - 1);
    } else if (direction === 'next' && currentMediaIndex < currentMediaFiles.length - 1) {
        console.log('[navigateMedia] Going to next file, index:', currentMediaIndex + 1);
        loadMediaFile(currentMediaIndex + 1);
    } else {
        console.log('[navigateMedia] Cannot navigate - at boundary or no files');
    }
}

function previousMedia() {
    console.log('previousMedia called');
    navigateMedia('prev');
}

function nextMedia() {
    console.log('nextMedia called');
    navigateMedia('next');
}

// Update navigation counters
function updateProjectCounter() {
    const counter = document.getElementById('projectCounter');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    if (counter && activeItem) {
        const currentIndex = Array.from(projectItems).indexOf(activeItem) + 1;
        // Changed order: current/total for Hebrew RTL
        const newText = `${currentIndex}/${projectItems.length}`;
        console.log('[updateProjectCounter] Setting counter to:', newText);
        counter.textContent = newText;
        // Force refresh
        counter.style.display = 'none';
        counter.offsetHeight; // Trigger reflow
        counter.style.display = '';
    }
}

function updateMediaCounter(current, total) {
    const counter = document.getElementById('mediaCounter');
    if (counter) {
        // Changed order: current/total for Hebrew RTL
        counter.textContent = `${current}/${total}`;
    }
}

// Update current media name
function updateCurrentFileName(filename) {
    const element = document.getElementById('fileName');
    if (element) {
        element.textContent = filename || 'אין קובץ נבחר';
        
        // Check if text overflows and apply marquee
        const wrapper = element.parentElement;
        if (wrapper && wrapper.classList.contains('file-name-wrapper')) {
            // Remove existing marquee
            element.classList.remove('marquee');
            
            // Check if text is wider than container
            setTimeout(() => {
                if (element.scrollWidth > wrapper.offsetWidth) {
                    // Create scrolling effect
                    element.innerHTML = `<span class="file-name-scroll">${filename} • ${filename} • </span>`;
                    element.classList.add('marquee');
                }
            }, 100);
        }
    }
}

// Update project name
function updateProjectName(projectName) {
    console.log('[navigation.js updateProjectName] Called with:', projectName);
    const element = document.getElementById('projectName');
    if (element) {
        console.log('[navigation.js updateProjectName] Element found, setting text to:', projectName || '-');
        element.textContent = projectName || '-';
        // Force update
        element.style.color = element.style.color || 'inherit';
    } else {
        console.error('[navigation.js updateProjectName] projectName element not found!');
    }
}

// Test media loading functions
function testLoadAudio() {
    console.log('[Navigation] Loading test audio');
    if (window.loadTestAudio) {
        window.loadTestAudio();
    } else {
        console.error('[Navigation] loadTestAudio not available');
    }
}

function testLoadVideo() {
    console.log('[Navigation] Loading test video');
    if (window.loadTestVideo) {
        window.loadTestVideo();
    } else {
        console.error('[Navigation] loadTestVideo not available');
    }
}

// Update navigation buttons state
function updateNavigationButtons() {
    console.log('[updateNavigationButtons] Called');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    console.log('[updateNavigationButtons] Found', projectItems.length, 'projects');
    console.log('[updateNavigationButtons] Active item:', activeItem);
    
    // Get buttons by ID
    const prevBtn = document.getElementById('prevProjectBtn');
    const nextBtn = document.getElementById('nextProjectBtn');
    
    if (!prevBtn || !nextBtn) return;
    
    if (!activeItem || projectItems.length === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    const currentIndex = Array.from(projectItems).indexOf(activeItem);
    
    // Enable/disable based on position
    prevBtn.disabled = currentIndex === 0 || projectItems.length <= 1;
    nextBtn.disabled = currentIndex >= projectItems.length - 1 || projectItems.length <= 1;
    
    // Update counter
    updateProjectCounter();
    
    // Update project name from active item
    // Commented out - project name element removed from navigation
    // if (activeItem) {
    //     const projectNameSpan = activeItem.querySelector('.project-item-title');
    //     if (projectNameSpan) {
    //         updateProjectName(projectNameSpan.textContent);
    //     }
    // }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', function() {
    updateNavigationButtons();
    
    // Listen for project item clicks to update navigation
    document.addEventListener('click', function(e) {
        if (e.target.closest('.project-item')) {
            setTimeout(updateNavigationButtons, 100);
        }
    });
});

// Test media loading functions
function loadTestAudio() {
    console.log('[loadTestAudio] Loading test audio file');
    const testAudioFiles = [{
        id: 'test-audio-1',
        original_name: 'Big Buck Bunny Audio Sample.mp3',
        filename: 'test-audio.mp3',
        file_type: 'audio/mp3',
        mime_type: 'audio/mp3',
        duration: '00:00:10',
        file_size: 156000, // 156 KB
        // Using a public test audio file
        stream_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    }];
    
    loadMediaFiles(testAudioFiles, 'TEST_PROJECT_AUDIO');
}

function loadTestVideo() {
    console.log('[loadTestVideo] Loading test video file');
    const testVideoFiles = [{
        id: 'test-video-1',
        original_name: 'Big Buck Bunny Video Sample.mp4',
        filename: 'test-video.mp4',
        file_type: 'video/mp4',
        mime_type: 'video/mp4',
        duration: '00:00:10',
        file_size: 5500000, // 5.5 MB
        // Using a public test video file
        stream_url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        full_path: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
    }];
    
    loadMediaFiles(testVideoFiles, 'TEST_PROJECT_VIDEO');
}

// Test function to load multiple media files
function loadTestMultipleMedia() {
    console.log('[loadTestMultipleMedia] Loading multiple test files');
    const testFiles = [
        {
            id: 'test-audio-1',
            original_name: 'Song 1.mp3',
            filename: 'song1.mp3',
            file_type: 'audio/mp3',
            mime_type: 'audio/mp3',
            duration: '00:03:45',
            file_size: 4500000,
            stream_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            full_path: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        },
        {
            id: 'test-video-1',
            original_name: 'Big Buck Bunny.mp4',
            filename: 'bunny.mp4',
            file_type: 'video/mp4',
            mime_type: 'video/mp4',
            duration: '00:00:10',
            file_size: 5500000,
            stream_url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
            full_path: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
        },
        {
            id: 'test-audio-2',
            original_name: 'Song 2.mp3',
            filename: 'song2.mp3',
            file_type: 'audio/mp3',
            mime_type: 'audio/mp3',
            duration: '00:04:12',
            file_size: 5200000,
            stream_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            full_path: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
        }
    ];
    
    loadMediaFiles(testFiles, 'TEST_PROJECT_MULTI');
}

// Export functions for use in other components
window.updateNavigationButtons = updateNavigationButtons;
window.updateProjectName = updateProjectName;
window.updateMediaCounter = updateMediaCounter;
window.updateCurrentFileName = updateCurrentFileName;
window.previousProject = previousProject;
window.nextProject = nextProject;
window.previousMedia = previousMedia;
window.nextMedia = nextMedia;
window.navigateMedia = navigateMedia;
window.loadMediaFiles = loadMediaFiles;
window.loadMediaFile = loadMediaFile;
window.updateMediaFileInfo = updateMediaFileInfo;
window.updateMediaNavigationUI = updateMediaNavigationUI;
window.updateMediaNavigationButtons = updateMediaNavigationButtons;
window.testLoadAudio = testLoadAudio;
window.testLoadVideo = testLoadVideo;
window.loadTestMultipleMedia = loadTestMultipleMedia;

// Debug function
window.debugMediaNavigation = function() {
    console.log('=== MEDIA NAVIGATION DEBUG ===');
    console.log('Current media files:', currentMediaFiles);
    console.log('Current media index:', currentMediaIndex);
    console.log('Total files:', currentMediaFiles.length);
    console.log('Can go previous?', currentMediaIndex > 0);
    console.log('Can go next?', currentMediaIndex < currentMediaFiles.length - 1);
    const prevBtn = document.getElementById('prevMediaBtn');
    const nextBtn = document.getElementById('nextMediaBtn');
    console.log('Previous button disabled?', prevBtn?.disabled);
    console.log('Next button disabled?', nextBtn?.disabled);
    console.log('============================');
};

// Add a watcher to sync with workspace header
// Commented out - project name element removed from navigation
// document.addEventListener('DOMContentLoaded', function() {
//     setTimeout(function() {
//         // Create MutationObserver to watch workspace title changes
//         const workspaceTitle = document.querySelector('.workspace-title');
//         if (workspaceTitle) {
//             console.log('[navigation.js] Setting up workspace title observer');
//             const observer = new MutationObserver(function(mutations) {
//                 mutations.forEach(function(mutation) {
//                     if (mutation.type === 'childList' || mutation.type === 'characterData') {
//                         const newTitle = workspaceTitle.textContent.trim();
//                         if (newTitle && newTitle !== 'פרויקט תמלול' && newTitle !== '-') {
//                             console.log('[navigation.js] Workspace title changed to:', newTitle);
//                             updateProjectName(newTitle);
//                         }
//                     }
//                 });
//             });
//             
//             // Start observing
//             observer.observe(workspaceTitle, {
//                 childList: true,
//                 characterData: true,
//                 subtree: true
//             });
//             
//             // Also do an initial sync
//             const currentTitle = workspaceTitle.textContent.trim();
//             if (currentTitle && currentTitle !== 'פרויקט תמלול') {
//                 updateProjectName(currentTitle);
//             }
//         }
//     }, 1000); // Wait a bit for everything to load
// });
})();
