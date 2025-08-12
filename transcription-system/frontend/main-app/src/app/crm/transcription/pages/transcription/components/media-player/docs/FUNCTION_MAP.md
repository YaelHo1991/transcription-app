# Function Map - Media Player

## Purpose
This document tracks ALL functions in the media player to prevent duplicates and forgotten code.
Update this file IMMEDIATELY when adding/modifying any function.

---

## Stage Tracking
**Current Stage**: Stage 13 - Code Analysis & Documentation (Next)
**Last Updated**: 2025-08-07
**Completed Stages**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

---

## Core Player Functions

### Audio/Video Control
```javascript
// Location: media-player.html (Stage 2 - ✅ Implemented)

play() ✅
├── Purpose: Start media playback
├── Parameters: none
├── Returns: void
├── Called by: playPauseBtn click, keyboard shortcuts, pedal

pause() ✅
├── Purpose: Pause media playback
├── Parameters: none
├── Returns: void
├── Called by: playPauseBtn click, keyboard shortcuts, pedal, auto-detect

togglePlayPause() ✅
├── Purpose: Switch between play and pause
├── Parameters: none
├── Returns: void
├── Called by: main play button, spacebar

loadMedia(src, filename, mediaType) ✅
├── Purpose: Load new media file
├── Parameters: src (string), filename (string), mediaType (string)
├── Returns: void (not Promise yet)
├── Called by: navigation system

updatePlayPauseButton(playing) ✅
├── Purpose: Update play/pause button icon
├── Parameters: playing (boolean)
├── Returns: void
├── Called by: play, pause events

updateStatus(state, message) ✅
├── Purpose: Update status display
├── Parameters: state (string), message (string)
├── Returns: void
├── Called by: various player events
```

---

## Progress Bar Functions

### Progress Display & Interaction
```javascript
// Location: media-player.html (Stage 3 - ✅ Implemented)

updateProgress() ✅
├── Purpose: Update progress bar fill and time displays
├── Parameters: none
├── Returns: void
├── Called by: timeupdate event

seekTo(percent) ✅
├── Purpose: Jump to specific time based on percentage
├── Parameters: percent (number - 0-100)
├── Returns: void
├── Called by: progress bar click/drag

handleProgressClick(event) ✅
├── Purpose: Handle clicks on progress bar
├── Parameters: event (MouseEvent)
├── Returns: void
├── Called by: progress bar click event

startProgressDrag(event) ✅
├── Purpose: Start dragging on progress bar
├── Parameters: event (MouseEvent)
├── Returns: void
├── Called by: progress bar mousedown

calculateProgressPercent(clientX) ✅
├── Purpose: Convert mouse position to progress percent (RTL aware)
├── Parameters: clientX (number)
├── Returns: number (0-100)
├── Called by: handleProgressClick, startProgressDrag

formatTime(seconds) ✅
├── Purpose: Format seconds as HH:MM:SS
├── Parameters: seconds (number)
├── Returns: string
├── Called by: updateProgress, seekTo
```

---

## Time Display Functions

### Time Formatting & Editing
```javascript
// Location: media-player.html (Stage 4 - ✅ Implemented)

formatTime(seconds) ✅
├── Purpose: Format seconds as HH:MM:SS
├── Parameters: seconds (number)
├── Returns: string
├── Called by: updateProgress, time displays

parseTime(timeString) ✅
├── Purpose: Parse HH:MM:SS to seconds
├── Parameters: timeString (string)
├── Returns: number or null
├── Called by: enableTimeEdit

enableTimeEdit(element) ✅
├── Purpose: Make time display editable
├── Parameters: element (HTMLElement)
├── Returns: void
├── Called by: time display click

jumpToStart() ✅
├── Purpose: Seek to 00:00:00
├── Parameters: none
├── Returns: void
├── Called by: current time double-click

jumpToEnd() ✅
├── Purpose: Seek to end
├── Parameters: none
├── Returns: void
├── Called by: total time double-click
```

---

## Control Button Functions

