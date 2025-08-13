# Media Player Implementation Plan

## Project Context

### Server Configuration
- **Main Application**: Port 3001 (NOT XAMPP)
- **API Endpoints**: Port 8080 or 8081
- **Server Type**: Custom local server (not XAMPP)
- **File Access**: Direct file paths from server

### Technical Approach
- **Initial Development**: Single HTML file with embedded JS/CSS
- **Final Structure**: ES6 modules
- **UI Framework**: Vanilla JavaScript (no React/Vue initially)
- **RTL Support**: Required from start
- **Integration**: With existing transcription system

### Development Method
1. Write everything in ONE file first (media-player.html)
2. Test thoroughly at each stage
3. Split into modules only after everything works
4. Document all functions to prevent duplicates

---

## Stage 1: Project Setup & Backup
**Duration**: 30 minutes

### Tasks:
- [ ] Commit current state to Git
- [ ] Create branch `media-player-fresh`
- [ ] Delete old media player HTML files
- [ ] Create documentation files
- [ ] Set up basic folder structure

### Files at End:
```
media-player/
├── IMPLEMENTATION_PLAN.md (this file)
├── FUNCTION_MAP.md
├── MODULE_STRUCTURE.md
├── player/
│   └── (empty, old files deleted)
└── settings/
    └── (existing, untouched)
```

### What Should Work:
- Git repository backed up
- Clean workspace ready

### How to Test:
1. Run `git status` - should show new branch
2. Check folder structure matches above

### Success Criteria:
- [x] Git backup complete
- [x] New branch created
- [x] Documentation files created
- [x] Old files removed

---

## Stage 2: Basic HTML Structure & Audio Player
**Duration**: 1 hour

### Tasks:
- [ ] Create media-player.html with RTL container
- [ ] Add audio element
- [ ] Add play/pause button
- [ ] Add basic CSS (embedded in HTML)
- [ ] Add basic JS for play/pause

### Files at End:
```
player/
└── media-player.html (all code embedded)
```

### Functions Added:
```javascript
- play() - starts audio
- pause() - stops audio
- togglePlayPause() - switches between play/pause
```

### What Should Work:
- Load test audio file
- Click play → audio plays
- Click pause → audio stops
- Button icon changes

### How to Test:
1. Open http://localhost:3001/client/src/transcription/pages/transcription/
2. Load a test audio file
3. Click play button
4. Verify audio plays
5. Click pause
6. Verify audio stops

### Success Criteria:
- [x] Audio loads
- [x] Play/pause works
- [x] No console errors
- [x] RTL layout correct

---

## Stage 3: Progress Bar with RTL
**Duration**: 1.5 hours

### Tasks:
- [ ] Add progress bar container
- [ ] Implement RTL fill (right to left)
- [ ] Add click to seek
- [ ] Add drag to seek
- [ ] Add time displays (current/total)

### Functions Added:
```javascript
- updateProgress() - updates bar fill
- seekTo(time) - jumps to time
- formatTime(seconds) - formats as HH:MM:SS
- handleProgressClick(event) - handles bar clicks
- handleProgressDrag(event) - handles dragging
```

### What Should Work:
- Progress bar fills from right to left
- Click on bar seeks to position
- Drag on bar updates position
- Time displays update

### How to Test:
1. Play audio
2. Watch progress bar fill from right to left
3. Click at 50% of bar
4. Verify audio jumps to middle
5. Drag progress bar
6. Verify audio follows

### Success Criteria:
- [x] Progress fills right to left
- [x] Click to seek works
- [x] Drag works smoothly
- [x] Time displays correct

### Layout Fixes (User Feedback - Added Stage 3.5):
- [x] Media container should adapt to full container size (remove max-width: 800px)
- [x] Progress bar and timestamps on same line (save vertical space)
  - Duration on right, current time on left, progress bar in middle
  - Stack vertically on small screens (<768px)

---

## Stage 4: Time Display Features
**Duration**: 1 hour

### Tasks:
- [ ] Make time displays editable on click
- [ ] Add double-click to jump (start/end)
- [ ] Format input as HH:MM:SS
- [ ] Validate time input
- [ ] Add visual feedback for edit mode

