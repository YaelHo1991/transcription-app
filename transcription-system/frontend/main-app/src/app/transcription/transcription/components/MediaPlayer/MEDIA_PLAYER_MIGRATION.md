# Media Player Migration Tracking

## Overview
This document tracks the migration of the media player from HTML/JS to React with Web Workers.
Original location: `src/app/crm/transcription/pages/transcription/components/media-player/`
Target location: `src/app/transcription/transcription/components/MediaPlayer/`

## Migration Status

### Stage 0: Setup & Cleanup ✅
- [x] Delete test-route file
- [x] Initialize git repository  
- [x] Create MEDIA_PLAYER_MIGRATION.md tracking file
- [x] Initial git commit

### Stage 1: Keyboard Shortcuts ✅
- [x] Import all shortcuts from original HTML into React components
  - [x] Playback Control (Play/Pause, Stop)
  - [x] Navigation (Skip forward/backward 2.5s, 5s)
  - [x] Jump controls (Start, End)
  - [x] Volume controls (Up, Down, Mute)
  - [x] Speed controls (Up, Down, Reset)
  - [x] Mode toggles (Shortcuts, Pedal, AutoDetect)
- [x] Integrate KeyboardShortcuts React component into MediaPlayerOriginal
- [x] Map keyboard actions to existing MediaPlayerOriginal functions
- [x] Add keyboard settings state management
- [x] Connect shortcut actions to play/pause, seek, volume, speed controls
- [x] Test keyboard shortcuts integration with original player
- [x] Git commit

### Stage 2: Pedal Integration ✅
- [x] Import exact pedal tab layout from original HTML
  - [x] Header with toggle (same positioning as shortcuts tab)
  - [x] Connection status section
  - [x] Visual pedal interface with 3 buttons
  - [x] Button mapping dropdowns
  - [x] Continuous press settings
  - [x] Rewind on pause settings
- [x] Implement WebHID API connection
- [x] Add HTTPS detection
- [x] User notifications for HTTPS requirement
- [x] Configure for yalitranscription.duckdns.org domain
- [x] HTTP-to-HTTPS redirect for Digital Ocean
- [x] Button mappings
  - [x] Left button configuration (default: forward)
  - [x] Center button configuration (default: play/pause)
  - [x] Right button configuration (default: backward)
- [x] Continuous press functionality
- [x] Rewind on pause feature
- [x] Connection status display
- [x] Test pedal functionality locally
- [x] Fixed dropdown state management (React closure issue)
- [x] Fixed mute/unmute toggle functionality
- [x] Volume controls increment by 5%
- [x] Git commit

### Stage 2.5: Digital Ocean Deployment & HTTPS Testing (Skipped for now)
- [ ] Deploy current version to Digital Ocean
- [ ] Configure HTTPS with yalitranscription.duckdns.org
- [ ] Test pedal connection over HTTPS
- [ ] Verify WebHID API works properly
- [ ] Test HTTP-to-HTTPS redirect
- [ ] Confirm all shortcuts still work
- [ ] Document any deployment issues
- [ ] Git commit deployment configuration
*Note: Skipping this stage temporarily to complete all features first*

### Stage 3: Auto-Detect Typing ✅
- [x] Implement typing detection logic
- [x] Regular mode
  - [x] Pause on typing start
  - [x] Resume after configurable delay
- [x] Enhanced mode
  - [x] Continue during typing
  - [x] Pause on first break
  - [x] Second pause detection
  - [x] Auto-resume functionality
- [x] Delay settings configuration
- [x] Rewind on pause functionality
- [x] Status indicator
- [x] Mode switching
- [x] Test both modes
- [x] Settings UI improvements
  - [x] Centered styling for all settings tabs
  - [x] Custom spinner controls for number inputs
  - [x] Consistent green theme styling
- [x] Bug fixes
  - [x] Fixed Numpad 0 not working in settings
  - [x] Fixed keyboard shortcuts interfering with text input
  - [x] Fixed runtime errors causing infinite loading
  - [x] Fixed pedal auto-reconnect device state errors
- [x] Git commit

### Stage 4: Video Cube ✅
- [x] Implement draggable video window
- [x] Resize functionality
- [x] Position persistence (localStorage)
- [x] Video/audio mode switching
- [x] Minimize/maximize controls
- [x] Aspect ratio maintenance
- [x] Z-index management
- [x] Video playback synchronization
- [x] Media element switching (video/audio)
- [x] Event handler integration
- [x] Git commit

### Stage 5: Waveform Integration ✅
- [x] Generate waveform data
- [x] Display in progress bar
- [x] Visual peaks representation
- [x] Color coding for played/unplayed sections
- [x] Performance optimization
- [x] Responsive scaling
- [x] Integration with existing progress bar
- [x] Loading progress indicator
- [x] Fallback to simple progress bar
- [x] RTL layout support
- [x] Git commit

## Technical Details

### HTTPS Requirements for Pedal
- WebHID API requires secure context (HTTPS)
- Domain configured: yalitranscription.duckdns.org
- Fallback message for HTTP users
- Auto-redirect implementation for production

