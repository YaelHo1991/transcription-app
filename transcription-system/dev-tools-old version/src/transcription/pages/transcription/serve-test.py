#!/usr/bin/env python3
import http.server
import socketserver
import os

# Change to the current directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # Handle PHP includes by serving the HTML directly
        if self.path.endswith('.html'):
            # For PHP includes, we'll serve the media-player.html directly
            if 'test-video-cube-fixed' in self.path:
                # Serve a modified version without PHP
                self.serve_test_page()
                return
        super().do_GET()
    
    def serve_test_page(self):
        """Serve the test page with the media player included directly"""
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        # Read the media player HTML
        media_player_path = 'components/media-player/player/media-player.html'
        with open(media_player_path, 'r', encoding='utf-8') as f:
            media_player_content = f.read()
        
        # Create the full test page
        html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Video Cube - Fixed Version</title>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f0f0f0;
        }}
        
        .test-controls {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}
        
        button {{
            padding: 10px 20px;
            margin: 5px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }}
        
        button:hover {{
            background: #218838;
        }}
        
        #status {{
            margin-top: 20px;
            padding: 10px;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            color: #155724;
        }}
        
        .media-player-section {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
    </style>
</head>
<body>
    <div class="test-controls">
        <h1>Video Cube Test - Fixed Version</h1>
        <p>Click the buttons below to test the video cube functionality:</p>
        
        <button onclick="loadTestVideo()">Load Test Video</button>
        <button onclick="showVideoCubeDirectly()">Show Video Cube Directly</button>
        <button onclick="hideVideoCube()">Hide Video Cube</button>
        <button onclick="checkStatus()">Check Status</button>
        
        <div id="status">Status: Ready</div>
    </div>
    
    <!-- Include the media player component -->
    <div class="media-player-section">
        {media_player_content}
    </div>
    
    <script>
        function updateStatus(msg) {{
            document.getElementById('status').innerHTML = 'Status: ' + msg;
            console.log('[Test]', msg);
        }}
        
        function loadTestVideo() {{
            updateStatus('Loading test video from web...');
            const testUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
            
            if (window.mediaPlayer && window.mediaPlayer.loadMedia) {{
                window.mediaPlayer.loadMedia(testUrl, 'test-video.mp4', 'video/mp4');
                updateStatus('Test video loaded! Check if video cube appears.');
            }} else {{
                updateStatus('Error: mediaPlayer not found!');
            }}
        }}
        
        function showVideoCubeDirectly() {{
            updateStatus('Attempting to show video cube directly...');
            
            if (window.VideoCube && window.VideoCube.show) {{
                window.VideoCube.show();
                updateStatus('Video cube should be visible now!');
            }} else {{
                updateStatus('Error: VideoCube module not found!');
            }}
        }}
        
        function hideVideoCube() {{
            updateStatus('Hiding video cube...');
            
            if (window.VideoCube && window.VideoCube.hide) {{
                window.VideoCube.hide();
                updateStatus('Video cube hidden.');
            }} else {{
                updateStatus('Error: VideoCube module not found!');
            }}
        }}
        
        function checkStatus() {{
            let status = 'Checking status...<br>';
            
            // Check if modules are loaded
            status += '- MediaPlayer: ' + (window.mediaPlayer ? 'Loaded ✓' : 'Not loaded ✗') + '<br>';
            status += '- VideoCube: ' + (window.VideoCube ? 'Loaded ✓' : 'Not loaded ✗') + '<br>';
            
            // Check video cube visibility
            const videoCube = document.getElementById('videoCube');
            if (videoCube) {{
                const isVisible = window.getComputedStyle(videoCube).display !== 'none';
                status += '- Video Cube Element: Found ✓<br>';
                status += '- Video Cube Visible: ' + (isVisible ? 'Yes ✓' : 'No ✗') + '<br>';
                
                // Get position
                const rect = videoCube.getBoundingClientRect();
                status += '- Position: Top=' + rect.top + ', Left=' + rect.left + '<br>';
                status += '- Size: ' + rect.width + 'x' + rect.height + '<br>';
            }} else {{
                status += '- Video Cube Element: Not found ✗<br>';
            }}
            
            updateStatus(status);
        }}
        
        // Auto-check status when page loads
        window.addEventListener('load', function() {{
            setTimeout(checkStatus, 1000);
        }});
    </script>
</body>
</html>"""
        
        self.wfile.write(html.encode('utf-8'))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Test the video cube at: http://localhost:{PORT}/test-video-cube-fixed.html")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()