### Functions Added:
```javascript
- enableTimeEdit(element) - makes time editable
- parseTime(string) - parses HH:MM:SS format
- validateTime(seconds) - checks if time valid
- jumpToStart() - goes to 00:00:00
- jumpToEnd() - goes to duration
```

### What Should Work:
- Single click on time → edit mode
- Type new time → jumps to position
- Double-click current time → jump to start
- Double-click total time → jump to end

### How to Test:
1. Click on current time display
2. Type "00:01:30" and press Enter
3. Verify jumps to 1:30
4. Double-click current time
5. Verify jumps to start
6. Double-click total time
7. Verify jumps to end

### Success Criteria:
- [x] Edit mode activates on click
- [x] Time input validates correctly (with input masking)
- [x] Jump to position works
- [x] Double-click shortcuts work

---

## Stage 5: Control Buttons with RTL
**Duration**: 1 hour

### Tasks:
- [ ] Add forward/rewind buttons (2.5s and 5s)
- [ ] Implement correct RTL order
- [ ] Add visual feedback
- [ ] Add keyboard shortcuts (temporary)

### Button Order (Right to Left):
```
[⏪ 5s] [◀ 2.5s] [▶/⏸] [2.5s ▶] [5s ⏩]
```

### Functions Added:
```javascript
- skipForward(seconds) - skip ahead
- skipBackward(seconds) - skip back
- updateButtonStates() - updates button visuals
```

### What Should Work:
- Right arrow (◀) goes backward
- Left arrow (▶) goes forward
- 5 second skip buttons work
- Visual feedback on click

### How to Test:
1. Click ◀ button → goes back 2.5s
2. Click ▶ button → goes forward 2.5s
3. Click ⏪ → goes back 5s
4. Click ⏩ → goes forward 5s
5. Verify RTL order is correct

### Success Criteria:
- [x] All skip buttons work
- [x] RTL direction correct (fixed button positions)
- [x] Visual feedback works
- [x] No timing errors

---

## Stage 6: Volume and Speed Sliders
**Duration**: 1 hour

### Tasks:
- [ ] Add volume slider (RTL: quiet right, loud left)
- [ ] Add speed slider (RTL: slow right, fast left)
- [ ] Add icons for each slider
- [ ] Add value displays
- [ ] Add click on icon shortcuts

### Functions Added:
```javascript
- setVolume(value) - sets audio volume
- setPlaybackRate(value) - sets speed
- muteToggle() - mutes/unmutes
- resetSpeed() - returns to 1x
```

### What Should Work:
- Volume slider changes audio level
- Speed slider changes playback rate
- Click speaker icon → mute/unmute
- Click speed icon → cycle speeds
- Double-click speed icon → reset to 1x

### How to Test:
1. Drag volume slider → audio gets louder/quieter
2. Drag speed slider → audio speeds up/slows
3. Click speaker icon → mutes
4. Click again → unmutes
5. Click speed icon → cycles through speeds

### Success Criteria:
- [x] Volume control works
- [x] Speed control works
- [x] Icon shortcuts work (single/double click)
- [x] RTL direction correct
- [x] Value displays update

---

## Stage 7: Settings Modal Structure
**Duration**: 1.5 hours

### Tasks:
- [ ] Add settings button to player
- [ ] Create modal overlay
- [ ] Import existing modal CSS
- [ ] Create three tabs (empty content)
- [ ] Add open/close functionality

### Functions Added:
```javascript
- openSettingsModal() - shows modal
- closeSettingsModal() - hides modal
- switchTab(tabName) - changes active tab
```

### What Should Work:
- Click settings → modal opens
- Click tabs → switches between them
- Click X or outside → modal closes
- ESC key → closes modal

### How to Test:
1. Click settings button (⚙️)
2. Verify modal opens with overlay
3. Click each tab
4. Verify tab switches
5. Click X button
6. Verify modal closes
7. Open again, press ESC
8. Verify modal closes

### Success Criteria:
- [x] Modal opens/closes properly
- [x] Tabs switch correctly  
- [x] Custom teal dark theme implemented (NOT matching existing design)
- [x] No z-index issues
- [x] Fixed CSS conflicts with unique class names
- [x] Consistent font family throughout (Segoe UI)
- [x] Larger modal size (900px width, 85vh height)