### Settings Structure
Each tab maintains exact functionality from original:
1. **Shortcuts Tab**: Complete keyboard mapping with customization
2. **Pedal Tab**: 3-button configuration with visual interface
3. **AutoDetect Tab**: Dual-mode typing detection with timing controls

### Testing Checklist
- [ ] Audio playback in all browsers
- [ ] Video playback functionality
- [ ] RTL layout consistency
- [ ] Keyboard shortcuts responsiveness
- [ ] Pedal connection over HTTPS
- [ ] Auto-detect accuracy
- [ ] Settings persistence
- [ ] Performance with large media files

## Notes
- Audio mode confirmed working with RTL progress bar ✅
- Keyboard shortcuts fully functional ✅
- Pedal integration complete with all fixes ✅
- Auto-detect typing implementation complete ✅
- Video cube implementation complete ✅
- Waveform integration complete ✅
- All features must exactly match original HTML player functionality

## Completed Fixes in Stage 2
1. **React Closure Issues**: Fixed stale state in event handlers by reading from localStorage
2. **Mute/Unmute Toggle**: Now checks actual audio volume instead of React state
3. **Volume Controls**: Increments by 5% with proper initialization
4. **Default Pedal Mapping**: Left=Forward, Right=Backward (swapped from original)

## Stage 3 Complete: Auto-Detect Typing Implementation
1. **Separated Auto-Detect Modes**: Created separate TSX files for regular and enhanced modes
2. **Regular Mode**: Immediate pause on typing start, resume after delay with rewind-on-pause
3. **Enhanced Mode**: Three-step logic implementation:
   - Step 1: Playing + typing → pause after delay when typing stops
   - Step 2: Paused + typing → resume after delay when typing stops  
   - Step 3: Paused + no typing → auto-resume after configured delay
4. **UI/UX Improvements**:
   - Centered all settings fields across all tabs
   - Custom spinner controls (+/-) for all number inputs
   - Consistent green theme styling matching page design
   - Better Hebrew RTL text alignment
5. **Critical Bug Fixes**:
   - Fixed Numpad 0 not working in settings/timestamp inputs
   - Fixed keyboard shortcuts interfering with text editor typing
   - Resolved useEffect dependency array issues causing crashes
   - Fixed auto-detect scope to only work in text editor areas
   - Fixed pedal auto-reconnect device state conflicts
6. **Code Quality**: Removed debug logging, improved error handling, TypeScript fixes

## Stage 4 Complete: Video Cube Implementation
1. **Hybrid Integration**: Video cube integrated into media player layout (not floating by default)
2. **Interactive Features**:
   - Double-click to detach and enable drag mode
   - Three control buttons: X (close/reset), − (minimize), ⌂ (restore)
   - Draggable and resizable when detached
3. **State Management**:
   - Minimize saves position/size for restore
   - Close resets everything to defaults
   - Position/size persistence with localStorage
4. **Bug Fixes**:
   - Fixed video playback in regular progress bar mode
   - Changed default from waveform to regular progress bar
   - Fixed dragging immediately after double-click
   - Fixed media player not resetting on minimize/close
5. **Layout Improvements**:
   - Set fixed heights for all components
   - Proper positioning in layout
   - Responsive design maintained

## Stage 5 Complete: Waveform Integration
1. **Waveform Infrastructure**: Leveraged existing WaveformCanvas and WorkerManager components
2. **Audio Analysis**: Web Audio API waveform generation using dedicated web worker for performance
3. **Visual Integration**: 
   - Replaced simple progress bar with interactive waveform visualization
   - RTL layout support with right-to-left progress indication
   - Color-coded played/unplayed sections (turquoise/dark teal)
   - Smooth playhead with glow effect
4. **Performance Optimization**:
   - Off-main-thread audio processing using Web Workers
   - Canvas rendering with device pixel ratio support
   - Efficient peak detection using RMS and max peak combination
   - ~2000 data points for smooth visualization without performance impact
5. **User Experience**:
   - Loading progress indicator during waveform analysis
   - Fallback to simple progress bar if waveform fails/disabled
   - Click-to-seek functionality on waveform
   - Hover time tooltip
   - Seamless integration with existing timestamp editing
6. **Technical Implementation**:
   - WaveformCanvas component with real-time playhead movement
   - WorkerManager event handling for progress/completion/error states
   - Automatic waveform analysis on media load
   - Compatible with both audio and video files

### Stage 5.1: Bug Fixes ✅
- [x] Fix restore button showing when switching from video to audio
- [x] Fix waveform toggle not switching modes
- [x] Fix waveform not visible when media is paused
- [x] Fix waveform showing 'waiting' message after loading
- [x] Fix waveform not appearing until interaction
- [x] Fix waveform disappearing when switching media
- [x] Fix progress bar filling temporarily on media load
- [x] Git commit

