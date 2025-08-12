/*
 * =========================================
 * Header Component JavaScript
 * components/header/header.js
 * =========================================
 * Handles collapsible header functionality
 */

console.log('header.js file loaded');

// Header functions
let headerTimeout;

function showHeader() {
    console.log('showHeader called');
    clearTimeout(headerTimeout);
    const header = document.getElementById('collapsibleHeader');
    if (!header) {
        console.error('Header element not found!');
        return;
    }
    // Only show if not locked
    if (!header.classList.contains('locked')) {
        header.classList.add('show');
        console.log('Header show class added');
    }
}

function hideHeader() {
    const header = document.getElementById('collapsibleHeader');
    // Only hide if not locked
    if (!header.classList.contains('locked')) {
        headerTimeout = setTimeout(() => {
            header.classList.remove('show');
        }, 1500);
    }
}

// Initialize header events on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Header JS loaded');
    const revealZone = document.getElementById('headerRevealZone');
    const header = document.getElementById('collapsibleHeader');
    
    console.log('Reveal zone:', revealZone);
    console.log('Header:', header);
    
    if (revealZone && header) {
        // Simple hover to show
        revealZone.addEventListener('mouseenter', function() {
            console.log('Mouse entered reveal zone');
            showHeader();
        });
        
        // Keep header visible when hovering over it
        header.addEventListener('mouseenter', showHeader);
        header.addEventListener('mouseleave', hideHeader);
        
        // Hide when leaving reveal zone
        revealZone.addEventListener('mouseleave', hideHeader);
    } else {
        console.error('Header elements not found!');
    }
    
    // Test: show header after 2 seconds
    setTimeout(function() {
        console.log('Test: showing header');
        showHeader();
    }, 2000);
});