/**
 * Context Menu for Locking/Unlocking Navigation Bar and Sidebar
 */

class ContextMenuManager {
    constructor() {
        this.contextMenu = null;
        this.currentTarget = null;
        this.navbarLocked = false;
        this.sidebarLocked = false;
        this.init();
    }

    init() {
        console.log('Initializing ContextMenuManager');
        
        // Create context menu element
        this.createContextMenu();
        
        // Add event listeners
        this.setupEventListeners();
        
        // Load saved lock states
        this.loadLockStates();
        
        console.log('ContextMenuManager initialized successfully');
    }

    createContextMenu() {
        console.log('Creating context menu element');
        
        // Remove existing menu if any
        const existing = document.getElementById('contextMenu');
        if (existing) {
            console.log('Removing existing context menu');
            existing.remove();
        }

        // Create menu element
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'contextMenu';
        this.contextMenu.className = 'context-menu';
        document.body.appendChild(this.contextMenu);
        
        console.log('Context menu created and added to DOM');
        console.log('Context menu element:', this.contextMenu);
    }

    setupEventListeners() {
        console.log('Setting up context menu event listeners');
        
        // Prevent default context menu on navigation bar and sidebar
        document.addEventListener('contextmenu', (e) => {
            console.log('Right-click detected on:', e.target);
            console.log('Element classes:', e.target.className);
            console.log('Parent element:', e.target.parentElement);
            
            const navbar = e.target.closest('.nav') || e.target.closest('.navigation-bar') || e.target.closest('.combined-navigation-bar') || e.target.closest('.collapsible-header');
            const sidebar = e.target.closest('.sidebar');
            
            console.log('Navbar found:', !!navbar);
            console.log('Sidebar found:', !!sidebar);
            
            if (navbar || sidebar) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('Context menu triggered for:', navbar ? 'navbar' : 'sidebar');
                this.showContextMenu(e, navbar ? 'navbar' : 'sidebar');
                return false;
            }
        }, true); // Use capture phase

        // Hide menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });

