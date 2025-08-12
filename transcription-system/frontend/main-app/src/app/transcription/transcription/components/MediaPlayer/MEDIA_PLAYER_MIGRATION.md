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
- Keyboard shortcuts fully functional ✅
- Pedal integration complete with all fixes ✅
- Video mode needs fixing
- All features must exactly match original HTML player functionality

## Completed Fixes in Stage 2
1. **React Closure Issues**: Fixed stale state in event handlers by reading from localStorage
2. **Mute/Unmute Toggle**: Now checks actual audio volume instead of React state
3. **Volume Controls**: Increments by 5% with proper initialization
4. **Default Pedal Mapping**: Left=Forward, Right=Backward (swapped from original)