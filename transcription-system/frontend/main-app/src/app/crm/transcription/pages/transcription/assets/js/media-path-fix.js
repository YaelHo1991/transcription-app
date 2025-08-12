/**
 * Media Path Fix - Ensure media files have correct file_path property
 */

console.log('Media Path Fix: Loading...');

// Override the media player init to fix file paths
if (window.MediaPlayer) {
    const originalInit = window.MediaPlayer.prototype.init;
    
    window.MediaPlayer.prototype.init = function(mediaFiles = []) {
        console.log('Media Path Fix: Intercepting init with files:', mediaFiles);
        
        // Fix file paths
        const fixedFiles = mediaFiles.map(file => {
            // Ensure file has file_path property
            if (!file.file_path) {
                // Try different URL formats
                if (file.stream_url) {
                    file.file_path = file.stream_url.startsWith('http') ? 
                        file.stream_url : 'http://localhost:8080' + file.stream_url;
                } else if (file.direct_url) {
                    file.file_path = file.direct_url.startsWith('http') ? 
                        file.direct_url : 'http://localhost:8080' + file.direct_url;
                } else if (file.path) {
                    file.file_path = file.path.startsWith('http') ? 
                        file.path : 'http://localhost:8080/' + file.path;
                }
            }
            
            console.log('Fixed file:', file.original_name, '→', file.file_path);
            return file;
        });
        
        // Call original init with fixed files
        return originalInit.call(this, fixedFiles);
    };
}

// Also fix loadMedia function
if (window.MediaPlayer) {
    const originalLoadMedia = window.MediaPlayer.prototype.loadMedia;
    
    window.MediaPlayer.prototype.loadMedia = function(index) {
        console.log('Media Path Fix: loadMedia called with index:', index);
        
        // Ensure current file has correct path
        if (this.mediaFiles && this.mediaFiles[index]) {
            const file = this.mediaFiles[index];
            
            if (!file.file_path && (file.stream_url || file.direct_url || file.path)) {
                if (file.stream_url) {
                    file.file_path = file.stream_url.startsWith('http') ? 
                        file.stream_url : 'http://localhost:8080' + file.stream_url;
                } else if (file.direct_url) {
                    file.file_path = file.direct_url.startsWith('http') ? 
                        file.direct_url : 'http://localhost:8080' + file.direct_url;
                } else if (file.path) {
                    file.file_path = file.path.startsWith('http') ? 
                        file.path : 'http://localhost:8080/' + file.path;
                }
                
                console.log('Fixed file_path for:', file.original_name, '→', file.file_path);
            }
        }
        
        // Call original function
        if (originalLoadMedia) {
            return originalLoadMedia.call(this, index);
        }
    };
}

console.log('Media Path Fix: Ready');

// Test function
window.testDirectLoad = function() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer) {
        // Try a known working URL
        audioPlayer.src = 'http://localhost:8080/api/stream-media.php?project_id=27&file_name=1752994474_0.MP3';
        audioPlayer.load();
        audioPlayer.play().catch(e => console.log('Play blocked:', e));
        console.log('Direct load test: Loading project 27 MP3');
    }
};

console.log('Use testDirectLoad() to test with a known file');