# TextEditor and Layout Implementation Plan

## Overview
This plan addresses layout issues, TextEditor improvements, Speaker component redesign, and responsive scaling to maintain component proportions on larger screens.

## Stage 1: Fix Layout Responsive Scaling
**Status**: ✅ Complete  
**Commit**: `8558795`  
**Objective**: Components maintain proportions on larger screens with increased spacing

### Changes:
- Wrap main content in a max-width container (e.g., 1600px)
- Center the container on larger screens
- Add padding that increases with screen size
- Components maintain fixed max-widths with flexible gaps

### Files:
- `transcription-page.css`
- `page.tsx` (wrapper divs)

### Expected Result:
- Components don't stretch on wide screens
- More whitespace between components on larger displays
- Consistent proportions across screen sizes

### Testing Checklist:
- [x] Components maintain proportions on 1920px+ screens
- [x] Spacing increases on larger screens
- [x] Layout remains centered
- [x] No horizontal scrolling

### Completion Notes:
- Successfully removed max-width constraint
- Gaps increase dramatically on larger screens (up to 70px)
- Header properly aligned with 15px top margin
- Scrollbars completely hidden using multiple techniques
- All components now scale properly with screen size

---

## Stage 2: Fix White Space at Bottom
**Status**: ✅ Complete (Fixed in Stage 1)  
**Objective**: Remove white gap at page bottom

### Changes:
- Adjust main-content height calculations
- Fix workspace-grid to fill available height
- Remove conflicting min/max height constraints

### Files:
- `transcription-page.css`

### Expected Result:
- Full viewport utilization
- No white space at bottom

### Testing Checklist:
- [x] No white space at bottom on all screen sizes
- [x] Components fill viewport properly
- [x] Scrolling behavior correct when content overflows

### Completion Notes:
- Fixed as part of Stage 1 by adjusting height calculations
- Changed main-content height from `100vh - 120px` to `100vh - 70px`
- Removed overflow scrollbars that were causing layout issues

---

## Stage 3: Re-enable & Style Marks Sidebar
**Status**: ✅ Complete  
**Commit**: `ea20c19`  
**Objective**: Restore marks sidebar with improved styling