### Additional Work Done (Stage 7.5):
- Fixed modal stuck issue by removing pointer-events CSS
- Fixed element selection timing (elements selected after DOM ready)
- Changed to unique class names to avoid CSS conflicts:
  - `media-modal-overlay` instead of `modal-overlay`
  - `settings-modal-content` instead of `modal-content`
  - All modal classes prefixed to be unique
- Redesigned with teal dark theme emphasizing page's teal accent
- One consistent font family throughout
- Increased modal size for better usability

---

## Stage 8: Keyboard Shortcuts Integration
**Duration**: 2 hours

### Tasks:
- [x] Integrate existing shortcuts code
- [x] Connect to media player functions
- [x] Add shortcut configuration UI
- [x] Handle text editor conflicts
- [x] Save preferences to localStorage

### Functions Added:
```javascript
- loadShortcuts() - loads from localStorage
- saveShortcuts() - saves to localStorage
- isTextEditorFocused() - prevents conflicts
- buildShortcutKey(event) - builds key string
- executeShortcutAction(action) - executes action
- handleKeyPress(event) - processes keys
- setupShortcutUI() - sets up configuration UI
- startCapturingShortcut(button) - captures new key
- resetShortcuts() - resets to defaults
```

### What Should Work:
- Default shortcuts work (space = play/pause)
- Can configure custom shortcuts
- Shortcuts disabled when typing in text editor
- Settings persist after reload
- Visual feedback when capturing new shortcut
- Conflict detection for duplicate keys

### How to Test:
1. Press spacebar → play/pause works
2. Open settings → shortcuts tab
3. Click any shortcut button → enters capture mode
4. Press new key → shortcut updates
5. Try to assign same key twice → conflict warning
6. Click in text editor
7. Press shortcuts → should type, not control player
8. Reload page
9. Verify shortcuts still saved

### Success Criteria:
- [x] Default shortcuts work
- [x] Custom shortcuts configurable
- [x] Text editor conflict resolved
- [x] Settings persist
- [x] All media functions accessible
- [x] UI shows current shortcuts
- [x] Capture mode with visual feedback
- [x] Conflict detection works

### Stage 8 Outstanding Issues - RESOLVED ✅

#### Issue 1: F-Key Assignment Problem ✅ FIXED
- **Problem**: F-keys are currently blocked everywhere, preventing them from being assigned as shortcuts
- **Solution Applied**: Modified handleKeyPress to only block F-keys when in text editor AND not modifier combinations

#### Issue 2: Status Messages Not Visible ✅ FIXED
- **Problem**: Status messages use wrong CSS class and aren't prominently displayed
- **Solution Applied**: Fixed CSS class names and implemented teal toast-style notifications

#### Issue 3: Missing Same-Key Detection ✅ FIXED
- **Problem**: No message when user chooses same key for same action
- **Solution Applied**: Added same-key detection with Hebrew status message

#### Issue 4: No Capture Timeout ✅ FIXED
- **Problem**: Capture mode stays active indefinitely if no key is pressed
- **Solution Applied**: Added 5-second timeout that auto-cancels capture mode

#### Issue 5: Toggle Shortcuts Fixed ✅ FIXED
- **Problem**: Ctrl+Shift+K conflicted with browser dev tools, toggle shortcuts not working when modal open
- **Solution Applied**: 
  - Changed toggle shortcut to Ctrl+Shift+S to avoid browser conflict
  - Modified handleKeyPress to allow toggle shortcuts even when modal is open or shortcuts are disabled

#### Issue 6: User Experience Improvements ✅ FIXED
- **Problem**: Combination keys displayed as lines, poor button CSS
- **Solution Applied**: 
  - Fixed formatKeyDisplay function to properly handle combination keys (Alt+4, Ctrl+Shift+S, etc.)
  - Improved button CSS with proper flex layout, overflow handling, and sizing
  - Early preventDefault() for all Ctrl combinations to prevent browser shortcuts

