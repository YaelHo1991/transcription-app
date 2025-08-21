# Transcription Management System - Implementation Plan

## Overview
Complete overhaul of transcription management to support:
- Multiple transcriptions per media file
- Single transcription across multiple media files
- Shared speakers and remarks per transcription
- Visual separation and reordering capabilities

---

## Stage 1: Create Dropdown Menu Template & Merge Buttons ✅
**Objective:** Create reusable dropdown template and combine "ניהול תמלולים" and "קישור מדיה" buttons
**Status:** COMPLETED - 2024-01-19

### Tasks:
- [x] Create `dropdown-menu-template.css` in TextEditor folder
- [x] Design clean dropdown UI with hover states, animations
- [x] Create new `TranscriptionManagementDropdown.tsx` component
- [x] Remove separate "קישור מדיה" button from toolbar
- [x] Update "ניהול תמלולים" button to use new dropdown

### Test:
- [x] Verify dropdown opens/closes smoothly
- [x] Check hover states and animations
- [x] Ensure proper RTL support
- [x] Test keyboard navigation (Esc to close)

### Documentation:
- [x] Update this file with completion status
- [ ] Add screenshots of new dropdown design (pending)

### Commit:
- [x] Stage all changes
- [ ] Commit message: "feat: Create dropdown menu template and merge transcription management buttons"
- [ ] Update commits-to-git.md with details

### Implementation Notes:
- Created reusable `dropdown-menu-template.css` with comprehensive styling
- New `TranscriptionManagementDropdown` component replaces both old buttons
- Dropdown includes sections for current transcriptions, actions, and advanced features
- Full RTL support with proper animations and hover states
- Keyboard navigation with Escape key support

---

## Stage 2: Implement Data Structure for Multi-Transcription Support
**Objective:** Update data models to support 1-to-many media-transcription relationships

### Tasks:
- [ ] Create `TranscriptionData` interface with:
  - id, mediaIds[], content, speakers, remarks, createdAt, updatedAt
- [ ] Update page.tsx to manage transcriptions array per media
- [ ] Implement default transcription creation when media loads
- [ ] Add transcription numbering system (1, 2, 3...)
- [ ] Store transcription-media mappings

### Test:
- [ ] Verify new media creates default transcription
- [ ] Test multiple transcriptions for single media
- [ ] Ensure transcription IDs are unique
- [ ] Check data persistence in state

### Documentation:
- [ ] Document new data structure
- [ ] Add data flow diagram
- [ ] Update this file with progress

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Implement multi-transcription data structure"
- [ ] Update commits-to-git.md

---

## Stage 3: Add Transcription Navigation to Header
**Objective:** Display transcription number and add navigation when multiple exist

### Tasks:
- [ ] Update TextEditor header to show transcription number
- [ ] Add navigation arrows when multiple transcriptions exist
- [ ] Display format: "Media Name 1/3" with arrows
- [ ] Implement transcription switching logic
- [ ] Update CSS for navigation elements

### Test:
- [ ] Navigate between transcriptions using arrows
- [ ] Verify correct transcription loads
- [ ] Check header updates with transcription changes
- [ ] Test with single vs multiple transcriptions

### Documentation:
- [ ] Document navigation behavior
- [ ] Update this file with completion

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Add transcription navigation to text editor header"
- [ ] Update commits-to-git.md

---

## Stage 4: Implement Dropdown Menu Actions - Part 1
**Objective:** Add New Transcription and Clear Transcription features

### Tasks:
- [ ] Implement "New Transcription" action
  - Create new transcription for current media
  - Auto-number (1, 2, 3...)
  - Switch to new transcription after creation
- [ ] Implement "Clear Transcription" action
  - Show confirmation dialog
  - Clear selected transcription content
  - Keep transcription structure

### Test:
- [ ] Create multiple transcriptions for one media
- [ ] Clear transcription and verify empty state
- [ ] Check numbering sequence
- [ ] Test undo functionality after clear

### Documentation:
- [ ] Document user flows
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Implement new and clear transcription actions"
- [ ] Update commits-to-git.md

---

## Stage 5: Implement Cross-Media Transcription Loading
**Objective:** Allow loading transcriptions from other media files

### Tasks:
- [ ] Add "Load from Other Media" menu option
- [ ] Create transcription selection modal
- [ ] Show list of available transcriptions from other media
- [ ] Implement transcription linking logic
- [ ] Update media-transcription mappings

### Test:
- [ ] Load transcription from different media
- [ ] Verify both media show same transcription
- [ ] Test editing shared transcription
- [ ] Check speaker/remarks sync

