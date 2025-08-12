/*
 * =========================================
 * Sidebar Component JavaScript
 * components/sidebar/sidebar.js
 * =========================================
 * Handles sidebar functionality and project list
 */

// Sidebar functionality
let sidebarTimeout;

function showSidebar() {
    clearTimeout(sidebarTimeout);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.add('show');
    // Don't show overlay - it makes everything dark
    // overlay.classList.add('show');
    mainContent.classList.add('sidebar-open');
}

function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // Don't allow hide if sidebar is locked
    if (sidebar.classList.contains('locked')) {
        return;
    }
    
    sidebarTimeout = setTimeout(() => {
        const overlay = document.getElementById('overlay');
        const mainContent = document.getElementById('mainContent');
        
        sidebar.classList.remove('show');
        // overlay.classList.remove('show');
        mainContent.classList.remove('sidebar-open');
    }, 1000); // 1 second after mouse leaves
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('overlay');
    
    // Don't allow toggle if sidebar is locked
    if (sidebar.classList.contains('locked')) {
        return;
    }

    sidebar.classList.toggle('show');
    mainContent.classList.toggle('sidebar-open');
    // overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('overlay');
    
    // Don't allow close if sidebar is locked
    if (sidebar.classList.contains('locked')) {
        return;
    }

    sidebar.classList.remove('show');
    mainContent.classList.remove('sidebar-open');
    // overlay.classList.remove('show');
}

// Use the selectProject function from transcription-app.js
// The global selectProject function will handle everything

// Project navigation - Removed duplicate functions (they're in navigation.js)

// Helper files toggle
function toggleHelperFiles() {
    const trigger = document.getElementById('helperFilesTrigger');
    const section = document.getElementById('helperFilesSection');
    
    trigger.classList.toggle('active');
    section.classList.toggle('show');
}