#### Issue 7: Multiple Buttons in Capture Mode ✅ FIXED
- **Problem**: When capturing shortcuts, multiple buttons would show "לחץ על מקש" simultaneously
- **Solution Applied**: Reset all other capturing buttons when starting new capture

#### Issue 8: Modifier Key Combinations ✅ FIXED
- **Problem**: Alt combinations showing as "Alt+Alt" instead of "Alt+4"
- **Solution Applied**: Fixed buildShortcutKey to properly handle modifier key combinations

#### Issue 9: Modifier Keys Accepted as Shortcuts ✅ FIXED
- **Problem**: Ctrl/Alt/Shift alone were being accepted as valid shortcuts but displayed blank
- **Solution Applied**: Enhanced buildShortcutKey to reject modifier-only keys and return empty string, added validation in capture handler

#### Issue 10: Case-Sensitive Duplicate Detection ✅ FIXED
- **Problem**: "ctrl" and "Ctrl" were treated as different keys, allowing duplicates
- **Solution Applied**: Added case-insensitive comparison in conflict detection logic

#### Issue 11: Empty Key Display ✅ FIXED
- **Problem**: Combination keys showing blank cubes instead of proper text
- **Solution Applied**: Enhanced formatKeyDisplay to handle empty parts, filter them properly, and display "לא מוגדר" for truly empty keys

### Stage 8 Status: COMPLETE ✅
All keyboard shortcut issues have been resolved. The system now has:
- Working F-key assignments without blocking text editor functionality
- Proper combination key handling (Alt+4, Ctrl+Shift+S, etc.)
- Toggle shortcuts that work even when modal is open
- 5-second capture timeout with proper cleanup
- Teal-themed status notifications
- Same-key detection with case-insensitive comparison
- Prevention of browser shortcut conflicts
- Improved button CSS for combination text display
- Rejection of modifier-only keys
- Proper display of all key combinations

Stage 8 fully tested and working. Ready to proceed to Stage 9 - Pedal Integration.

---

## Stage 9: Pedal Integration
**Duration**: 2 hours

### Tasks:
- [x] Integrate existing HID pedal code
- [x] Connect to media controls
- [x] Add configuration UI
- [x] Implement continuous press behavior
- [x] Save pedal mappings

### Functions Added:
```javascript
- connectPedal() - establishes HID connection ✅
- disconnectPedal() - closes HID connection ✅
- handlePedalInput(event) - processes HID reports ✅
- handlePedalButton(button, pressed) - processes button state ✅
- executePedalAction(action) - executes mapped action ✅
- startContinuousPress(action) - continuous forward/back ✅
- savePedalSettings() - persists configuration ✅
- loadPedalSettings() - restores configuration ✅
- initializePedalUI() - sets up UI handlers ✅
```

### What Should Work:
- Pedal connects via HID API
- Three button configuration (left/center/right)
- Default mappings:
  - Center button = play/pause
  - Right button = rewind (RTL)
  - Left button = forward (RTL)
- Hold for continuous action (configurable interval)
- Custom mapping through dropdowns
- Settings persist in localStorage
- Visual test display shows button presses
- Connection status indicator

### How to Test:
1. Open settings → pedal tab
2. Click "התחבר לדוושה" (Connect Pedal)
3. Select HID device from browser prompt
4. Verify status shows "מחובר" (Connected)
5. Press pedal buttons
6. Verify test display lights up
7. Verify actions trigger (play/pause, skip)
8. Hold side buttons for continuous skip
9. Change button mappings via dropdowns
10. Toggle continuous press settings
11. Reload page and verify settings persist

### Success Criteria:
- [x] Pedal UI displays correctly
- [x] WebHID API connection logic implemented
- [x] Button press detection implemented
- [x] Continuous press works with configurable interval
- [x] Remapping saves to localStorage
- [x] Settings persist across page reloads
- [x] Visual feedback in test display
- [x] Status messages display correctly

### Issues Fixed After Initial Implementation:

#### Issue 1: Non-finite Value Error ✅ FIXED
- **Problem**: skipForward/skipBackward called without seconds parameter causing "non-finite value" error
- **Solution**: Added default parameter values (2.5 seconds) and validation to prevent NaN/Infinity