### Documentation:
- [ ] Document cross-media behavior
- [ ] Add use case examples
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Enable cross-media transcription loading"
- [ ] Update commits-to-git.md

---

## Stage 6: Add Visual Separation for Multi-Media Transcriptions
**Objective:** Visually distinguish blocks from different media sources

### Tasks:
- [ ] Add media source tracking to blocks
- [ ] Implement visual separator (line or background)
- [ ] Add media name labels between sections
- [ ] Maintain editability across all blocks
- [ ] Update CSS for visual indicators

### Test:
- [ ] Verify visual separation appears correctly
- [ ] Test editing across media boundaries
- [ ] Check separator visibility in different themes
- [ ] Ensure smooth scrolling between sections

### Documentation:
- [ ] Document visual design decisions
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Add visual separation for multi-media transcriptions"
- [ ] Update commits-to-git.md

---

## Stage 7: Implement Transcription Reordering
**Objective:** Allow reordering of transcription segments from different media

### Tasks:
- [ ] Add "Reorder Segments" menu option
- [ ] Create reorder modal with drag-and-drop
- [ ] Update block positions based on new order
- [ ] Persist order preferences
- [ ] Add keyboard shortcuts for reordering

### Test:
- [ ] Drag and drop segments to reorder
- [ ] Verify order persists after save
- [ ] Test keyboard navigation
- [ ] Check undo/redo with reordering

### Documentation:
- [ ] Document reordering workflow
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Implement transcription segment reordering"
- [ ] Update commits-to-git.md

---

## Stage 8: Sync Speakers and Remarks with Transcriptions
**Objective:** Link speakers and remarks to transcriptions (not media)

### Tasks:
- [ ] Update Speaker component to use transcription ID
- [ ] Update Remarks component to use transcription ID
- [ ] Implement data loading based on active transcription
- [ ] Share speakers/remarks for multi-media transcriptions
- [ ] Update data persistence logic

### Test:
- [ ] Switch transcriptions and verify speaker list updates
- [ ] Test remarks sync with transcription changes
- [ ] Verify shared data for multi-media transcriptions
- [ ] Check data persistence

### Documentation:
- [ ] Document speaker/remarks data flow
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Sync speakers and remarks with transcriptions"
- [ ] Update commits-to-git.md

---

## Stage 9: Implement Split Transcription Feature
**Objective:** Allow splitting a transcription at a specific point

### Tasks:
- [ ] Add "Split Transcription" menu option
- [ ] Create split point selector UI
- [ ] Implement transcription splitting logic
- [ ] Update media-transcription mappings after split
- [ ] Handle speakers/remarks division

### Test:
- [ ] Split transcription at various points
- [ ] Verify both parts retain correct content
- [ ] Check speaker/remarks distribution
- [ ] Test undo functionality

### Documentation:
- [ ] Document split workflow
- [ ] Update this file

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Add transcription splitting capability"
- [ ] Update commits-to-git.md

---

## Stage 10: Final Integration and Polish
**Objective:** Complete integration, testing, and UI polish

### Tasks:
- [ ] Add loading states and error handling
- [ ] Implement auto-save for transcription changes
- [ ] Add keyboard shortcuts documentation
- [ ] Create user tooltips and help text
- [ ] Performance optimization

### Test:
- [ ] Full end-to-end workflow testing
- [ ] Performance testing with large transcriptions
- [ ] Error scenario testing
- [ ] Cross-browser compatibility

### Documentation:
- [ ] Create user guide
- [ ] Update all documentation
- [ ] Final review of this plan

### Commit:
- [ ] Stage all changes
- [ ] Commit message: "feat: Complete transcription management system with polish"
- [ ] Update commits-to-git.md

---

## Success Criteria
- [ ] Users can create multiple transcriptions per media
- [ ] Users can share transcriptions across media files
- [ ] Visual separation is clear and intuitive
- [ ] All features work smoothly with RTL text
- [ ] Performance remains fast with large transcriptions
- [ ] Speakers and remarks sync correctly
- [ ] All actions are undoable

## Notes
- Each stage should be tested thoroughly before moving to next
- Update documentation continuously
- Create backups before major changes
- Get user feedback after each major stage

## Progress Tracking
- Stage 1: ✅ COMPLETED (2024-01-19)
- Stage 2: ⏳ Not Started
- Stage 3: ⏳ Not Started
- Stage 4: ⏳ Not Started
- Stage 5: ⏳ Not Started
- Stage 6: ⏳ Not Started
- Stage 7: ⏳ Not Started
- Stage 8: ⏳ Not Started
- Stage 9: ⏳ Not Started
- Stage 10: ⏳ Not Started

---
*Last Updated: [Current Date]*
*Total Estimated Time: 40-50 hours*