### Skip & Navigation
```javascript
// Location: media-player.html (Stage 5 - ✅ Implemented)

skipForward() ✅
├── Purpose: Skip forward by skipAmount seconds
├── Parameters: none (uses skipAmount variable)
├── Returns: void
├── Called by: forward button, shortcuts

skipBackward() ✅
├── Purpose: Skip backward by skipAmount seconds
├── Parameters: none (uses skipAmount variable)
├── Returns: void
├── Called by: rewind button, shortcuts

toggleLoop() ✅
├── Purpose: Toggle loop mode on/off
├── Parameters: none
├── Returns: void
├── Called by: loop button

setSkipAmount(seconds) ✅
├── Purpose: Change skip amount
├── Parameters: seconds (number)
├── Returns: void
├── Called by: settings modal

updatePlayPauseButton(isPlaying) ✅
├── Purpose: Update play/pause button icon
├── Parameters: isPlaying (boolean)
├── Returns: void
├── Called by: play, pause events (Stage 2)
```

---

## Slider Functions

### Volume & Speed Control
```javascript
// Location: [Will be in media-player.html initially, then modules/sliders.js]

setVolume(value) ✅
├── Purpose: Set audio volume
├── Parameters: value (0-100)
├── Returns: void
├── Called by: volume slider, shortcuts

setPlaybackRate(value) ✅
├── Purpose: Set playback speed
├── Parameters: value (0.5-2.0)
├── Returns: void
├── Called by: speed slider, shortcuts

muteToggle() ✅
├── Purpose: Toggle mute state
├── Parameters: none
├── Returns: void
├── Called by: speaker icon click

cycleSpeed() ✅
├── Purpose: Cycle through speed presets (1.0 -> 1.25 -> 1.5 -> 1.75 -> 2.0 -> 0.75)
├── Parameters: none
├── Returns: void
├── Called by: speed icon single click

resetSpeed() ✅
├── Purpose: Reset to 1x speed
├── Parameters: none
├── Returns: void
├── Called by: speed icon double-click
```

---

## Settings Modal Functions

### Modal Management
```javascript
// Location: [Will be in media-player.html initially, then modules/settings/modal.js]

openSettingsModal() ✅
├── Purpose: Show settings modal
├── Parameters: none
├── Returns: void
├── Called by: settings button

closeSettingsModal() ✅
├── Purpose: Hide settings modal
├── Parameters: none
├── Returns: void
├── Called by: X button, ESC key, overlay click

switchTab(tabName) ✅
├── Purpose: Change active settings tab
├── Parameters: tabName (string)
├── Returns: void
├── Called by: tab buttons

handleModalEsc(event) ✅
├── Purpose: Handle ESC key for modal
├── Parameters: event (KeyboardEvent)
├── Returns: void
├── Called by: keydown event (when modal open)

saveSettings()
├── Purpose: Save all settings to localStorage
├── Parameters: none
├── Returns: void
├── Called by: setting changes

loadSettings()
├── Purpose: Load settings from localStorage
├── Parameters: none
├── Returns: void
├── Called by: initialization
```

---

## Keyboard Shortcuts Functions