#### Issue 2: Pedal Not Controlling Media ✅ FIXED  
- **Problem**: Every HID report was sending both press AND release for all buttons
- **Root Cause**: handlePedalInput was calling handlePedalButton for both pressed and unpressed states on every report
- **Solution**: Added previousButtonState tracking to only send events when button state CHANGES

#### Issue 3: Layout Inconsistency ✅ FIXED
- **Problem**: Pedal tab layout didn't match shortcuts tab styling
- **Solution**: Created media-pedal-header with same structure and CSS as shortcuts tab

#### Issue 4: Visual Interface ✅ IMPLEMENTED
- **Problem**: Dropdown menus not intuitive for pedal configuration
- **Solution**: Created visual pedal interface with three circular buttons that show current state

### Technical Notes:
- WebHID API requires HTTPS or localhost
- User must grant permission via browser prompt
- Different pedal devices may have different HID report formats
- Current implementation uses common bit mapping for 3-button pedals (bit 0=left, 1=center, 2=right)
- State tracking prevents rapid toggle issues
- Visual feedback shows both in test display and main pedal interface

#### Issue 5: Pedal Toggle Shortcut ✅ FIXED
- **Problem**: Pedal toggle shortcut ('P' key) wasn't updating the UI checkbox
- **Solution**: Fixed ID mismatch - changed 'pedalEnabledToggle' to 'pedal-enabled-toggle'
- **Added**: Save settings when toggling via shortcut

### Stage 9 Additional Features: COMPLETE ✅

#### Rewind on Pause Feature ✅ IMPLEMENTED
- Added rewind-on-pause settings to all three tabs (Shortcuts, Pedal, Auto-detect)
- Configurable rewind amount from 0.1 to 2.0 seconds
- Toggle to enable/disable the feature
- Automatically rewinds when pause is triggered from any source
- Settings persist in localStorage
- Synchronized across all tabs

#### Continuous Press Label Clarification ✅ FIXED
- Changed from "מהירות דילוג (שניות)" to "מרווח זמן בלחיצה ממושכת (שניות)"
- Makes it clearer that it's the interval for repeated actions when holding pedal buttons

---

## Stage 10: Auto-Detect Integration ✅ COMPLETE
**Duration**: 2 hours

### Tasks:
- [x] Integrate existing auto-detect code
- [x] Connect to text editor events
- [x] Implement Regular mode
- [x] Implement Enhanced mode
- [x] Add rewind-on-pause option

### Functions Added:
```javascript
- startTypingDetection() - monitors typing
- handleTypingStart() - on typing detected
- handleTypingStop() - on typing stopped
- applyAutoDetectMode(mode) - switches modes
- rewindOnPause(seconds) - optional rewind
```

### Modes:
1. **Regular**: Stop on typing, resume after delay
2. **Enhanced**: Play while typing, pause on first break, resume on second

### What Should Work:
- Regular mode: Type → media stops, stop typing → resumes
- Enhanced mode: Complex two-pause behavior
- Optional rewind on any pause
- Only works in text editor area

### How to Test:
1. Enable Regular mode
2. Start playing media
3. Type in text editor → media stops
4. Stop typing → media resumes after delay
5. Switch to Enhanced mode
6. Type while playing → continues
7. Pause typing → media stops
8. Resume typing → still stopped
9. Pause again → media resumes

### Success Criteria:
- [x] Regular mode works correctly
- [x] Enhanced mode properly implemented with two-pause behavior
- [x] Only triggers in text editor
- [x] Rewind option added with configurable amount
- [x] Settings configurable and persist in localStorage

### User Feedback Issues to Fix:
1. **Shortcut key 'A' not working** - Need to add keyboard shortcut for toggling auto-detect
2. **Toggle position** - Move toggle switch to side like pedal and shortcuts tabs
3. **Media loading broken** - Remove test audio, fix navigation bar integration
4. **Delay display** - Convert from milliseconds (1500) to seconds (1.5)
5. **Missing rewind-on-pause** - Add rewind option like in other tabs
6. **Enhanced mode** - Currently behaves like regular mode, needs proper implementation

