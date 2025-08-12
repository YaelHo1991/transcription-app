/*
 * =========================================
 * Transcription System - Collapsible Components
 * assets/js/collapsible.js
 * =========================================
 * Unified collapsible header and sidebar functionality
 */

let headerTimeout = null;
let sidebarTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize collapsible components
    initializeCollapsibleComponents();
});

function initializeCollapsibleComponents() {
    const headerRevealZone = document.getElementById('headerRevealZone');
    const sidebarRevealZone = document.getElementById('sidebarRevealZone');
    const header = document.getElementById('collapsibleHeader');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // Check if elements exist before adding event listeners
    if (!headerRevealZone || !sidebarRevealZone || !header || !sidebar || !overlay) {
        console.warn('Collapsible components not found on this page');
        return;
    }
    
    // Header functionality
    headerRevealZone.addEventListener('mouseenter', showHeader);
    header.addEventListener('mouseenter', showHeader);
    header.addEventListener('mouseleave', hideHeader);
    
    // Sidebar functionality
    sidebarRevealZone.addEventListener('mouseenter', showSidebar);
    sidebar.addEventListener('mouseenter', showSidebar);
    sidebar.addEventListener('mouseleave', hideSidebar);
    
    // Overlay functionality
    overlay.addEventListener('click', hideAll);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAll();
        }
    });
}

function showHeader() {
    clearTimeout(headerTimeout);
    const header = document.getElementById('collapsibleHeader');
    if (header) {
        header.classList.add('show');
    }
}

function hideHeader() {
    headerTimeout = setTimeout(() => {
        const header = document.getElementById('collapsibleHeader');
        if (header) {
            header.classList.remove('show');
        }
    }, 1000);
}

function showSidebar() {
    clearTimeout(sidebarTimeout);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) {
        sidebar.classList.add('show');
        overlay.classList.add('show');
    }
}

function hideSidebar() {
    sidebarTimeout = setTimeout(() => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        }
    }, 2000);
}

function hideAll() {
    const header = document.getElementById('collapsibleHeader');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (header) header.classList.remove('show');
    if (sidebar) sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    
    clearTimeout(headerTimeout);
    clearTimeout(sidebarTimeout);
}

// Export functions for use in other scripts
window.CollapsibleComponents = {
    showHeader,
    hideHeader,
    showSidebar,
    hideSidebar,
    hideAll,
    initializeCollapsibleComponents
};