### Shortcut Handling
```javascript
// Location: media-player.html (Stage 8 - ✅ Implemented)

loadShortcuts() ✅
├── Purpose: Load shortcuts from localStorage
├── Parameters: none
├── Returns: void
├── Called by: initialization

saveShortcuts() ✅
├── Purpose: Save shortcuts to localStorage
├── Parameters: none
├── Returns: void
├── Called by: shortcut changes

isTextEditorFocused() ✅
├── Purpose: Check if typing in text editor
├── Parameters: none
├── Returns: boolean
├── Called by: handleKeyPress

buildShortcutKey(event) ✅
├── Purpose: Build shortcut key string from event
├── Parameters: event (KeyboardEvent)
├── Returns: string
├── Called by: handleKeyPress, startCapturingShortcut

executeShortcutAction(action) ✅
├── Purpose: Execute action for shortcut
├── Parameters: action (string)
├── Returns: void
├── Called by: handleKeyPress

handleKeyPress(event) ✅
├── Purpose: Process keyboard input
├── Parameters: event (KeyboardEvent)
├── Returns: void
├── Called by: keydown event

adjustVolume(amount) ✅
├── Purpose: Adjust volume by amount
├── Parameters: amount (number)
├── Returns: void
├── Called by: executeShortcutAction

adjustSpeed(amount) ✅
├── Purpose: Adjust speed by amount
├── Parameters: amount (number)
├── Returns: void
├── Called by: executeShortcutAction

formatKeyDisplay(key) ✅
├── Purpose: Format key for display in Hebrew
├── Parameters: key (string)
├── Returns: string
├── Called by: updateShortcutsDisplay, UI

updateShortcutsDisplay() ✅
├── Purpose: Update shortcuts display in UI
├── Parameters: none
├── Returns: void
├── Called by: loadShortcuts, shortcut changes

setupShortcutUI() ✅
├── Purpose: Setup shortcut configuration UI
├── Parameters: none
├── Returns: void
├── Called by: initialization

startCapturingShortcut(button) ✅
├── Purpose: Start capturing new shortcut
├── Parameters: button (HTMLElement)
├── Returns: void
├── Called by: shortcut button click

getActionName(action) ✅
├── Purpose: Get action name in Hebrew
├── Parameters: action (string)
├── Returns: string
├── Called by: UI display

showShortcutStatus(message) ✅
├── Purpose: Show status message
├── Parameters: message (string)
├── Returns: void
├── Called by: shortcut updates

resetShortcuts() ✅
├── Purpose: Reset shortcuts to defaults
├── Parameters: none
├── Returns: void
├── Called by: reset button
```

---

## Toggle Functions

### System Toggles
```javascript
// Location: media-player.html (Stage 8-9)

togglePedal() ✅ FIXED
├── Purpose: Toggle pedal system on/off
├── Parameters: none
├── Returns: void
├── Called by: keyboard shortcut 'P'
├── Updates: pedal-enabled-toggle checkbox
├── Shows: Global toast notification
├── Saves: Settings to localStorage

toggleAutoDetect() ✅
├── Purpose: Toggle auto-detect on/off
├── Parameters: none
├── Returns: void
├── Called by: keyboard shortcut 'A'
├── Shows: Status notification

toggleShortcutsEnabled() ✅
├── Purpose: Toggle all shortcuts on/off
├── Parameters: none
├── Returns: void
├── Called by: Ctrl+Shift+S, toggle switch
├── Note: Toggle shortcuts always work even when disabled

toggleWorkMode() ✅
├── Purpose: Switch between regular/enhanced modes
├── Parameters: none
├── Returns: void
├── Called by: Ctrl+M
├── Shows: Status notification
```

---

## Pedal Functions

### HID Device Handling
```javascript
// Location: media-player.html (Stage 9 - ✅ Implemented)

connectPedal() ✅
├── Purpose: Connect to HID pedal device
├── Parameters: none
├── Returns: Promise<void>
├── Called by: connect button click

disconnectPedal() ✅
├── Purpose: Disconnect pedal device
├── Parameters: none
├── Returns: Promise<void>
├── Called by: disconnect button click

handlePedalInput(event) ✅
├── Purpose: Process HID input reports
├── Parameters: event (HIDInputReportEvent)
├── Returns: void
├── Called by: HID inputreport event

handlePedalButton(button, pressed) ✅
├── Purpose: Process individual button state
├── Parameters: button (string - 'left'/'center'/'right'), pressed (boolean)
├── Returns: void
├── Called by: handlePedalInput

executePedalAction(action) ✅
├── Purpose: Execute mapped action
├── Parameters: action (string)
├── Returns: void
├── Called by: handlePedalButton
├── Actions supported: playPause, skipForward/Backward (2.5/5/10), speedUp/Down/Reset, volumeUp/Down, mute, jumpToStart/End

startContinuousPress(action) ✅
├── Purpose: Start continuous action for held button
├── Parameters: action (string)
├── Returns: void
├── Called by: handlePedalButton

updatePedalConnectionUI(connected) ✅
├── Purpose: Update connection status UI
├── Parameters: connected (boolean)
├── Returns: void
├── Called by: connectPedal, disconnectPedal

showPedalStatus(message, type) ✅
├── Purpose: Display status message
├── Parameters: message (string), type (string)
├── Returns: void
├── Called by: various pedal functions

savePedalSettings() ✅
├── Purpose: Save settings to localStorage
├── Parameters: none
├── Returns: void
├── Called by: configuration changes

loadPedalSettings() ✅
├── Purpose: Load settings from localStorage
├── Parameters: none
├── Returns: void
├── Called by: initializePedalUI

updatePedalSettingsUI() ✅
├── Purpose: Update UI with current settings
├── Parameters: none
├── Returns: void
├── Called by: loadPedalSettings

initializePedalUI() ✅
├── Purpose: Initialize pedal configuration UI
├── Parameters: none
├── Returns: void
├── Called by: initializeMediaPlayer
```