### Fix Implementation Plan:
- [x] Fix toggle position to match other tabs
- [x] Fix shortcut key 'A' functionality  
- [x] Remove loadTestAudio() and fix media loading
- [x] Convert delay field to seconds display
- [x] Add rewind-on-pause section
- [x] Implement proper enhanced mode behavior

---

## Stage 11: Video Support ✅ COMPLETE
**Duration**: 2 hours (actual: 3 hours with fixes)

### Tasks:
- [x] Detect video files from navigation
- [x] Create video cube element (250x250px floating cube)
- [x] Implement drag functionality (header-only drag, no aggressive prevention)
- [x] Implement resize functionality (corner handle with min/max limits)
- [x] Add minimize/close/restore buttons with proper behaviors

### Functions Added:
```javascript
class VideoCube {
    - constructor() - initializes all properties including hasBeenDragged flag
    - init() - sets up the video cube DOM structure
    - setupEventHandlers() - attaches all event listeners including window resize
    - show() - displays video cube with default positioning
    - hide() - hides cube and shows restore button
    - minimize() - saves position and hides cube
    - closeAndReset() - resets position then hides (for X button)
    - restore() - restores cube to saved or default position
    - restoreToDefault() - resets to default size/position
    - setDefaultPosition() - calculates optimal position relative to media player
    - startDrag/drag/endDrag - drag functionality
    - startResize/resize/endResize - resize functionality
    - syncWithAudio() - synchronizes with audio element
    - loadVideo(src) - loads video source
}

- isVideoFile(mimeType) - detects video MIME types
- Window resize handler - maintains alignment on screen size changes
```

### Implementation Details:
- **VideoCube Class**: Complete implementation with drag, resize, minimize
- **Smart Positioning**: Automatically positions beside media player, adapts to screen size
- **State Management**: Tracks minimized, hidden, and manually dragged states
- **Synchronized Playback**: Video muted, audio provides sound
- **Restore Button**: Positioned in upper corner next to settings
- **Window Resize Handler**: Maintains proper positioning when window resizes
- **hasBeenDragged Flag**: Respects manual positioning vs automatic repositioning

### Issues Fixed:
1. **Initial Implementation**: Wrong video display (full-width instead of cube)
2. **Navigation Break**: Fixed missing script inclusion
3. **Positioning Issues**: Multiple rounds of fixes for alignment
4. **Drag Limitations**: Fixed vertical-only drag by clearing CSS right property
5. **Resize Not Working**: Added proper z-index and pointer-events
6. **Button Behaviors**: Clarified X (close & reset) vs minimize behaviors
7. **Restore Position Bug**: Fixed position calculation order in closeAndReset
8. **Screen Resize Issues**: Added intelligent repositioning with edge detection
9. **Z-index Conflict**: Fixed video cube appearing over settings modal

### What Should Work:
- [x] Video files show 250x250px video cube
- [x] Drag by title bar only (not whole cube)
- [x] Resize from corner (100px min, 1200px max)
- [x] X closes and resets position for next time
- [x] - minimizes and remembers position
- [x] Restore button appears when hidden (upper corner)
- [x] Window resize maintains proper alignment
- [x] Settings modal appears above video cube

### Success Criteria:
- [x] Video detection works
- [x] Drag doesn't break (no disappearing)
- [x] Resize works smoothly
- [x] Buttons function correctly
- [x] Position memory works
- [x] Responsive to window resizing
- [x] Z-index layering correct

---

## Stage 12: Responsive Design ✅ COMPLETE
**Duration**: 1.5 hours (actual: 2 hours with enhancements)

### Tasks:
- [x] Define breakpoints (small/medium/large)
- [x] Adjust layout for each size
- [x] Hide/show elements based on space
- [x] Scale video cube appropriately
- [x] Test all screen sizes
- [x] Add collapsible controls for space saving
- [x] Implement dynamic overflow detection

### User's Layout Requirements:
- [x] Container takes full width of parent
- [x] Progress bar with inline timestamps on larger screens
- [x] Stack progress elements vertically on small screens
- [x] Compact view on smaller screens
- [x] Media player doesn't take too much vertical space
- [x] Collapsible sections to save space

