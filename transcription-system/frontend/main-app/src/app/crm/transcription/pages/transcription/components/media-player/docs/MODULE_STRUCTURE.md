# Media Player Module Structure

## Overview
The media player has been successfully modularized into ES6 modules, with clean separation of concerns and clear boundaries.

## Directory Structure
```
player/
├── media-player.html             # Monolithic reference (Stages 1-12)
├── media-player-modular.html     # Modular HTML structure
├── main.js                       # Main entry point & coordinator
├── styles/
│   └── media-player.css         # Extracted CSS styles
├── modules/
│   ├── player.js                # Core media player functionality
│   ├── controls.js              # Playback control buttons
│   ├── progress-bar.js          # Progress bar & time navigation
│   ├── sliders.js               # Volume & speed controls
│   ├── settings.js              # Settings modal & preferences
│   ├── shortcuts.js             # Keyboard shortcuts handler
│   ├── pedal.js                 # Foot pedal integration
│   ├── auto-detect.js           # Automatic media detection
│   ├── video-cube.js            # Floating video display
│   └── utils.js                 # Shared utility functions
└── monolithic-reference/
    ├── media-player-complete.html
    ├── README.md
    └── MODIFICATION_GUIDE.md
```

## Module Dependencies

### Core Modules

#### `player.js`
- **Exports**: `MediaPlayer` class
- **Dependencies**: None
- **Responsibilities**:
  - Audio element control
  - Playback state management
  - Media loading
  - Time/volume/speed control

#### `controls.js`
- **Exports**: `Controls` class
- **Dependencies**: `player.js`
- **Responsibilities**:
  - Play/pause button
  - Skip forward/backward buttons
  - Loop control
  - Collapse/expand functionality

#### `progress-bar.js`
- **Exports**: `ProgressBar` class
- **Dependencies**: `player.js`, `utils.js`
- **Responsibilities**:
  - Progress bar display
  - Click-to-seek
  - Time display (current/total)
  - RTL-aware positioning

#### `sliders.js`
- **Exports**: `Sliders` class
- **Dependencies**: `player.js`
- **Responsibilities**:
  - Volume control
  - Speed control
  - Overflow detection & stacking
  - Collapse state management

### Settings Modules

#### `settings.js`
- **Exports**: `Settings` class
- **Dependencies**: `utils.js`
- **Responsibilities**:
  - Settings modal UI
  - User preferences storage
  - Settings change events

#### `shortcuts.js`
- **Exports**: `Shortcuts` class
- **Dependencies**: All core modules, `settings.js`, `utils.js`
- **Responsibilities**:
  - Keyboard shortcut handling
  - Shortcuts modal display
  - Action execution

#### `pedal.js`
- **Exports**: `Pedal` class
- **Dependencies**: `player.js`, `utils.js`
- **Responsibilities**:
  - Foot pedal configuration
  - Pedal input handling
  - Action mapping

#### `auto-detect.js`
- **Exports**: `AutoDetect` class
- **Dependencies**: `player.js`, `video-cube.js`, `utils.js`
- **Responsibilities**:
  - Media file detection
  - Automatic loading
  - Multiple source checking

### Display Modules

#### `video-cube.js`
- **Exports**: `VideoCube` class
- **Dependencies**: `utils.js`
- **Responsibilities**:
  - Floating video display
  - Drag & resize functionality
  - Video-audio synchronization

### Utility Module

#### `utils.js`
- **Exports**: Multiple utility functions
- **Dependencies**: None
- **Functions**:
  - `formatTime()` - Time formatting
  - `parseTime()` - Time parsing
  - `isRTL()` - RTL detection
  - `createElement()` - DOM creation
  - `showStatus()` - Toast notifications
  - `loadFromStorage()` - LocalStorage read
  - `saveToStorage()` - LocalStorage write
  - `debounce()` - Function debouncing
  - `throttle()` - Function throttling

## Module Communication

### Event-Based Communication
- Settings changes: `settingsChanged` custom event
- Module coordination through `main.js`
- No direct cross-module dependencies (except through main)

### Global API
Exposed as `window.mediaPlayer`:
```javascript
{
    // Core functions
    loadMedia(src, filename, mediaType)
    play()
    pause()
    togglePlayPause()
    
    // Time control
    getCurrentTime()
    setCurrentTime(seconds)
    getDuration()
    
    // Volume/Speed
    setVolume(value)
    getVolume()
    setPlaybackRate(value)
    getPlaybackRate()
    
    // Settings & UI
    openSettings()
    showVideo(src)
    hideVideo()
    configurePedal()
    toggleAutoDetect(enabled)
    
    // Utility
    showStatus(message, type)
    
    // Debug access
    _modules: { /* all module instances */ }
}
```

## Import/Export Map

### main.js
```javascript
import { MediaPlayer } from './modules/player.js';
import { Controls } from './modules/controls.js';
import { ProgressBar } from './modules/progress-bar.js';
import { Sliders } from './modules/sliders.js';
import { Settings } from './modules/settings.js';
import { Shortcuts } from './modules/shortcuts.js';
import { VideoCube } from './modules/video-cube.js';
import { Pedal } from './modules/pedal.js';
import { AutoDetect } from './modules/auto-detect.js';
import { showStatus } from './modules/utils.js';
```

## Extension Points

### Adding New Features
1. Create new module in `modules/` directory
2. Export class or functions
3. Import in `main.js`
4. Initialize in `MediaPlayerApp` constructor
5. Add to global API if needed

### Modifying Existing Features
1. Locate module using this structure guide
2. Make changes within module boundaries
3. Maintain module interface (exports)
4. Test through global API

## Benefits of Modular Structure

1. **Maintainability**: Each module has single responsibility
2. **Testability**: Modules can be tested independently
3. **Reusability**: Modules can be used in other projects
4. **Scalability**: Easy to add new features as modules
5. **Clarity**: Clear boundaries and dependencies
6. **Performance**: Lazy loading possible if needed

## Migration from Monolithic

The monolithic version (`media-player.html`) is preserved for:
- Quick fixes and testing
- Reference implementation
- Fallback if modules have issues
- Understanding complete flow

When making changes:
- Simple fixes: Use monolithic, then port to modules
- New features: Add as new module
- Major refactoring: Work in modules directly