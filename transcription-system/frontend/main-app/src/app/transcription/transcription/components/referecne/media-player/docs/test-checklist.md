# Media Player Test Checklist

## Visual Theme
- [x] Teal color theme applied throughout
- [x] Purple reset button in shortcuts settings
- [x] Consistent dark theme with teal accents
- [x] RTL layout properly maintained

## Core Functionality
- [ ] Play/Pause button works
- [ ] Audio loads correctly
- [ ] Progress bar updates during playback
- [ ] Click on progress bar seeks to position
- [ ] Drag progress bar to seek

## Time Controls
- [ ] Current time display updates
- [ ] Total time display shows correct duration
- [ ] Click time to edit (input mode)
- [ ] Double-click current time jumps to start
- [ ] Double-click total time jumps to end

## Skip Controls
- [ ] 2.5s forward/backward buttons work
- [ ] 5s forward/backward buttons work
- [ ] RTL direction correct (right arrow = backward)

## Volume & Speed
- [ ] Volume slider adjusts audio level
- [ ] Speed slider changes playback rate
- [ ] Click speaker icon toggles mute
- [ ] Click speed icon cycles through speeds
- [ ] Double-click speed icon resets to 1x

## Settings Modal
- [ ] Settings button opens modal
- [ ] ESC key closes modal
- [ ] Click outside closes modal
- [ ] X button closes modal
- [ ] All three tabs switch correctly

## Keyboard Shortcuts (with media prefix variables)
- [ ] Default shortcuts work (Space = play/pause)
- [ ] Custom shortcuts can be configured
- [ ] Shortcuts disabled when typing in text editor
- [ ] Settings persist after page reload
- [ ] Visual feedback when capturing new shortcut
- [ ] Conflict detection for duplicate keys
- [ ] All shortcut groups display correctly:
  - Playback controls
  - Navigation controls
  - Volume & speed controls
  - Work modes
  - Additional features
- [ ] New shortcuts work:
  - Stop playback
  - Jump to start
  - Jump to end
  - Toggle work mode
  - Toggle auto-detect
  - Toggle pedal
  - Toggle shortcuts on/off

## Variable Naming (No Conflicts)
- [x] All global variables prefixed with 'media'
- [x] localStorage keys use 'mediaPlayer' prefix
- [x] CSS classes use 'media-' or component-specific prefix
- [x] No conflicts with text editor shortcuts system

## Integration Points
- [ ] window.mediaPlayer.loadMedia() works
- [ ] window.mediaPlayer.getCurrentTime() returns correct time
- [ ] window.mediaPlayer.play() and pause() work

## Performance
- [ ] No console errors
- [ ] Smooth playback without stuttering
- [ ] Responsive UI interactions
- [ ] Settings save/load quickly

## Notes
- Test with actual audio files
- Test with different file formats (mp3, wav, etc.)
- Test in different browsers if possible
- Verify RTL layout in Hebrew context