/**
 * Final Fix - Complete solution for media loading
 */

console.log('Final Fix: Initializing...');

// Wait for page to fully load
window.addEventListener('load', function() {
    console.log('Final Fix: Page loaded, applying fixes...');
    
    // 1. Remove any test/demo projects
    setTimeout(() => {
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            const title = item.querySelector('.project-item-title');
            if (title && (title.textContent.includes('דוגמה') || title.textContent.includes('test-'))) {
                console.log('Removing demo project:', title.textContent);
                item.remove();
            }
        });
    }, 500);
    
    // 2. Force reload real projects after 1 second
    setTimeout(() => {
        console.log('Final Fix: Force reloading real projects...');
        if (window.reloadProjects) {
            window.reloadProjects();
        }
    }, 1500);
    
    // 3. Fix media player visibility
    const audioContainer = document.getElementById('audioModeContainer');
    if (audioContainer) {
        audioContainer.style.display = 'block';
        audioContainer.style.minHeight = '200px';
    }
    
    // 4. Override media loading to ensure it works
    window.loadMediaDirectly = function(url, name) {
        console.log('Loading media directly:', name, url);
        
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer) {
            // Ensure full URL
            if (!url.startsWith('http')) {
                url = 'http://localhost:8080' + url;
            }
            
            audioPlayer.src = url;
            audioPlayer.load();
            
            // Update display
            const fileName = document.getElementById('fileName');
            if (fileName) fileName.textContent = name;
            
            // Auto play
            audioPlayer.play().catch(e => {
                console.log('Auto-play blocked, user needs to click play');
            });
        }
    };
});

// Add keyboard shortcut to force reload
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        console.log('Force reload triggered');
        if (window.reloadProjects) {
            window.reloadProjects();
        }
    }
});

console.log('Final Fix: Ready. Press Ctrl+R to reload projects.');