### Implemented Features:
1. **Collapsible Controls**: Toggle buttons to hide/show control sections
2. **Dynamic Slider Stacking**: Automatically stacks sliders when too narrow
3. **Smart Overflow Detection**: Uses actual element measurements
4. **Video Cube Height Adjustment**: Grows with stacked sliders (250px → 290px)
5. **Persistent State**: Saves collapse preferences to localStorage
6. **Multiple Breakpoints**: Responsive at 768px, 480px, 350px, 280px

### Breakpoints:
- **Ultra Small**: < 280px (hide slider values)
- **Extra Small**: < 350px (minimal padding, smaller icons)
- **Small**: < 480px (stack sliders vertically)
- **Medium**: < 768px (compact layout)
- **Large**: > 768px (standard layout)

### Responsive Changes:
- Ultra small: Hide value displays, minimal icons
- Extra small: Reduced gaps, overflow prevention
- Small: Vertical slider stacking, compact controls
- Medium: Standard layout with reduced padding
- Large: Full layout with all elements visible

### What Works:
- ✅ All controls accessible at any size
- ✅ No horizontal overflow
- ✅ Video cube adjusts height with container
- ✅ Sliders automatically stack when needed
- ✅ Smooth transitions for all changes
- ✅ Smart detection prevents conflicts

### Success Criteria:
- [x] No horizontal scroll at any size
- [x] All controls accessible
- [x] Video cube scales properly
- [x] Layout looks good at all sizes
- [x] Dynamic adaptation to content
- [x] Smooth user experience

---

## Stage 13: Code Analysis & Documentation
**Duration**: 1 hour

### Tasks:
- [ ] List all functions in FUNCTION_MAP.md
- [ ] Document all global variables
- [ ] Map all event listeners
- [ ] Identify module boundaries
- [ ] Plan splitting strategy

### Documentation Updates:
```
FUNCTION_MAP.md
├── All functions listed
├── Parameters documented
├── Return values noted
└── Dependencies mapped

MODULE_STRUCTURE.md
├── Planned module files
├── Import/export map
└── Dependency graph
```

### What Should Work:
- Complete documentation exists
- No function forgotten
- Clear module boundaries identified

### Success Criteria:
- [ ] Every function documented
- [ ] No duplicate functions found
- [ ] Module plan clear
- [ ] Dependencies understood

---

## Stage 14: Split Core Modules ✅
**Duration**: 2 hours
**Status**: COMPLETED

### Tasks:
- [x] Extract player core to modules/player.js
- [x] Extract controls to modules/controls.js
- [x] Extract progress bar to modules/progress-bar.js
- [x] Extract sliders to modules/sliders.js
- [x] Extract utilities to modules/utils.js
- [x] Create main.js entry point
- [x] Create media-player-modular.html

### File Structure After:
```
player/
├── media-player.html (monolithic reference)
├── media-player-modular.html (uses modules)
├── main.js (entry point)
└── modules/
    ├── player.js
    ├── controls.js
    ├── progress-bar.js
    ├── sliders.js
    └── utils.js
```

### What Should Work:
- Everything still works exactly the same
- Modules load correctly
- No functionality lost

### How to Test:
1. Run all tests from previous stages
2. Verify everything still works
3. Check console for module load confirmation
4. No errors in console

### Success Criteria:
- [x] All features still work
- [x] Modules load correctly
- [x] No errors
- [x] Clean separation of concerns

---

## Stage 15: Split Settings Modules ✅
**Duration**: 1.5 hours
**Status**: COMPLETED

### Tasks:
- [x] Extract settings modal to modules/settings.js
- [x] Extract shortcuts to modules/shortcuts.js
- [x] Extract pedal to modules/pedal.js
- [x] Extract auto-detect to modules/auto-detect.js
- [x] Extract video cube to modules/video-cube.js
- [x] Update imports in main.js
- [x] Add settings change event handling

### File Structure After:
```
player/
├── media-player.html (monolithic reference)
├── media-player-modular.html (modular version)
├── main.js
├── styles/
│   └── media-player.css
└── modules/
    ├── player.js
    ├── controls.js
    ├── progress-bar.js
    ├── sliders.js
    ├── settings.js
    ├── shortcuts.js
    ├── pedal.js
    ├── auto-detect.js
    ├── video-cube.js
    └── utils.js
```