        // Hide menu on scroll
        window.addEventListener('scroll', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(event, target) {
        console.log('showContextMenu called with target:', target);
        console.log('Context menu element:', this.contextMenu);
        console.log('Context menu exists in DOM:', !!document.getElementById('contextMenu'));
        
        this.currentTarget = target;
        
        // Build menu items - show both options regardless of where clicked
        let menuItems = '';
        
        const navbarLocked = this.navbarLocked;
        const sidebarLocked = this.sidebarLocked;
        
        // Navigation bar option (now functional)
        menuItems += `
            <div class="context-menu-item" onclick="contextMenuManager.toggleNavbarLock()">
                <span class="context-menu-icon">${navbarLocked ? '🔓' : '🔒'}</span>
                <span>${navbarLocked ? 'בטל נעילת כותרת' : 'נעל כותרת'}</span>
            </div>
        `;
        
        // Sidebar option (functional)
        menuItems += `
            <div class="context-menu-item" onclick="contextMenuManager.toggleSidebarLock()">
                <span class="context-menu-icon">${sidebarLocked ? '🔓' : '🔒'}</span>
                <span>${sidebarLocked ? 'בטל נעילת סרגל צד' : 'נעל סרגל צד'}</span>
            </div>
        `;
        
        // Add separator and both option
        menuItems += `
            <div class="context-menu-item separator"></div>
            <div class="context-menu-item" onclick="contextMenuManager.lockBoth()">
                <span class="context-menu-icon">🔒</span>
                <span>נעל הכל</span>
            </div>
            <div class="context-menu-item" onclick="contextMenuManager.unlockBoth()">
                <span class="context-menu-icon">🔓</span>
                <span>בטל נעילת הכל</span>
            </div>
        `;
        
        this.contextMenu.innerHTML = menuItems;
        
        // Position menu
        const x = event.pageX;
        const y = event.pageY;
        
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        // Show menu
        console.log('About to show context menu');
        console.log('Context menu classes before:', this.contextMenu.className);
        this.contextMenu.classList.add('show');
        console.log('Context menu classes after:', this.contextMenu.className);
        console.log('Context menu computed display:', window.getComputedStyle(this.contextMenu).display);
        console.log('Context menu computed z-index:', window.getComputedStyle(this.contextMenu).zIndex);
        
        // Adjust position if menu goes off screen
        const rect = this.contextMenu.getBoundingClientRect();
        console.log('Context menu bounding rect:', rect);
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        this.contextMenu.classList.remove('show');
    }

    toggleNavbarLock() {
        this.navbarLocked = !this.navbarLocked;
        this.updateNavbarLock();
        this.hideContextMenu();
    }

    toggleSidebarLock() {
        this.sidebarLocked = !this.sidebarLocked;
        this.updateSidebarLock();
        this.hideContextMenu();
    }

    lockBoth() {
        this.navbarLocked = true;
        this.sidebarLocked = true;
        this.updateNavbarLock();
        this.updateSidebarLock();
        this.hideContextMenu();
    }

    unlockBoth() {
        this.navbarLocked = false;
        this.sidebarLocked = false;
        this.updateNavbarLock();
        this.updateSidebarLock();
        this.hideContextMenu();
    }

    updateNavbarLock() {
        const headerRevealZone = document.querySelector('.header-reveal-zone');
        const collapsibleHeader = document.querySelector('.collapsible-header');
        const body = document.body;
        const html = document.documentElement;
        const sidebar = document.querySelector('.sidebar');
        
        if (collapsibleHeader) {
            if (this.navbarLocked) {
                // Lock the navigation bar
                collapsibleHeader.classList.add('locked');
                collapsibleHeader.classList.add('show');
                body.classList.add('navbar-locked');
                html.classList.add('navbar-locked');
                this.addLockIndicator(collapsibleHeader);
                
                // Adjust sidebar position (whether locked or not)
                if (sidebar) {
                    sidebar.style.top = '50px'; // Height of navbar
                }
                
                // Disable hover functionality when locked
                if (headerRevealZone) {
                    headerRevealZone.style.pointerEvents = 'none';
                }
            } else {
                // Unlock the navigation bar
                collapsibleHeader.classList.remove('locked');
                collapsibleHeader.classList.remove('show');
                body.classList.remove('navbar-locked');
                html.classList.remove('navbar-locked');
                this.removeLockIndicator(collapsibleHeader);
                
                // Reset sidebar position
                if (sidebar) {
                    sidebar.style.top = '0';
                }
                
                // Re-enable hover functionality
                if (headerRevealZone) {
                    headerRevealZone.style.pointerEvents = 'auto';
                }
            }
        }
        
        this.saveLockStates();
    }

    updateSidebarLock() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const workspace = document.querySelector('.transcription-workspace');
        const body = document.body;
        const html = document.documentElement;
        
        if (sidebar && mainContent) {
            if (this.sidebarLocked) {
                sidebar.classList.add('locked');
                mainContent.classList.add('sidebar-locked');
                if (workspace) workspace.classList.add('sidebar-locked');
                body.classList.add('sidebar-locked');
                html.classList.add('sidebar-locked');
                this.addLockIndicator(sidebar);
                
                // Ensure sidebar is visible when locked
                sidebar.classList.add('show');
                
                // Hide overlay when locked
                const overlay = document.getElementById('overlay');
                if (overlay) {
                    overlay.classList.remove('show');
                }
                
                // Adjust position if navbar is also locked
                if (this.navbarLocked) {
                    sidebar.style.top = '50px';
                }
            } else {
                sidebar.classList.remove('locked');
                mainContent.classList.remove('sidebar-locked');
                if (workspace) workspace.classList.remove('sidebar-locked');
                body.classList.remove('sidebar-locked');
                html.classList.remove('sidebar-locked');
                this.removeLockIndicator(sidebar);
            }
        }
        
        this.saveLockStates();
    }

    addLockIndicator(element) {
        // Remove existing indicator
        this.removeLockIndicator(element);
        
        // Add new indicator
        const indicator = document.createElement('div');
        indicator.className = 'lock-indicator';
        indicator.innerHTML = '🔒';
        element.appendChild(indicator);
    }

    removeLockIndicator(element) {
        const indicator = element.querySelector('.lock-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    saveLockStates() {
        localStorage.setItem('navbarLocked', this.navbarLocked);
        localStorage.setItem('sidebarLocked', this.sidebarLocked);
    }

    loadLockStates() {
        this.navbarLocked = localStorage.getItem('navbarLocked') === 'true';
        this.sidebarLocked = localStorage.getItem('sidebarLocked') === 'true';
        
        if (this.navbarLocked) {
            this.updateNavbarLock();
        }
        if (this.sidebarLocked) {
            this.updateSidebarLock();
        }
    }
}

// Initialize context menu manager
let contextMenuManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - Creating ContextMenuManager instance');
    contextMenuManager = new ContextMenuManager();
    // Export for global access
    window.contextMenuManager = contextMenuManager;
    console.log('ContextMenuManager instance created and assigned to window');
});