/**
 * Real Projects Loader - Loads actual projects, no demos
 */

console.log('Real Projects Loader: Starting...');

// Force reload projects from real API
async function loadRealProjects() {
    console.log('Loading real projects from API...');
    
    try {
        const response = await fetch('http://localhost:8080/api/get-all-projects.php');
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success && data.projects) {
            const projectList = document.getElementById('projectList');
            if (!projectList) {
                console.error('Project list element not found!');
                return;
            }
            
            // Clear any existing content
            projectList.innerHTML = '';
            
            if (data.projects.length === 0) {
                projectList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">
                        <p>אין פרויקטים</p>
                        <p style="font-size: 14px;">העלה קבצים ליצירת פרויקט חדש</p>
                    </div>
                `;
            } else {
                // Add real projects
                data.projects.forEach((project, index) => {
                    const projectItem = document.createElement('div');
                    projectItem.className = 'project-item';
                    projectItem.dataset.projectId = project.id;
                    if (index === 0) projectItem.classList.add('active');
                    
                    // Different icon for independent projects
                    const icon = project.is_independent ? '📋' : '📁';
                    const typeLabel = project.is_independent ? ' (עצמאי)' : '';
                    
                    projectItem.innerHTML = `
                        <div class="project-item-icon">${icon}</div>
                        <div class="project-item-info">
                            <div class="project-item-title">${project.title || 'Project ' + project.id}${typeLabel}</div>
                            <div class="project-item-meta">
                                <span>קבצים: ${project.file_count || 0}</span>
                                <span>סטטוס: ${project.status || 'pending'}</span>
                            </div>
                        </div>
                    `;
                    
                    // Add click handler
                    projectItem.addEventListener('click', function() {
                        console.log('Project clicked:', project.id);
                        
                        // Update active state
                        document.querySelectorAll('.project-item').forEach(p => p.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Load project based on type
                        if (project.is_independent) {
                            // Load independent project
                            loadIndependentProject(project.id);
                        } else if (window.loadProject) {
                            // Load regular project
                            window.loadProject(project.id);
                        } else {
                            console.error('loadProject function not found!');
                        }
                    });
                    
                    projectList.appendChild(projectItem);
                });
                
                console.log(`Loaded ${data.projects.length} real projects`);
            }
        }
    } catch (error) {
        console.error('Error loading real projects:', error);
    }
}

// Override the sidebar loading function
window.loadSidebarProjects = loadRealProjects;

// Load projects on page load
window.addEventListener('load', () => {
    setTimeout(loadRealProjects, 1000);
});

// Add manual reload function
window.reloadProjects = loadRealProjects;

// Function to load independent project
async function loadIndependentProject(projectId) {
    console.log('Loading independent project:', projectId);
    
    try {
        const response = await fetch(`load_independent_project.php?project_id=${projectId}`);
        const data = await response.json();
        
        if (data.success) {
            console.log('Independent project loaded:', data);
            
            // Update project title
            const projectTitle = document.querySelector('.project-title');
            if (projectTitle) {
                projectTitle.textContent = data.project.title;
            }
            
            // Load media files
            if (data.files && data.files.length > 0) {
                // If there's a loadMediaFile function, use it
                if (window.loadMediaFile) {
                    // Load the first media file
                    window.loadMediaFile(data.files[0].path, data.files[0].name);
                } else {
                    console.log('Media files:', data.files);
                    // Update audio player if exists
                    const audioPlayer = document.querySelector('audio');
                    if (audioPlayer && data.files[0]) {
                        audioPlayer.src = data.files[0].path;
                        console.log('Set audio source to:', data.files[0].path);
                    }
                }
            }
            
            // Load transcription content
            if (data.transcription) {
                const editor = document.querySelector('#editor, .editor-content, textarea');
                if (editor) {
                    if (editor.tagName === 'TEXTAREA') {
                        editor.value = data.transcription;
                    } else {
                        editor.textContent = data.transcription;
                    }
                }
            }
            
            // Store current project info
            window.currentProject = {
                id: projectId,
                type: 'independent',
                data: data.project,
                files: data.files
            };
            
        } else {
            console.error('Error loading independent project:', data.error);
            alert('שגיאה בטעינת הפרויקט: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading independent project:', error);
        alert('שגיאה בטעינת הפרויקט');
    }
}

console.log('Real Projects Loader: Ready. Call reloadProjects() to reload.');