---

## Auto-Detect Functions

### Typing Detection
```javascript
// Location: [Will be in media-player.html initially, then modules/settings/auto-detect.js]

startTypingDetection()
├── Purpose: Begin monitoring typing
├── Parameters: none
├── Returns: void
├── Called by: auto-detect enable

stopTypingDetection()
├── Purpose: Stop monitoring typing
├── Parameters: none
├── Returns: void
├── Called by: auto-detect disable

handleTypingStart()
├── Purpose: Handle typing detected
├── Parameters: none
├── Returns: void
├── Called by: input event in text editor

handleTypingStop()
├── Purpose: Handle typing stopped
├── Parameters: none
├── Returns: void
├── Called by: timeout after no typing

applyAutoDetectMode(mode)
├── Purpose: Switch between Regular/Enhanced
├── Parameters: mode (string)
├── Returns: void
├── Called by: mode selector

rewindOnPause(seconds)
├── Purpose: Optional rewind when pausing
├── Parameters: seconds (number)
├── Returns: void
├── Called by: pause events (if enabled)
```

---

## Video Cube Functions

### Video Display & Interaction (Stage 11 - ✅ Implemented)
```javascript
// Location: media-player.html (Stage 11 - Complete VideoCube class)

class VideoCube ✅
├── Purpose: Complete video cube implementation
├── Properties:
│   ├── hasBeenDragged (boolean) - tracks manual positioning
│   ├── isMinimized (boolean) - minimize state
│   ├── isHidden (boolean) - hidden state
│   ├── savedPosition (object) - saved position/size
│   └── resizeTimeout (timer) - debounce resize events

constructor() ✅
├── Purpose: Initialize all video cube properties
├── Parameters: none
├── Returns: VideoCube instance
├── Called by: initialization

show() ✅
├── Purpose: Display video cube with smart positioning
├── Parameters: none
├── Returns: void
├── Called by: video file detected

hide() ✅
├── Purpose: Hide video cube and show restore button
├── Parameters: none
├── Returns: void
├── Called by: navigation to audio

minimize() ✅
├── Purpose: Minimize and save position
├── Parameters: none
├── Returns: void
├── Called by: minimize button

closeAndReset() ✅
├── Purpose: Reset position then hide (X button behavior)
├── Parameters: none
├── Returns: void
├── Called by: close button
├── Note: Resets position BEFORE hiding to prevent jump

restore() ✅
├── Purpose: Restore from minimized/hidden state
├── Parameters: none
├── Returns: void
├── Called by: restore button

restoreToDefault() ✅
├── Purpose: Reset to default size and position
├── Parameters: none
├── Returns: void
├── Called by: restore default button

setDefaultPosition() ✅
├── Purpose: Calculate optimal position relative to media player
├── Parameters: none
├── Returns: void
├── Called by: show, restore, window resize
├── Features: Smart edge detection, adaptive positioning

startDrag/drag/endDrag() ✅
├── Purpose: Handle dragging functionality
├── Parameters: MouseEvent
├── Returns: void
├── Called by: header mousedown/move/up
├── Sets: hasBeenDragged = true on drag end

startResize/resize/endResize() ✅
├── Purpose: Handle corner resizing
├── Parameters: MouseEvent
├── Returns: void
├── Called by: resize handle events
├── Limits: 100px min, 1200px max

syncWithAudio() ✅
├── Purpose: Synchronize video with audio element
├── Parameters: none
├── Returns: void
├── Called by: setupEventHandlers
├── Note: Video muted, audio provides sound

loadVideo(src) ✅
├── Purpose: Load video source
├── Parameters: src (string)
├── Returns: void
├── Called by: loadMedia when video detected

Window Resize Handler ✅
├── Purpose: Maintain alignment on screen resize
├── Parameters: none (event)
├── Returns: void
├── Called by: window resize event
├── Features:
│   ├── Debounced (150ms)
│   ├── Respects hasBeenDragged flag
│   ├── Edge detection for off-screen prevention
│   └── Smart repositioning logic

isVideoFile(mimeType) ✅
├── Purpose: Detect if file is video
├── Parameters: mimeType (string)
├── Returns: boolean
├── Called by: loadMedia
├── Checks: video/mp4, video/webm, video/ogg
```

