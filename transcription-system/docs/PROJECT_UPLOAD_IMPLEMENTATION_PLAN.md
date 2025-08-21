# Project Upload System - Implementation Plan
## מערכת העלאת פרויקטים - תוכנית יישום

### Overview
Fix the media/transcription synchronization workflow while preserving working functionality.

---

## Phase 1: Terminology & Structure Cleanup ✅
- [x] Rename frontend "Project" type to "MediaCollection" in page.tsx
- [x] Update all references from "projects" to "mediaCollections" for media
- [x] Keep backend "project" terminology for transcription projects
- [x] Add clear comments distinguishing media collections vs transcription projects
- [x] Test that rename doesn't break existing functionality

**Checkpoint**: System should work exactly as before, just with clearer naming ✅
**Status**: COMPLETED - Application compiles and runs successfully with clearer terminology

---

## Phase 2: Fix Duplicate Project Creation ✅
- [x] Add check in handleMediaUpload to prevent duplicate project creation
- [x] Implement getOrCreateProject function that checks for existing project
- [x] Fix session restore to not reload from backend if session exists
- [x] Update loadExistingProjects to check session first
- [x] Test uploading same media multiple times doesn't create duplicates

**Checkpoint**: Uploading media should create only one project per media file ✅
**Status**: COMPLETED - Implemented getOrCreateProject with duplicate prevention

---

## Phase 3: Media Removal with Transcription Preservation
- [ ] Update backend projectService to add "orphanProject" method
- [ ] Add "isOrphaned" field to metadata.json
- [ ] Modify handleRemoveMedia to orphan project instead of delete
- [ ] Update project listing to separate active vs orphaned projects
- [ ] Keep transcription data intact when media is removed
- [ ] Test that removing media preserves all transcription data

**Checkpoint**: Removing media should preserve transcription as orphaned project

---

## Phase 4: Secondary Transcription Loading
- [ ] Create API endpoint to list orphaned transcriptions
- [ ] Add "secondaryMode" state to TextEditor
- [ ] Create TranscriptionManager component for secondary transcriptions
- [ ] Update TranscriptionSwitcher to use real data (remove mock)
- [ ] Add "Load Secondary Transcription" button to TextEditor header
- [ ] Implement switching between main and secondary transcriptions
- [ ] Add "Return to Main" button when in secondary mode
- [ ] Test loading orphaned transcriptions

**Checkpoint**: Should be able to load and switch between main and secondary transcriptions

---

## Phase 5: Project Navigation Restrictions
- [ ] Disable project navigation arrows when on main transcription
- [ ] Enable navigation only for secondary transcriptions
- [ ] Add visual indicator for main vs secondary mode
- [ ] Prevent navigation from breaking media sync
- [ ] Test navigation works correctly in both modes

**Checkpoint**: Navigation should only work for secondary transcriptions

---

## Phase 6: Delete Functionality for Orphaned Transcriptions
- [ ] Add delete button for orphaned transcriptions only
- [ ] Implement permanent deletion API endpoint
- [ ] Add confirmation modal for deletion
- [ ] Prevent deletion of active (media-linked) transcriptions
- [ ] Update list after deletion
- [ ] Test deletion of orphaned transcriptions

**Checkpoint**: Should be able to delete only orphaned transcriptions

---

## Phase 7: User Isolation & Permissions
- [ ] Ensure all API calls include userId from JWT token
- [ ] Filter projects by current user in all endpoints
- [ ] Test that users only see their own projects
- [ ] Verify transcriber code system still works
- [ ] Test multi-user scenarios

**Checkpoint**: Each user should only see and access their own projects

---

## Phase 8: Session Management Fixes
- [ ] Fix mediaProjectsMap persistence
- [ ] Prevent session/backend loading conflicts
- [ ] Clean up redundant session code in MediaPlayer
- [ ] Ensure proper state synchronization
- [ ] Test session restore after page refresh

**Checkpoint**: Session should restore correctly without duplicates

---

## Phase 9: Final Testing & Cleanup
- [ ] Remove all console.log debug statements
- [ ] Remove unused variables and imports
- [ ] Test complete workflow: upload → transcribe → remove media → load secondary
- [ ] Test version history still works
- [ ] Test backup/restore functionality
- [ ] Verify all features work together
- [ ] Update user documentation if needed

**Checkpoint**: System fully functional with new workflow

---

## Testing Checklist for Each Phase
1. ✅ Existing functionality still works
2. ✅ No console errors
3. ✅ Data persists correctly
4. ✅ UI updates properly
5. ✅ User isolation maintained

---

## Notes
- Each phase should be completed and tested before moving to the next
- Keep backup system intact (it's working well)
- Preserve version history functionality
- Maintain backward compatibility with existing projects

---

## Current Status
**Phase**: Phase 2 COMPLETED ✅
**Last Updated**: 2025-08-21
**Next Step**: Begin Phase 3 - Media removal with transcription preservation