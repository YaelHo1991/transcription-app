/*
 * =========================================
 * Transcription Application Main Script
 * assets/js/transcription-app.js
 * =========================================
 * Main application logic
 */

console.log('[transcription-app.js] Script loaded');

// Global variables
let currentProjectId = null;
let currentProject = null;
let currentProjectFiles = null;
let currentMediaFiles = [];
let isProjectLoading = false;
let isAppInitialized = false;

// Use existing API URLs or set defaults
if (!window.API_BASE_URL) {
    window.API_BASE_URL = 'http://localhost:8080';
}
if (!window.API_URL) {
    window.API_URL = 'http://localhost:8080/api';
}

// Use them locally without redeclaring
const apiBaseUrl = window.API_BASE_URL;
const apiUrl = window.API_URL;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check media navigation after page loads
    setTimeout(() => {
        console.log('=== Media Navigation Debug ===');
        console.log('window.navigateMedia exists:', typeof window.navigateMedia);
        console.log('window.mediaPlayer exists:', typeof window.mediaPlayer);
        console.log('Prev button:', document.getElementById('prevMediaBtn'));
        console.log('Next button:', document.getElementById('nextMediaBtn'));
        console.log('Prev button disabled:', document.getElementById('prevMediaBtn')?.disabled);
        console.log('Next button disabled:', document.getElementById('nextMediaBtn')?.disabled);
        console.log('=========================');
    }, 3000);
    
    // Delay initialization slightly to ensure all components are loaded
    setTimeout(() => {
        initializeApp();
    }, 300);
});

function initializeApp() {
    if (isAppInitialized) {
        console.log('App already initialized, skipping');
        return;
    }
    
    console.log('Initializing transcription application...');
    isAppInitialized = true;
    
    // Test project name element
    setTimeout(() => {
        const testEl = document.getElementById('projectName');
        console.log('Project name element found:', !!testEl);
        if (testEl) {
            console.log('Current project name text:', testEl.textContent);
        }
    }, 1000);
    
    // Get project ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project_id');
    
    console.log('[transcription-app] Project ID from URL:', projectId);
    
    // Check for selected media file
    const selectedMediaFileId = sessionStorage.getItem('selectedMediaFileId');
    if (selectedMediaFileId) {
        sessionStorage.removeItem('selectedMediaFileId');
        loadAndPlayMedia(selectedMediaFileId);
    }
    
    // Load project if specified
    if (projectId) {
        loadProject(projectId);
    }
    
    // Initialize components
    initializeComponents();
    
    // Setup project handlers
    setupProjectHandlers();
    
    // Sidebar projects load automatically via sidebar.js
    // No need to call here
}

// Initialize all components
function initializeComponents() {
    // Text editor
    if (window.textEditor) {
        textEditor.init(currentProjectId);
    }
    
    // Speakers manager
    if (window.speakersManager) {
        speakersManager.init(currentProjectId);
    }
    
    // Remarks manager
    if (window.remarksManager) {
        remarksManager.init(currentProjectId);
    }
}

// Setup project click handlers
function setupProjectHandlers() {
    document.addEventListener('click', function(e) {
        const projectItem = e.target.closest('.project-item');
        if (projectItem && projectItem.dataset.projectId) {
            selectProject(projectItem.dataset.projectId);
        }
    });
}

// Select and load project
function selectProject(projectId) {
    console.log('[selectProject] ========== SELECTING PROJECT ==========');
    console.log('[selectProject] Project ID:', projectId);
    console.log('[selectProject] Previous project ID:', currentProjectId);
    
    // Check if it's the same project
    if (currentProjectId === projectId) {
        console.log('[selectProject] Same project, reloading anyway to fix media');
    }
    
    currentProjectId = projectId;
    
    // Update active state
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    const newActiveItem = document.querySelector(`[data-project-id="${projectId}"]`);
    if (newActiveItem) {
        newActiveItem.classList.add('active');
        console.log('[selectProject] Set active class on project item');
    }
    
    // Update navigation immediately
    if (window.updateNavigationButtons) {
        window.updateNavigationButtons();
    }
    
    // Load project - FORCE reload
    console.log('[selectProject] Calling loadProject with ID:', projectId);
    loadProject(projectId);
}