---

## Responsive & Collapsible Functions (Stage 12)

### Collapse Management
```javascript
// Location: media-player.html (Stage 12 - ✅ Implemented)

toggleControlsSection() ✅
├── Purpose: Toggle visibility of control buttons section
├── Parameters: none
├── Returns: void
├── Called by: controlsToggle button click
├── Updates: localStorage, UI classes

toggleSlidersSection() ✅
├── Purpose: Toggle visibility of sliders section
├── Parameters: none
├── Returns: void
├── Called by: slidersToggle button click
├── Updates: localStorage, UI classes

saveCollapseState() ✅
├── Purpose: Save collapse state to localStorage
├── Parameters: none
├── Returns: void
├── Called by: toggle functions

loadCollapseState() ✅
├── Purpose: Load saved collapse state from localStorage
├── Parameters: none
├── Returns: void
├── Called by: initialization

updateCollapseForScreenSize() ✅
├── Purpose: Auto-collapse on small screens
├── Parameters: none
├── Returns: void
├── Called by: window resize, initialization

checkSliderOverflow() ✅
├── Purpose: Detect and handle slider overflow
├── Parameters: none
├── Returns: void
├── Called by: resize, video show/hide, toggle
├── Features:
│   ├── Measures actual element widths
│   ├── Checks for speed slider cutoff
│   ├── Adds 'stacked' class when needed
│   └── Triggers video cube height adjustment

adjustVideoCubeHeight(isStacked) ✅
├── Purpose: Adjust video cube height for stacked sliders
├── Parameters: isStacked (boolean)
├── Returns: void
├── Called by: checkSliderOverflow
├── Changes: 250px ↔ 290px based on stacking

initializeCollapsible() ✅
├── Purpose: Initialize all collapse functionality
├── Parameters: none
├── Returns: void
├── Called by: initializeMediaPlayer
├── Sets up: Event listeners, resize handler, initial state
```

---

## Utility Functions

### Helper Functions
```javascript
// Location: [Will be in media-player.html initially, then modules/utils.js]

debounce(func, wait)
├── Purpose: Debounce function calls
├── Parameters: func (function), wait (number)
├── Returns: function
├── Called by: resize events, typing detection

throttle(func, limit)
├── Purpose: Throttle function calls
├── Parameters: func (function), limit (number)
├── Returns: function
├── Called by: progress updates, drag events

clamp(value, min, max)
├── Purpose: Constrain value to range
├── Parameters: value (number), min (number), max (number)
├── Returns: number
├── Called by: volume, speed, progress calculations

isRTL()
├── Purpose: Check if in RTL mode
├── Parameters: none
├── Returns: boolean
├── Called by: progress calculations, button layout
```

---

## Event Listeners

### DOM Events
```javascript
// All event listeners and their handlers

audioElement.addEventListener('timeupdate', updateProgress)
audioElement.addEventListener('loadedmetadata', handleMetadataLoaded)
audioElement.addEventListener('play', handlePlayEvent)
audioElement.addEventListener('pause', handlePauseEvent)
audioElement.addEventListener('ended', handleEndedEvent)

progressBar.addEventListener('click', handleProgressClick)
progressBar.addEventListener('mousedown', startProgressDrag)

playPauseBtn.addEventListener('click', togglePlayPause)
forwardBtn.addEventListener('click', () => skipForward(2.5))
forward10Btn.addEventListener('click', () => skipForward(5))
rewindBtn.addEventListener('click', () => skipBackward(2.5))
rewind10Btn.addEventListener('click', () => skipBackward(5))

volumeSlider.addEventListener('input', handleVolumeChange)
speedSlider.addEventListener('input', handleSpeedChange)

settingsBtn.addEventListener('click', openSettingsModal)

document.addEventListener('keydown', handleKeyPress)
window.addEventListener('resize', handleResize)
```

