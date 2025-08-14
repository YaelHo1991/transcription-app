# TextEditor and Layout Implementation Plan

## Overview
This plan addresses layout issues, TextEditor improvements, Speaker component redesign, and responsive scaling to maintain component proportions on larger screens.

## Stage 1: Fix Layout Responsive Scaling
**Status**: 🔄 In Progress  
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
- [ ] Components maintain proportions on 1920px+ screens
- [ ] Spacing increases on larger screens
- [ ] Layout remains centered
- [ ] No horizontal scrolling

---

## Stage 2: Fix White Space at Bottom
**Status**: ⏳ Pending  
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
- [ ] No white space at bottom on all screen sizes
- [ ] Components fill viewport properly
- [ ] Scrolling behavior correct when content overflows

---

## Stage 3: Re-enable & Style Marks Sidebar
**Status**: ⏳ Pending  
**Objective**: Restore marks sidebar with improved styling

### Changes:
- Re-enable marks sidebar in TextEditor.tsx
- Reduce width to 120-150px
- Apply darker turquoise background shade
- Maintain page color theme

### Files:
- `TextEditor.tsx`
- `TextEditor.css`

### Expected Result:
- Narrower, styled marks sidebar
- Better visual hierarchy

### Testing Checklist:
- [ ] Marks sidebar visible
- [ ] Width appropriate (120-150px)
- [ ] Background color matches theme
- [ ] Content displays correctly

---

## Stage 4: TextEditor Turquoise Frame
**Status**: ⏳ Pending  
**Objective**: Match MediaPlayer styling

### Changes:
- Add turquoise border to text-editor-container
- Apply consistent shadow and border-radius
- Match MediaPlayer's visual style

### Files:
- `TextEditor.css`

### Expected Result:
- Consistent component styling
- Turquoise theme throughout

### Testing Checklist:
- [ ] Border matches MediaPlayer style
- [ ] Shadow consistent
- [ ] Border radius appropriate
- [ ] Theme cohesive

---

## Stage 5: Add Toolbar & Reorganize Statistics
**Status**: ⏳ Pending  
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
- [ ] Toolbar displays at top
- [ ] Statistics in footer
- [ ] Styling consistent
- [ ] Layout not broken

---

## Stage 6: Fix RTL Text Navigation
**Status**: ⏳ Pending  
**Objective**: Fix cursor behavior in mixed Hebrew/English text

### Changes:
- Implement proper BiDi text handling
- Fix cursor navigation logic
- Ensure punctuation positioning
- Handle mixed-direction text properly

### Files:
- `TextBlock.tsx`
- `TextBlock.css`

### Expected Result:
- Smooth cursor movement
- Correct punctuation placement
- Proper RTL/LTR switching

### Testing Checklist:
- [ ] Cursor moves correctly in Hebrew text
- [ ] Cursor moves correctly in English text
- [ ] Mixed text navigation works
- [ ] Punctuation positioned correctly

---

## Stage 7: Speaker Component Redesign - Structure
**Status**: ⏳ Pending  
**Objective**: Create block-based speaker component

### Changes:
- Create new SpeakerBlock component
- Three fields: Code, Name, Description
- Similar structure to TextEditor blocks

### Files:
- Create `SpeakerBlock.tsx`
- Create `SpeakerBlock.css`
- Update `SimpleSpeaker.tsx`

### Expected Result:
- Block-based speaker interface
- Three editable fields per speaker

### Testing Checklist:
- [ ] Speaker blocks display correctly
- [ ] Three fields editable
- [ ] Visual design matches requirements
- [ ] Data persists correctly

---

## Stage 8: Speaker Navigation & Integration
**Status**: ⏳ Pending  
**Objective**: Implement SPACE navigation and color sync

### Changes:
- SPACE navigation between speaker blocks
- Synchronize colors with TextEditor
- Maintain speaker state across components

### Files:
- `SpeakerBlock.tsx`
- `SimpleSpeaker.tsx`
- `TextEditor.tsx`

### Expected Result:
- Consistent navigation pattern
- Color synchronization
- Unified speaker management

### Testing Checklist:
- [ ] SPACE navigation works
- [ ] Colors sync between components
- [ ] State maintained correctly
- [ ] No navigation bugs

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