### What Should Work:
- All settings features work
- Clean module separation
- Easy to maintain

### Success Criteria:
- [x] Settings modal works
- [x] All three tabs functional
- [x] Clean imports
- [x] Documentation updated

---

## Stage 16: Integration & Polish
**Duration**: 1 hour

### Tasks:
- [ ] Connect to navigation loadMedia calls
- [ ] Add timestamp insertion to text editor
- [ ] Test with real media files
- [ ] Performance optimization
- [ ] Final documentation

### Final Cleanup (User Feedback):
- [ ] Remove test information display (Status/Audio State/Server info)
- [ ] Remove all development-only console logs
- [ ] Clean up test loading functions
- [ ] Ensure production-ready code

### Integration Points:
```javascript
// Navigation calls:
window.mediaPlayer.loadMedia(src, filename, mediaType)

// Text editor calls:
window.mediaPlayer.getCurrentTime() // for timestamp

// Settings affect:
- Keyboard handling
- Auto-detect behavior
- Pedal input
```

### What Should Work:
- Navigation loads files correctly
- Timestamps insert properly
- All settings apply
- Performance is smooth

### Success Criteria:
- [ ] Real files load and play
- [ ] No performance issues
- [ ] All integrations work
- [ ] Ready for production

---

## Progress Tracking

### Overall Status: 
🟡 In Progress

### Stages Complete: 
12 / 16

### Current Stage: 
Stage 13 - Code Analysis & Documentation (Next)

### Blockers:
None

### Next Action:
Proceed to Stage 13 - Code Analysis & Documentation

### Recent Completions:
- Stage 11: Video Support with full drag/resize/minimize ✅
- Stage 12: Responsive Design with collapsible controls ✅

---

## Risk Mitigation

### Backup Points:
- After Stage 2 (basic player works)
- After Stage 6 (all controls work)
- After Stage 10 (settings complete)
- After Stage 12 (before splitting)
- After Stage 15 (modules complete)

### Known Risks:
1. **Video cube disappearing**: Use specific drag handle, no aggressive event prevention
2. **RTL confusion**: Test thoroughly at each stage
3. **Module loading issues**: Test after each split
4. **Settings persistence**: Use localStorage with fallbacks
5. **Performance with large files**: Optimize after Stage 16

### Rollback Procedure:
1. If stage fails, git checkout to last working commit
2. Review what went wrong
3. Adjust plan if needed
4. Retry with fixes

---

## Critical Development Rules

### ⚠️ MANDATORY Naming Conventions:
1. **NAMESPACE EVERYTHING**: All global variables must be prefixed with `media` or `mp`
2. **NO GENERIC NAMES**: Never use generic names like `shortcuts`, `settings`, `config`
3. **CHECK FOR CONFLICTS**: Before adding any global variable, search for existing usage
4. **PREFIX FUNCTIONS**: Any function that could conflict must have `media` prefix
5. **UNIQUE CSS CLASSES**: Use component-specific prefixes for all CSS classes

### Examples:
- ❌ `let shortcuts = {}` → ✅ `let mediaShortcuts = {}`
- ❌ `function loadSettings()` → ✅ `function loadMediaSettings()`
- ❌ `.modal-content` → ✅ `.media-modal-content`

This prevents conflicts with text editor and other components!

---

## Notes for Claude

### Remember:
- Check FUNCTION_MAP.md before writing any function
- Update documentation after each stage
- Test thoroughly before moving to next stage
- Ask user for confirmation at test points
- Work in single file until Stage 13
- No aggressive event prevention on video cube
- RTL: left arrow = forward, right arrow = backward
- Server is on port 3001, not XAMPP

### File Tracking:
At each stage, LIST all files that exist to prevent losing track.

### When Returning to Project:
1. Read IMPLEMENTATION_PLAN.md (this file)
2. Check current stage
3. Read FUNCTION_MAP.md
4. Read MODULE_STRUCTURE.md
5. Continue from where left off