---

## Global Variables

### State Management
```javascript
// Global state variables to track

let isPlaying = false
let currentTime = 0
let duration = 0
let volume = 1
let playbackRate = 1
let isMuted = false

let isProgressDragging = false
let isVideoCubeDragging = false
let isVideoCubeResizing = false

let shortcuts = {} // Key mappings
let pedalMappings = {} // Pedal button mappings
let autoDetectSettings = {} // Auto-detect configuration

let videoCubeState = {} // Position and size memory
let typingTimeout = null // For auto-detect
let continuousPressInterval = null // For pedal hold
```

---

## API Exposed to Other Components

### Public Interface
```javascript
// What other components can call

window.mediaPlayer = {
    // Core functions
    loadMedia: (src, filename, mediaType) => {},
    play: () => {},
    pause: () => {},
    togglePlayPause: () => {},
    
    // Time control
    getCurrentTime: () => {},
    setCurrentTime: (seconds) => {},
    getDuration: () => {},
    
    // Volume/Speed
    setVolume: (value) => {},
    getVolume: () => {},
    setPlaybackRate: (value) => {},
    getPlaybackRate: () => {},
    
    // Settings
    openSettings: () => {},
    
    // Events (for other components to listen)
    on: (event, callback) => {},
    off: (event, callback) => {}
}
```

---

## CRITICAL: Naming Conventions to Prevent Conflicts

### ⚠️ MANDATORY: All media player variables and functions MUST be prefixed!

#### Global Variables:
- **ALWAYS** use `media` or `mp` prefix
- ❌ **WRONG**: `let shortcuts = {}`
- ✅ **RIGHT**: `let mediaShortcuts = {}`

#### Function Names:
- Use `media` prefix for anything that could conflict
- ❌ **WRONG**: `loadShortcuts()`
- ✅ **RIGHT**: `loadMediaShortcuts()`

#### LocalStorage Keys:
- Use `mediaPlayer` prefix
- ❌ **WRONG**: `localStorage.getItem('shortcuts')`
- ✅ **RIGHT**: `localStorage.getItem('mediaPlayerShortcuts')`

#### CSS Classes:
- Use `media-` or component-specific prefix
- ❌ **WRONG**: `.shortcuts-config`
- ✅ **RIGHT**: `.media-shortcuts-config`

### Why This is Critical:
- **Prevents conflicts** with text editor shortcuts system
- **Avoids collisions** with other page components
- **Ensures** clean namespace separation
- **Makes debugging** easier

### This rule applies to ALL future development!

---

## Important Implementation Notes

### CSS Class Naming (Stage 7):
We use **unique class names** for the modal to avoid conflicts:
- `media-modal-overlay` NOT `modal-overlay`
- `settings-modal-content` NOT `modal-content`
- `settings-modal-header` NOT `modal-header`
- `settings-tab-btn` NOT `tab-btn`
- All modal classes are prefixed to be unique

**Why**: The generic class names like `.modal-content` conflict with other modals in the system (text-editor modals, etc.)

### Design Decisions:
- **Teal Dark Theme**: Custom dark theme with teal emphasis (#0f4c4c, #1a5d5d, #20c997)
- **One Font**: Consistent use of 'Segoe UI' throughout
- **Modal Size**: 900px width, 85vh height for better usability
- **RTL Support**: All components support Hebrew RTL layout

### File Structure:
- Stage 7 complete version backed up in `backup-stage7-working/`
- Old `settings-loader.html` commented out in index.php
- All code currently in single `media-player.html` file (will be modularized in Stage 14)

## Notes

### Naming Conventions:
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase (CSS: kebab-case with component prefix)
- Private functions: _prefixUnderscore

### Update Protocol:
1. Before writing ANY function, check if it exists here
2. After writing a function, add it here immediately
3. When modifying a function, update its entry
4. When deleting a function, mark as DEPRECATED first

### Color Coding (for reference):
- ✅ Implemented and tested
- 🔧 Implemented but needs testing
- 📝 Planned but not implemented
- ❌ Deprecated (do not use)