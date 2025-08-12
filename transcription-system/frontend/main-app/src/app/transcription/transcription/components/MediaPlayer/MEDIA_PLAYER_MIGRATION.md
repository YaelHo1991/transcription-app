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

### Stage 2: Pedal Integration
- [ ] Implement WebHID API connection
- [ ] Add HTTPS detection
- [ ] User notifications for HTTPS requirement
- [ ] Configure for yalitranscription.duckdns.org domain
- [ ] HTTP-to-HTTPS redirect for Digital Ocean
- [ ] Button mappings
  - [ ] Left button configuration
  - [ ] Center button configuration  
  - [ ] Right button configuration
- [ ] Continuous press functionality
- [ ] Rewind on pause feature
- [ ] Visual pedal interface
- [ ] Connection status display
- [ ] Test pedal functionality
- [ ] Git commit

### Stage 3: Auto-Detect Typing
- [ ] Implement typing detection logic
- [ ] Regular mode
  - [ ] Pause on typing start
  - [ ] Resume after configurable delay
- [ ] Enhanced mode
  - [ ] Continue during typing
  - [ ] Pause on first break
  - [ ] Second pause detection
  - [ ] Auto-resume functionality
- [ ] Delay settings configuration
- [ ] Rewind on pause functionality
- [ ] Status indicator
- [ ] Mode switching
- [ ] Test both modes
- [ ] Git commit

### Stage 4: Video Cube
- [ ] Implement draggable video window
- [ ] Resize functionality
- [ ] Position persistence (localStorage)
- [ ] Video/audio mode switching
- [ ] Minimize/maximize controls
- [ ] Aspect ratio maintenance
- [ ] Z-index management
- [ ] Test video playback
- [ ] Git commit

### Stage 5: Waveform Integration
- [ ] Generate waveform data
- [ ] Display in progress bar
- [ ] Visual peaks representation
- [ ] Color coding for played/unplayed sections
- [ ] Performance optimization
- [ ] Responsive scaling
- [ ] Git commit

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
- Settings tabs currently empty - implementation in progress
- Video mode needs fixing
- All features must exactly match original HTML player functionality