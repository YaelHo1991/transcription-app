# Media Player Component

A modular media player component with floating video support for web applications.

## Features

- **Unified Media Player**: Handles both audio and video files in a single interface
- **Floating Video Cube**: Automatic floating video window for video files
- **Modular Architecture**: Split into small, focused modules for maintainability
- **Keyboard Shortcuts**: Full keyboard control support
- **Responsive Design**: Adapts to different screen sizes
- **Server Synchronization**: Syncs playback state with server

## Installation

1. Copy the entire `media-player` folder to your project
2. Include the loader in your HTML:

```html
<div id="media-player-loader"></div>
<script>
    // Load media player components
    fetch('path/to/media-player/media-player-loader.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('media-player-loader').innerHTML = html;
        });
</script>
```

## Component Architecture

### CSS Modules (14 files)

#### Container Styles (4 files)
- `base-container.css` - Foundation styles for all containers
- `media-container.css` - Main player container layout
- `media-container-sections.css` - Section-specific styling
- `media-container-text.css` - Text/audio mode specific styles

#### Control Styles (7 files)
- `controls-layout.css` - Control section layouts
- `jump-box.css` - Jump forward/backward controls
- `playback-controls.css` - Play/pause button styles
- `progress-bar.css` - Progress bar and seeking
- `progress-layout.css` - Progress section arrangement
- `settings-button.css` - Settings button appearance
- `sliders.css` - Volume and rate sliders

#### Video Cube Styles (4 files)
- `video-cube-base.css` - Core video window styles
- `video-cube-controls.css` - Video window buttons
- `video-cube-states.css` - Different states (minimized, etc.)
- `video-cube-restore.css` - Restore button styles

### JavaScript Modules (22 files)

#### Core Utilities (8 files)
- `debug-config.js` - Debug mode settings
- `element-mapper.js` - DOM element management
- `error-suppression.js` - Error handling
- `force-css-reload.js` - Development utility
- `global-interface.js` - Global functions
- `media-adapter.js` - Media mode adaptation
- `server-sync.js` - Server communication
- `text-editor-bridge.js` - Editor integration

#### Control Modules (5 files)
- `jump-box.js` - Skip forward/backward logic
- `playback-controls.js` - Play/pause functionality
- `progress-bar.js` - Progress tracking and seeking
- `shortcuts-handler.js` - Keyboard shortcuts
- `sliders.js` - Volume and rate controls

#### Loader Modules (4 files)
- `app-initializer.js` - Application startup
- `component-loader.js` - Component initialization
- `media-loader.js` - Media file handling
- `media-player-init.js` - Player initialization

#### Video Cube Modules (7 files)
- `video-cube-controller.js` - Main coordinator
- `video-cube-controls.js` - Button interactions
- `video-cube-dom.js` - DOM creation
- `video-cube-drag-resize.js` - Drag and resize
- `video-cube-loader.js` - Video detection
- `video-cube-positioning.js` - Position management
- `video-cube-sync.js` - Audio sync

## API Functions

### Global Functions

```javascript
// Load audio file
window.loadAudio(src)

// Load video file (automatically shows video cube)
window.loadVideo(src)

// Access media player instance
window.mediaPlayerInit

// Access video cube instance
window.videoCube
```

### Media Player Methods

```javascript
// Playback control
mediaPlayer.play()
mediaPlayer.pause()
mediaPlayer.seek(timeInSeconds)

// Volume control
mediaPlayer.setVolume(0-1)
mediaPlayer.mute()
mediaPlayer.unmute()

// Playback rate
mediaPlayer.setPlaybackRate(rate)
```

### Video Cube Methods

```javascript
// Show/hide video cube
videoCube.show()
videoCube.close()
videoCube.restore()

// Position control
videoCube.resetPosition()
videoCube.toggleMinimize()

// Load video
videoCube.loadVideo(src)
videoCube.clearVideo()
```

## Keyboard Shortcuts

- `Space` - Play/Pause
- `M` - Mute/Unmute
- `Arrow Up/Down` - Volume control
- `Arrow Left/Right` - Seek backward/forward
- `[` / `]` - Decrease/Increase playback rate
- `0-9` - Jump to percentage (e.g., 5 = 50%)

## Configuration

### Debug Mode
Enable debug mode in `debug-config.js`:
```javascript
window.DEBUG_MODE = true;
```

### Custom Styling
Override CSS variables in your stylesheet:
```css
:root {
    --media-player-primary: #17a2b8;
    --media-player-secondary: #20c997;
    --media-player-background: #1a1a1a;
}
```

## Video Cube Features

The video cube automatically appears when a video file is loaded:
- Drag to reposition
- Resize from bottom-right corner
- Minimize to small icon
- Close and show restore button
- Syncs with main audio player controls

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with autoplay restrictions)
- Mobile: Responsive design with touch support

## Development

### File Organization
- CSS files < 120 lines each
- JS files < 150 lines each
- Modular architecture for easy maintenance

### Adding Features
1. Create new module in appropriate folder
2. Add to `media-player-loader.html`
3. Follow existing naming conventions

## Troubleshooting

### Video not showing
- Check if video file extension is supported
- Verify video cube CSS is loaded
- Check console for initialization errors

### Audio sync issues
- Ensure both audio and video elements exist
- Check if `video-cube-sync.js` is loaded
- Verify playback sync is enabled

## License

[Your License Here]