// Load projects into sidebar
async function loadSidebarProjects() {
    console.log('Loading sidebar projects...');
    try {
        // Get dev parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        const isDev = urlParams.get('dev') === '1';
        
        // Use the correct server API endpoint
        const baseUrl = window.location.protocol + '//' + window.location.hostname + ':8080';
        const apiPath = baseUrl + '/api/projects.php';
        
        // Always use dev=1 for cross-port requests to bypass authentication
        const fullUrl = apiPath + '?dev=1&action=list';
        
        console.log('Fetching projects from:', fullUrl);
        
        const response = await fetch(fullUrl, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Failed to load projects:', response.status);
            console.error('Response:', await response.text());
            return;
        }
        
        const data = await response.json();
        console.log('Projects API response:', data);
        console.log('Current user ID from window:', window.SESSION_USER_ID);
        console.log('Current user ID from session storage:', sessionStorage.getItem('user_id'));
        console.log('Current user ID from local storage:', localStorage.getItem('user_id'));
        console.log('Number of projects:', data.projects ? data.projects.length : 0);
        if (data.projects && data.projects.length > 0) {
            console.log('First project:', data.projects[0]);
            console.log('All projects with file counts:');
            data.projects.forEach(p => {
                console.log(`- ${p.title} (ID: ${p.id}) - Files: ${p.file_count} - Type: ${p.id.toString().startsWith('IND_') ? 'Independent' : 'CRM'}`);
            });
        }
        
        if (data.success && data.projects) {
            const projectList = document.getElementById('projectList');
            
            // Clear existing content
            projectList.innerHTML = '';
            
            if (data.projects.length === 0) {
                projectList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">
                        <p>אין פרויקטים פעילים</p>
                        <p style="font-size: 14px;">גרור קבצי מדיה לכאן ליצירת פרויקט חדש</p>
                    </div>
                `;
            } else {
                // Debug: Log each project being added
                console.log('Adding projects to sidebar:');
                
                // Add each project
                data.projects.forEach((project, index) => {
                    console.log(`Project ${index + 1}:`, {
                        id: project.id,
                        title: project.title || project.name,
                        type: project.work_type,
                        files: project.file_count
                    });
                    const projectItem = document.createElement('div');
                    projectItem.className = 'project-item';
                    projectItem.dataset.projectId = String(project.id); // Convert to string
                    if (index === 0) projectItem.classList.add('active');
                    
                    const typeIcon = {
                        'transcription': '📝',
                        'proofreading': '✏️',
                        'export': '📄'
                    };
                    
                    const workTypeHebrew = {
                        'transcription': 'תמלול',
                        'proofreading': 'הגהה',
                        'export': 'ייצוא'
                    };
                    
                    // Determine if it's CRM or independent project
                    const projectId = String(project.id); // Convert to string to handle numeric IDs
                    const isIndependent = projectId && projectId.startsWith('IND_');
                    const projectType = isIndependent ? 'independent' : 'crm';
                    const companyName = project.company_name || (isIndependent ? 'עצמאי' : 'חברה');
                    
                    projectItem.innerHTML = `
                        <div class="project-type-badge ${projectType}">${companyName}</div>
                        <div class="project-item-title">${project.title || project.name}</div>
                        <div class="project-item-meta">
                            <span>סוג: ${workTypeHebrew[project.work_type] || 'תמלול'}</span>
                            <span>סטטוס: ${project.status || 'פעיל'}</span>
                            <span>קבצים: ${project.file_count || 0}</span>
                        </div>
                        ${project.media_count ? `
                        <div class="project-media-info">
                            <span>🎵 ${project.media_count} מדיה</span>
                            ${project.duration ? `<span>⏱️ ${project.duration}</span>` : ''}
                        </div>
                        ` : ''}
                    `;
                    
                    projectList.appendChild(projectItem);
                });
                
                // Update stats
                updateSidebarStats(data.projects);
                
                // Load first project automatically
                if (data.projects.length > 0 && !window.projectAlreadyLoaded) {
                    const firstProject = data.projects[0];
                    if (typeof loadProject === 'function') {
                        window.projectAlreadyLoaded = true;
                        loadProject(firstProject.id);
                    }
                    
                    // Update current media display
                    const currentMediaEl = document.querySelector('.current-media');
                    if (currentMediaEl) {
                        currentMediaEl.textContent = firstProject.title;
                    }
                }
            }
            
            // Set up click handlers
            setupProjectClickHandlers();
            
            // Update navigation buttons
            if (typeof updateNavigationButtons === 'function') {
                setTimeout(() => {
                    updateNavigationButtons();
                    // Also ensure previous button is enabled if we're not on first project
                    const prevBtn = document.getElementById('prevProjectBtn');
                    const projectItems = document.querySelectorAll('.project-item');
                    const activeItem = document.querySelector('.project-item.active');
                    if (prevBtn && activeItem && projectItems.length > 1) {
                        const currentIndex = Array.from(projectItems).indexOf(activeItem);
                        if (currentIndex > 0) {
                            prevBtn.disabled = false;
                        }
                    }
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Don't show test projects anymore
        const projectList = document.getElementById('projectList');
        if (projectList) {
            projectList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: #dc3545;">
                    <p>שגיאה בטעינת פרויקטים</p>
                    <p style="font-size: 14px;">נסה לרענן את הדף</p>
                </div>
            `;
        }
    }
}

// Test projects function removed - only real projects now

// Update sidebar statistics
function updateSidebarStats(projects) {
    const stats = {
        active: projects.filter(p => p.status === 'active' || p.status === 'in_progress' || p.status === 'pending').length,
        completed: projects.filter(p => p.status === 'completed').length,
        pending: projects.filter(p => p.status === 'pending' || p.status === 'waiting').length,
        total: projects.length
    };
    
    // Update stat elements by ID
    const totalEl = document.getElementById('totalProjectsCount');
    const activeEl = document.getElementById('activeProjectsCount');
    const completedEl = document.getElementById('completedThisMonth');
    const pendingEl = document.getElementById('pendingProjects');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (activeEl) activeEl.textContent = stats.active;
    if (completedEl) completedEl.textContent = stats.completed;
    if (pendingEl) pendingEl.textContent = stats.pending;
}

// Set up click handlers for project items
function setupProjectClickHandlers() {
    const projectItems = document.querySelectorAll('.project-item');
    console.log('[setupProjectClickHandlers] Setting up handlers for', projectItems.length, 'project items');
    
    projectItems.forEach((item, index) => {
        // Remove any existing listeners first
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', function(e) {
            // Prevent sidebar from closing
            e.stopPropagation();
            clearTimeout(sidebarTimeout);
            
            console.log('[Project Click] ===== PROJECT CLICKED =====');
            console.log('[Project Click] Index:', index);
            console.log('[Project Click] Project ID:', this.dataset.projectId);
            console.log('[Project Click] Event target:', e.target);
            
            // Remove active class from all items
            document.querySelectorAll('.project-item').forEach(p => p.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update the current media display
            const projectTitle = this.querySelector('.project-item-title').textContent;
            const currentMediaEl = document.querySelector('.current-media');
            if (currentMediaEl) {
                currentMediaEl.textContent = projectTitle;
            }
            
            // Load project
            const projectId = this.dataset.projectId;
            
            // Check what functions are available
            console.log('[Project Click] window.selectProject exists:', typeof window.selectProject);
            console.log('[Project Click] window.loadProject exists:', typeof window.loadProject);
            
            // Try to load the project
            if (window.selectProject && typeof window.selectProject === 'function') {
                console.log('[Project Click] Calling window.selectProject with ID:', projectId);
                window.selectProject(projectId);
            } else if (window.loadProject && typeof window.loadProject === 'function') {
                console.log('[Project Click] Calling window.loadProject with ID:', projectId);
                window.loadProject(projectId);
            } else {
                console.error('[Project Click] ERROR: No project loading function found!');
                console.error('[Project Click] Available functions:', Object.keys(window).filter(k => k.includes('Project')));
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load projects
    loadSidebarProjects();
    
    // Set up initial click handlers
    setupProjectClickHandlers();
    
    // Set up sidebar hover for top corner only
    const revealZone = document.getElementById('sidebarRevealZone');
    const sidebar = document.getElementById('sidebar');
    
    if (revealZone && sidebar) {
        // Prevent sidebar from closing when clicking inside it
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(sidebarTimeout);
        });
        
        // Show sidebar on hover
        revealZone.addEventListener('mouseenter', () => {
            clearTimeout(sidebarTimeout);
            showSidebar();
        });
        
        // Keep sidebar open when hovering over it
        sidebar.addEventListener('mouseenter', () => {
            clearTimeout(sidebarTimeout);
        });
        
        // Hide when leaving both zones
        revealZone.addEventListener('mouseleave', (e) => {
            // Check if mouse is going to sidebar
            const toElement = e.relatedTarget;
            if (!toElement || !toElement.closest('#sidebar')) {
                hideSidebar();
            }
        });
        
        sidebar.addEventListener('mouseleave', (e) => {
            // Don't hide if sidebar is locked
            if (sidebar.classList.contains('locked')) {
                return;
            }
            
            // Check if mouse is going to reveal zone
            const toElement = e.relatedTarget;
            if (!toElement || !toElement.closest('#sidebarRevealZone')) {
                hideSidebar();
            }
        });
    }
});