// Load project data
async function loadProject(projectId) {
    console.log('[loadProject] Called with projectId:', projectId);
    
    // Prevent duplicate loads only if actively loading
    if (isProjectLoading) {
        console.log('[loadProject] Already loading a project, skipping');
        return;
    }
    
    // ALWAYS reload project files, even if it's the same project
    // This ensures media files are reloaded when switching between projects
    console.log('[loadProject] Loading project (force reload):', projectId);
    
    isProjectLoading = true;
    
    try {
        // Load project files first
        await loadProjectFiles(projectId);
        
        // For independent projects, use the project data from JSON file
        if (projectId.startsWith('IND_')) {
            // Use the loaded project data
            if (currentProjectFiles) {
                // Extract project title from project data
                let projectTitle = 'פרויקט תמלול';
                
                // First try to get from the API response
                try {
                    const response = await fetch(`http://localhost:8080/api/projects.php?action=get&project_id=${projectId}&dev=1`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.project && data.project.title) {
                            projectTitle = data.project.title;
                            console.log('[loadProject] Got title from API:', projectTitle);
                        }
                    }
                } catch (e) {
                    console.log('[loadProject] Could not fetch from API, using fallback');
                }
                
                // Fallback: Try to get title from sidebar
                const projectItem = document.querySelector(`[data-project-id="${projectId}"]`);
                if (projectItem) {
                    const titleEl = projectItem.querySelector('.project-title');
                    if (titleEl && titleEl.textContent) {
                        projectTitle = titleEl.textContent;
                        console.log('[loadProject] Got title from sidebar:', projectTitle);
                    }
                }
                
                currentProject = {
                    id: projectId,
                    title: projectTitle,
                    transcription_text: '',
                    speakers_list: '',
                    notes: ''
                };
                currentProjectId = projectId;
                
                console.log('[loadProject] Independent project loaded:', currentProject);
                
                // Update UI
                updateProjectUI();
                
                // Load data into components
                loadProjectData();
            }
        } else {
            // For regular projects, try to fetch from API
            const devParam = '&dev=1';
            const response = await fetch(`http://localhost:8080/api/projects.php?action=get&project_id=${projectId}${devParam}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('[loadProject] API response:', data);
                
                if (data.success) {
                    currentProject = data.project;
                    currentProjectId = projectId;
                    
                    // Update UI
                    updateProjectUI();
                    
                    // Load data into components
                    loadProjectData();
                }
            } else {
                console.log('Using basic project info');
                currentProject = {
                    id: projectId,
                    title: `Project ${projectId}`,
                    transcription_text: '',
                    speakers_list: '',
                    notes: ''
                };
                currentProjectId = projectId;
                updateProjectUI();
            }
        }
    } catch (error) {
        console.error('Error loading project:', error);
    } finally {
        isProjectLoading = false;
    }
}

// Load project files
async function loadProjectFiles(projectId) {
    console.log('[loadProjectFiles] Loading project files for:', projectId);
    console.log('[loadProjectFiles] API_BASE_URL:', window.API_BASE_URL);
    try {
        // Always use dev=1 for cross-port requests to bypass authentication
        const devParam = '&dev=1';
        
        // Use server API endpoint - hardcode it for now to make it work
        const apiUrl = `http://localhost:8080/api/project-files.php?project_id=${projectId}${devParam}`;
        console.log('[loadProjectFiles] Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('[loadProjectFiles] Response status:', response.status);
        const data = await response.json();
        console.log('[loadProjectFiles] Response data:', data);
        
        if (data.success) {
            currentProjectFiles = data.files;
            
            // Use ProjectMediaLoader if available
            if (window.ProjectMediaLoader) {
                await window.ProjectMediaLoader.loadProjectMedia(projectId);
                currentMediaFiles = window.ProjectMediaLoader.getMediaFiles();
            } else {
                // Fallback
                currentMediaFiles = data.files.media || [];
                
                // Process media files to ensure correct stream URLs
                currentMediaFiles = currentMediaFiles.map(file => {
                    // Always update stream_url for proper media streaming
                    if (file.id) {
                        file.stream_url = `http://localhost:8080/api/media-stream.php?file_id=${file.id}&project_id=${projectId}&dev=1`;
                    } else if (file.file_path) {
                        file.stream_url = `http://localhost:8080/api/media-stream.php?file=${encodeURIComponent(file.file_path)}&project_id=${projectId}&dev=1`;
                    }
                    return file;
                });
            }
            
            console.log('Processed media files:', currentMediaFiles);
            
            // Initialize media player - wait a bit if not ready yet
            if (currentMediaFiles.length > 0) {
                let attempts = 0;
                const maxAttempts = 10;
                
                const tryLoadMedia = () => {
                    attempts++;
                    if (window.mediaPlayer && typeof window.mediaPlayer.loadFiles === 'function') {
                        console.log('[tryLoadMedia] ===== LOADING MEDIA FILES =====');
                        console.log('[tryLoadMedia] Project ID:', projectId);
                        console.log('[tryLoadMedia] Number of files:', currentMediaFiles.length);
                        console.log('[tryLoadMedia] First file:', currentMediaFiles[0]);
                        
                        // Check current state before loading
                        console.log('[tryLoadMedia] Current media player state:', {
                            currentProjectId: window.mediaPlayer.projectId,
                            currentFiles: window.mediaPlayer.files.length,
                            isLoading: window.mediaPlayer.isLoading
                        });
                        
                        // Force clear the isLoading flag
                        window.mediaPlayer.isLoading = false;
                        
                        // Clear any existing media first
                        if (window.mediaPlayer.currentPlayer) {
                            console.log('[tryLoadMedia] Clearing current media...');
                            window.mediaPlayer.currentPlayer.pause();
                            window.mediaPlayer.currentPlayer.src = '';
                        }
                        
                        // Also clear both players
                        if (window.mediaPlayer.audioPlayer) {
                            window.mediaPlayer.audioPlayer.pause();
                            window.mediaPlayer.audioPlayer.src = '';
                        }
                        if (window.mediaPlayer.videoPlayer) {
                            window.mediaPlayer.videoPlayer.pause();
                            window.mediaPlayer.videoPlayer.src = '';
                        }
                        
                        // Small delay to ensure clean state
                        setTimeout(() => {
                            console.log('[tryLoadMedia] Now calling mediaPlayer.loadFiles()');
                            console.log('[tryLoadMedia] Files to load:', currentMediaFiles);
                            console.log('[tryLoadMedia] Project ID:', projectId);
                            console.log('[tryLoadMedia] MediaPlayer current state:', {
                                files: window.mediaPlayer.files,
                                currentIndex: window.mediaPlayer.currentIndex,
                                projectId: window.mediaPlayer.projectId
                            });
                            
                            // Force reset the media player state
                            window.mediaPlayer.files = [];
                            window.mediaPlayer.currentIndex = -1;
                            window.mediaPlayer.projectId = null;
                            
                            window.mediaPlayer.loadFiles(currentMediaFiles, projectId);
                            
                            console.log('[tryLoadMedia] After loadFiles - MediaPlayer state:', {
                                files: window.mediaPlayer.files,
                                currentIndex: window.mediaPlayer.currentIndex,
                                projectId: window.mediaPlayer.projectId
                            });
                            
                            // Update navigation after media player init
                            setTimeout(updateNavigationButtons, 100);
                        }, 100); // Increased delay
                    } else if (attempts < maxAttempts) {
                        console.log(`Media player not ready, attempt ${attempts}/${maxAttempts}`);
                        setTimeout(tryLoadMedia, 200);
                    } else {
                        console.error('Media player still not initialized after all attempts');
                        // Removed unified media loader fallback to avoid conflicts
                        console.error('No fallback available - media player failed to initialize');
                    }
                };
                
                tryLoadMedia();
            }
            
            // Display helper files
            displayHelperFiles(data.files.helpers || []);
            
            // Update navigation
            updateNavigationButtons();
            
            // Force enable media navigation for testing
            setTimeout(() => {
                const prevBtn = document.getElementById('prevMediaBtn');
                const nextBtn = document.getElementById('nextMediaBtn');
                if (prevBtn && currentMediaFiles.length > 0) {
                    prevBtn.disabled = false;
                    console.log('Force enabled previous media button');
                }
                if (nextBtn && currentMediaFiles.length > 1) {
                    nextBtn.disabled = false;
                    console.log('Force enabled next media button');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error loading project files:', error);
    }
}

// Update project UI
function updateProjectUI() {
    console.log('[updateProjectUI] Current project:', currentProject);
    
    // Update title in navigation bar using navigation.js function
    const title = currentProject.title || currentProject.name || 'פרויקט תמלול';
    console.log('[updateProjectUI] Setting project name to:', title);
    
    // Update workspace header title (this is what's working)
    if (window.updateWorkspaceTitle) {
        window.updateWorkspaceTitle(title);
    } else {
        const workspaceTitle = document.querySelector('.workspace-title');
        if (workspaceTitle) {
            workspaceTitle.textContent = title;
        }
    }
    
    // Update navigation bar project name - REMOVED (element no longer exists)
    // const projectNameEl = document.getElementById('projectName');
    // if (projectNameEl) {
    //     console.log('[updateProjectUI] Updating navigation project name to:', title);
    //     projectNameEl.textContent = title;
    // } else {
    //     console.error('[updateProjectUI] projectName element not found!');
    // }
    
    // Also try navigation.js function if available - REMOVED
    // if (window.updateProjectName) {
    //     console.log('[updateProjectUI] Also calling window.updateProjectName');
    //     window.updateProjectName(title);
    // }
    
    // Final update after a delay - REMOVED
    // setTimeout(() => {
    //     const navProjectName = document.getElementById('projectName');
    //     const headerTitle = document.querySelector('.workspace-title');
    //     
    //     if (navProjectName && headerTitle && headerTitle.textContent !== 'פרויקט תמלול') {
    //         console.log('[updateProjectUI] Final sync - copying from header to nav');
    //         console.log('Header title:', headerTitle.textContent);
    //         console.log('Nav title before:', navProjectName.textContent);
    //         navProjectName.textContent = headerTitle.textContent;
    //         console.log('Nav title after:', navProjectName.textContent);
    //     }
    // }, 500);
    
    // Update project counter
    updateProjectCounter();
}

// Update project counter
function updateProjectCounter() {
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    const counterEl = document.getElementById('projectCounter');
    
    if (counterEl && projectItems.length > 0) {
        let currentIndex = 1;
        if (activeItem) {
            projectItems.forEach((item, index) => {
                if (item === activeItem) {
                    currentIndex = index + 1;
                }
            });
        }
        // Changed order: current/total for Hebrew RTL
        counterEl.textContent = `${currentIndex}/${projectItems.length}`;
    }
}

// Load project data into components
function loadProjectData() {
    if (window.textEditor) {
        textEditor.setProjectId(currentProjectId);
        textEditor.setText(currentProject.transcription_text || '');
    }
    
    if (window.speakersManager) {
        speakersManager.setProjectId(currentProjectId);
        speakersManager.setSpeakersText(currentProject.speakers_list || '');
    }
    
    if (window.remarksManager) {
        remarksManager.setProjectId(currentProjectId);
        remarksManager.setRemarksText(currentProject.notes || '');
    }
}

// Display helper files
function displayHelperFiles(helperFiles) {
    const helperSection = document.querySelector('.helper-files-content');
    if (!helperSection) return;
    
    if (helperFiles.length === 0) {
        helperSection.innerHTML = '<p>אין קבצי עזר זמינים</p>';
        return;
    }
    
    helperSection.innerHTML = '';
    helperFiles.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'helper-file-item';
        fileElement.innerHTML = `
            <span>${file.original_name}</span>
            <button onclick="viewHelperFile(${file.id})" class="btn btn-sm">צפה</button>
        `;
        helperSection.appendChild(fileElement);
    });
}

// View helper file
window.viewHelperFile = function(fileId) {
    window.open(`${API_URL}/media-stream.php?file_id=${fileId}`, '_blank');
};

// Toggle helper files
window.toggleHelperFiles = function() {
    const section = document.getElementById('helperFilesSection');
    const trigger = document.getElementById('helperFilesTrigger');
    
    if (section.style.display === 'block') {
        section.style.display = 'none';
        trigger.style.opacity = '0.7';
    } else {
        section.style.display = 'block';
        trigger.style.opacity = '1';
    }
};

// Project navigation - Functions moved to navigation.js

// Export functions globally
window.loadProject = loadProject;
window.loadProjectFiles = loadProjectFiles;

// Debug to confirm they're available
console.log('[transcription-app] Exported functions:', {
    loadProject: typeof window.loadProject,
    loadProjectFiles: typeof window.loadProjectFiles
});

// Debug function for media navigation
window.testMediaNav = function(direction) {
    console.log('Testing media navigation:', direction);
    if (window.navigateMedia) {
        window.navigateMedia(direction);
    } else {
        console.error('navigateMedia not available');
    }
};

// Update navigation buttons
function updateNavigationButtons() {
    // Media navigation
    const prevMediaBtn = document.getElementById('prevMediaBtn');
    const nextMediaBtn = document.getElementById('nextMediaBtn');
    
    if (prevMediaBtn) {
        if (window.mediaPlayer && typeof mediaPlayer.currentMediaIndex !== 'undefined') {
            prevMediaBtn.disabled = mediaPlayer.currentMediaIndex === 0 || currentMediaFiles.length === 0;
        } else if (window.currentMediaFiles) {
            // Enable if we have files, even if mediaPlayer isn't ready
            prevMediaBtn.disabled = currentMediaFiles.length <= 1;
        }
    }
    if (nextMediaBtn) {
        if (window.mediaPlayer && typeof mediaPlayer.currentMediaIndex !== 'undefined') {
            nextMediaBtn.disabled = mediaPlayer.currentMediaIndex >= currentMediaFiles.length - 1 || currentMediaFiles.length === 0;
        } else if (window.currentMediaFiles) {
            // Enable if we have multiple files, even if mediaPlayer isn't ready
            nextMediaBtn.disabled = currentMediaFiles.length <= 1;
        }
    }
    
    // Project navigation
    const projectItems = document.querySelectorAll('.project-item');
    const prevProjectBtn = document.querySelector('[onclick="previousProject()"]');
    const nextProjectBtn = document.querySelector('[onclick="nextProject()"]');
    
    if (prevProjectBtn && nextProjectBtn) {
        const activeItem = document.querySelector('.project-item.active');
        if (activeItem && projectItems.length > 0) {
            let activeIndex = -1;
            projectItems.forEach((item, index) => {
                if (item === activeItem) activeIndex = index;
            });
            
            prevProjectBtn.disabled = activeIndex === 0 || projectItems.length <= 1;
            nextProjectBtn.disabled = activeIndex === projectItems.length - 1 || projectItems.length <= 1;
        }
    }
}

// Load and play specific media
async function loadAndPlayMedia(fileId) {
    try {
        const response = await fetch(`${API_URL}/media-stream.php?file_id=${fileId}`);
        
        if (response.headers.get('content-type') === 'application/json') {
            const data = await response.json();
            if (data.storage_type === 'local') {
                showMessage('קובץ מקומי - נא לבחור את הקובץ מהמחשב', 'info');
                promptForLocalFile(data.local_path);
            }
        } else {
            // Server file - let media player handle it
            if (window.mediaPlayer) {
                const fileIndex = currentMediaFiles.findIndex(f => f.id === fileId);
                if (fileIndex !== -1) {
                    mediaPlayer.loadMedia(fileIndex);
                }
            }
        }
    } catch (error) {
        console.error('Error loading media:', error);
        showMessage('שגיאה בטעינת קובץ המדיה', 'error');
    }
}

// Prompt for local file
function promptForLocalFile(expectedPath) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            // Handle local file playback
            showMessage('קובץ נטען בהצלחה', 'success');
        }
    };
    
    input.click();
}

// Removed loadSidebarProjects - handled by sidebar.js

// Update sidebar stats
function updateSidebarStats(stats) {
    const activeElement = document.getElementById('activeProjectsCount');
    if (activeElement) {
        activeElement.textContent = stats.active;
    }
    
    const completedElement = document.getElementById('completedThisMonth');
    if (completedElement) {
        completedElement.textContent = stats.completed;
    }
    
    const pendingElement = document.getElementById('pendingProjects');
    if (pendingElement) {
        pendingElement.textContent = stats.pending;
    }
    
    const totalElement = document.getElementById('totalProjects');
    if (totalElement) {
        totalElement.textContent = stats.total;
    }
}

// Message system
function showMessage(text, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 30px;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
    `;
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Auto-save every 2 minutes
setInterval(() => {
    if (currentProjectId) {
        saveTranscription();
    }
}, 120000);

// Save transcription
async function saveTranscription() {
    if (!currentProjectId) {
        showMessage('לא נבחר פרויקט לשמירה', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('project_id', currentProjectId);
        
        if (window.textEditor) {
            formData.append('transcription_text', textEditor.getText());
        }
        
        if (window.speakersManager) {
            formData.append('speakers_list', speakersManager.getSpeakersText());
        }
        
        if (window.remarksManager) {
            formData.append('notes', remarksManager.getRemarksText());
        }

        const response = await fetch(`${API_URL}/projects.php?action=update`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showMessage('התמלול נשמר בהצלחה', 'success');
        } else {
            throw new Error(data.error || 'Failed to save transcription');
        }
    } catch (error) {
        showMessage('שגיאה בשמירת התמלול: ' + error.message, 'error');
    }
}

// Complete transcription
async function completeTranscription() {
    if (!currentProjectId) {
        showMessage('לא נבחר פרויקט', 'error');
        return;
    }

    if (confirm('האם אתה בטוח שסיימת את התמלול?')) {
        try {
            // First save current work
            await saveTranscription();
            
            // Then mark as completed
            const formData = new FormData();
            formData.append('project_id', currentProjectId);
            formData.append('status', 'completed');

            const response = await fetch(`${API_URL}/projects.php?action=update`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showMessage('התמלול הושלם בהצלחה!', 'success');
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '../main/index.php' + getQueryString();
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to complete transcription');
            }
        } catch (error) {
            showMessage('שגיאה בהשלמת התמלול: ' + error.message, 'error');
        }
    }
}

// Global functions
window.saveTranscription = saveTranscription;
window.completeTranscription = completeTranscription;
window.showMessage = showMessage;
window.selectProject = selectProject;
window.loadProject = loadProject;

// Debug function to manually set project name
window.setProjectName = function(name) {
    const el = document.getElementById('projectName');
    if (el) {
        el.textContent = name;
        console.log('Project name set to:', name);
    } else {
        console.error('Project name element not found!');
    }
};

// Debug function to list all projects
window.listProjects = function() {
    const projects = document.querySelectorAll('.project-item');
    console.log('Found', projects.length, 'projects:');
    projects.forEach((p, i) => {
        console.log(`${i}: ${p.dataset.projectId} - ${p.querySelector('.project-item-title')?.textContent} ${p.classList.contains('active') ? '(ACTIVE)' : ''}`);
    });
};

// Debug function to manually switch project
window.switchToProject = function(projectId) {
    console.log('Manually switching to project:', projectId);
    window.selectProject(projectId);
};

// Debug function to check media player state
window.checkMediaPlayer = function() {
    console.log('===== MEDIA PLAYER STATE =====');
    if (window.mediaPlayer) {
        console.log('Project ID:', window.mediaPlayer.projectId);
        console.log('Current Index:', window.mediaPlayer.currentIndex);
        console.log('Total Files:', window.mediaPlayer.files.length);
        console.log('Files:', window.mediaPlayer.files);
        console.log('Current Player:', window.mediaPlayer.currentPlayer);
        console.log('Current SRC:', window.mediaPlayer.currentPlayer?.src);
    } else {
        console.log('Media player not found!');
    }
    console.log('=============================');
};

// Debug function to force reload media
window.forceReloadMedia = function(projectId) {
    console.log('Force reloading media for project:', projectId);
    if (window.mediaPlayer) {
        console.log('Clearing current media player state...');
        window.mediaPlayer.currentPlayer.pause();
        window.mediaPlayer.currentPlayer.src = '';
        window.mediaPlayer.files = [];
        window.mediaPlayer.currentIndex = -1;
        
        // Force reload the project
        setTimeout(() => {
            window.loadProject(projectId);
        }, 100);
    }
};

// Debug function to manually test media loading
window.testMediaLoad = function(files) {
    console.log('===== TEST MEDIA LOAD =====');
    if (!files) {
        // Create test files
        files = [{
            id: 'test1',
            original_name: 'test-audio.mp3',
            filename: 'test-audio.mp3',
            stream_url: 'http://localhost:8080/api/media-stream.php?file_id=test1&dev=1',
            file_type: 'audio/mp3'
        }];
    }
    
    if (window.mediaPlayer) {
        console.log('Calling mediaPlayer.loadFiles with test files');
        window.mediaPlayer.loadFiles(files, 'TEST_PROJECT');
    } else {
        console.error('Media player not found!');
    }
};

// Debug function to directly call loadFile
window.testLoadFile = function(index = 0) {
    console.log('===== TEST LOAD FILE =====');
    if (window.mediaPlayer) {
        console.log('Current files:', window.mediaPlayer.files);
        console.log('Calling loadFile with index:', index);
        window.mediaPlayer.loadFile(index);
    } else {
        console.error('Media player not found!');
    }
};

// Debug function to test with actual current media files
window.testWithCurrentFiles = function() {
    console.log('===== TEST WITH CURRENT FILES =====');
    if (window.mediaPlayer && currentMediaFiles && currentMediaFiles.length > 0) {
        console.log('Current media files:', currentMediaFiles);
        console.log('Calling mediaPlayer.loadFiles with current files');
        window.mediaPlayer.loadFiles(currentMediaFiles, currentProjectId);
    } else {
        console.error('No current media files available');
        console.log('currentMediaFiles:', currentMediaFiles);
        console.log('mediaPlayer:', !!window.mediaPlayer);
    }
};