### Stage 5.2: Large File Support - Safety & Detection ⏳
- [ ] Add file size detection utility function
- [ ] Implement memory monitoring for browser safety
- [ ] Add file size threshold constants (50MB, 200MB)
- [ ] Create WaveformStrategy enum (client/chunked/server)
- [ ] Add safety checks before waveform analysis
- [ ] Show appropriate messages for large files
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 5.3: Chunked Processing for Medium Files ⏳
- [ ] Create ChunkedWaveformProcessor class
- [ ] Implement 10MB chunk size processing
- [ ] Add chunk-by-chunk audio decoding
- [ ] Progressive peak data merging
- [ ] Memory release after each chunk
- [ ] Progress reporting during chunked analysis
- [ ] Test with 50-200MB files
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 5.4: Backend Waveform Generation ⏳
- [ ] Install FFmpeg for Windows development
- [ ] Create waveform database schema
- [ ] Add waveform generation service in backend
- [ ] Implement REST API endpoints:
  - [ ] POST /api/waveform/generate
  - [ ] GET /api/waveform/:fileId
  - [ ] GET /api/waveform/:fileId/segment
- [ ] Add waveform caching logic
- [ ] Frontend integration for server waveforms
- [ ] Test with 200MB+ files
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 5.5: Performance Optimization ⏳
- [ ] Implement IndexedDB caching for waveforms
- [ ] Add waveform quality settings (low/medium/high)
- [ ] Virtual scrolling for very long waveforms
- [ ] Adaptive detail based on zoom level
- [ ] Memory usage monitoring and reporting
- [ ] Performance metrics collection
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 5.6: Resource Monitoring Integration ✅
- [x] Create system-wide ResourceMonitor service
- [x] Implement memory/CPU/storage checking
- [x] Add operation cost calculations
- [x] Create resource warning UI components
- [x] Integrate with MediaPlayer waveform analysis
- [x] Add automatic fallback strategies
- [x] Log operations for metrics
- [x] Test with various file sizes
- [x] Git commit

**Resource Monitor Features:**
- Prevents browser crashes from large files
- Checks available memory before operations
- Provides warnings in Hebrew and English
- Suggests alternative methods (server-side, chunked)
- Works system-wide for all components
- Minimal performance overhead (< 0.1% CPU)

### Stage 6: Waveform Zoom & Scrolling ⏳
- [ ] Add inline zoom controls (+/- buttons on waveform)
- [ ] Implement zoom levels (1x-10x)
- [ ] Add auto-scroll during playback (keep playhead centered)
- [ ] Manual pan/drag when paused
- [ ] Mouse wheel zoom support (Ctrl+scroll)
- [ ] Zoom level indicator
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 7: Marking System ⏳
- [ ] Define mark types and colors:
  - [ ] 🔴 Skip sections (red)
  - [ ] 🟡 Unclear audio (yellow)
  - [ ] 🟢 Review later (green)
  - [ ] 🟣 Section boundaries (purple)
  - [ ] ➕ Custom marks button (user-defined)
- [ ] Add mark data structure
- [ ] Implement add/remove/edit marks
- [ ] Visual indicators:
  - [ ] Regular mode: small white dots only
  - [ ] Waveform mode: full colored indicators
- [ ] Click to add mark at current position
- [ ] Right-click for mark type menu
- [ ] Drag marks to adjust position
- [ ] LocalStorage persistence per file
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 8: Hidden Toolbar ⏳
- [ ] Create expandable toolbar UI (dot/hamburger icon)
- [ ] Position: top-right corner of waveform
- [ ] Ultra-compact icons when expanded
- [ ] Auto-hide after inactivity
- [ ] Tools to include:
  - [ ] Add mark (with type selector)
  - [ ] Custom mark creator (+)
  - [ ] Navigate between marks
  - [ ] Filter marks by type
  - [ ] Clear all marks
  - [ ] Zoom controls
  - [ ] Loop between marks
  - [ ] Export/import marks
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 9: Text Editor Integration Prep ⏳
- [ ] Create TextEditor folder structure:
  ```
  /components/TextEditor/
    ├── TextEditor.tsx (placeholder)
    ├── TextEditor.css (placeholder)
    ├── types.ts
    ├── hooks/
    │   └── useMediaSync.ts
    └── INTEGRATION.md
  ```
- [ ] Write INTEGRATION.md documentation:
  - [ ] Media player API functions
  - [ ] Mark synchronization protocol
  - [ ] Event listeners for time updates
  - [ ] Navigation commands
  - [ ] Variable names and types
  - [ ] Example code snippets
- [ ] Define synchronization API
- [ ] Create placeholder components
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)

### Stage 10: Mark Navigation & Filtering ⏳
- [ ] Navigation features:
  - [ ] Previous/Next mark buttons
  - [ ] Jump to specific mark
  - [ ] Keyboard shortcuts (Alt+←/→)
- [ ] Filtering system:
  - [ ] Show/hide specific mark types
  - [ ] Isolate marked sections
- [ ] Playback options:
  - [ ] Play only marked sections
  - [ ] Skip marked sections
  - [ ] Loop within marked range
- [ ] Synchronization:
  - [ ] Events for text editor
  - [ ] Bidirectional navigation
  - [ ] Shared mark state
- [ ] **USER TEST & APPROVAL REQUIRED**
- [ ] Git commit (only after approval)