### Changes:
- Re-enabled marks sidebar in TextEditor.tsx
- Reduced width to 140px
- Applied turquoise gradient background (#e6f7f5 to #f0fdfb)
- Fixed layout issue - moved statistics to footer
- Fixed RTL text direction with dir="rtl" and unicode-bidi
- Added RTL mark for proper Hebrew text handling

### Files:
- `TextEditor.tsx`
- `TextEditor.css`
- `TextBlock.tsx`
- `TextBlock.css`

### Expected Result:
- Narrower, styled marks sidebar
- Better visual hierarchy
- Statistics in footer, not third column
- RTL text works properly

### Testing Checklist:
- [x] Marks sidebar visible
- [x] Width appropriate (140px)
- [x] Background color matches theme
- [x] Content displays correctly
- [x] Statistics in footer
- [x] RTL text direction works

### Additional Work Done:
- Fixed TextEditor layout from row to column direction
- Added proper RTL support for Hebrew text
- Attempted smart language detection (partially working)
- Removed double cursor issue

---

## Stage 4: TextEditor Turquoise Frame
**Status**: ✅ Complete  
**Commit**: `28f446f`  
**Objective**: Match MediaPlayer styling

### Changes:
- Added dark turquoise frame matching MediaPlayer (1.5px border)
- Applied double-layer design with dark outer frame
- Restored light turquoise interior sections
- Added subtle shadows and hover effects
- Created inner wrapper for proper layout

### Files:
- `TextEditor.css`
- `TextEditor.tsx` (added inner wrapper)

### Expected Result:
- Consistent component styling
- Dark turquoise frame matching MediaPlayer
- Light interior sections for readability

### Testing Checklist:
- [x] Border matches MediaPlayer style
- [x] Shadow consistent
- [x] Border radius appropriate
- [x] Theme cohesive
- [x] Frame not too bold (1.5px thickness)

---

## Stage 5: Add Toolbar & Reorganize Statistics
**Status**: ✅ Complete  
**Commit**: `212f06c`  
**Objective**: Add toolbar, move stats to footer

### Changes:
- Create toolbar section with icon placeholders
- Move word/character/speaker counts to footer bar
- Style consistently with theme

### Files:
- `TextEditor.tsx`
- `TextEditor.css`

### Expected Result:
- Toolbar at top for future tools
- Statistics in footer bar

### Testing Checklist:
- [x] Toolbar displays at top
- [x] Statistics in footer
- [x] Styling consistent
- [x] Layout not broken

### Completion Notes:
- Successfully added toolbar with multiple sections
- Buttons include New, Save, Print, Undo, Redo, Find, Replace, Settings
- Sync button toggles active state
- Statistics were already in footer from Stage 3
- Turquoise theme consistent with rest of TextEditor

---

## Stage 6: Fix RTL Text Navigation
**Status**: 🔄 Partially Complete (merged into Stage 3)  
**Objective**: Fix cursor behavior in mixed Hebrew/English text

### Changes Completed in Stage 3:
- Implemented RTL text handling with dir="rtl" attribute
- Fixed basic Hebrew text input and cursor positioning
- Added RTL mark (U+200F) for proper text direction
- Changed from span to div for better contenteditable support
- Added unicode-bidi: plaintext for mixed content

### Remaining Work (deferred):
- Smart language detection on character input
- END key to switch to RTL mode
- HOME key language detection
- Cursor style differentiation (Word-like)

### Files Modified:
- `TextBlock.tsx`
- `TextBlock.css`

### Testing Results:
- [x] Basic Hebrew text input works
- [x] Cursor positioned correctly for RTL
- [ ] Smart language switching (partial)
- [ ] END/HOME key functionality (attempted)

---

## Stage 7-8 Combined: Complete Speaker Redesign & Integration
**Status**: 🔄 In Progress  
**Objective**: Complete redesign of Speaker component with full TextEditor integration

### Visual Design Changes:
1. **Container Styling**:
   - Dark teal header "רשימת דוברים" (like MediaPlayer) with WHITE text
   - Remove "דובר חדש" button (auto-add speakers)
   - Remove statistics section (אנגלית/עברית/דוברים counts)
   - Remove keyboard shortcuts section (saves space)
   - Add vertical scrollbar for list

2. **Speaker Block Layout**:
   - Table-like grid: Code (50px) | Name (1fr) | Description (2fr)
   - Blocks grow vertically with content
   - NO horizontal scrolling - text wraps
   - Clean, minimal design

### Navigation Rules:
1. **Code Field** (single character, unique):
   - SPACE → Move to Name field
   - ENTER → Create new speaker block
   - Validation: No duplicate codes allowed

2. **Name Field** (can have spaces):
   - TAB → Move to Description field
   - SHIFT+TAB → Back to Code field
   - ENTER → Create new speaker block

3. **Description Field** (multiline):
   - SHIFT+ENTER → New line within field
   - ENTER → Create new speaker block
   - TAB → Next block's Code field

### Integration Features:
1. **Auto-Add Speakers**:
   - Unknown code in TextEditor → auto-create in Speaker list
   - Assign color automatically
   - Create placeholder name

2. **Color Synchronization**:
   - Same color in both components
   - Persists across all blocks

3. **Name Transformation**:
   - Code in TextEditor → transform to name when leaving field
   - Support multi-char codes (א vs אא)
   - Update all instances when name changes

### Scrolling Behavior:
- Speaker list: Fixed height container with vertical scroll
- TextEditor blocks: Fixed container with vertical scroll
- Individual blocks: Auto-height, text wraps

### Files to Modify:
- `SimpleSpeaker.tsx` - Remove elements, add validation
- `SimpleSpeaker.css` - Dark header, table layout, scrolling
- `SpeakerBlock.tsx` - Navigation logic, multiline support
- `SpeakerBlock.css` - Vertical growth, text wrapping
- `SpeakerBlockManager.ts` - Unique code validation
- `TextEditor.css` - Add scrolling to blocks
- `TextBlock.tsx` - Trigger speaker creation

### Testing Checklist:
- [ ] Dark teal header with white text
- [ ] No duplicate codes allowed
- [ ] SPACE/TAB/ENTER navigation works correctly
- [ ] SHIFT+ENTER creates new lines in description
- [ ] Vertical scrolling works (no horizontal scroll)
- [ ] Auto-add speakers from TextEditor
- [ ] Colors sync between components
- [ ] Names update across all blocks
- [ ] Blocks grow vertically as needed

---

## IMPORTANT: Process for EVERY Single Stage

### After completing each stage, I will:
1. **STOP** and announce "Stage X Complete - Ready for Testing"
2. **WAIT** for you to test the changes
3. **FIX** any issues you find
4. **GET YOUR APPROVAL** - you must say "approved" or similar
5. **COMMIT TO GIT** with descriptive message
6. **UPDATE git-commits.md** in C:\Users\ayelh\Documents\Projects\Transcription\docs\
7. **UPDATE this implementation-plan.md** with completion status and any notes
8. **ONLY THEN** proceed to next stage

### This happens after EVERY stage, no exceptions!

## Git Commit Format:
```
Stage X: [Brief description]
- Change 1
- Change 2
- Change 3
```

## Rollback Procedure:
If a stage causes issues:
```bash
# Restore to previous commit
git checkout HEAD~1 -- [affected files]

# Or restore specific stage
git checkout [commit-hash] -- [file-path]
```

---

This plan ensures incremental progress with testing and version control at each milestone.