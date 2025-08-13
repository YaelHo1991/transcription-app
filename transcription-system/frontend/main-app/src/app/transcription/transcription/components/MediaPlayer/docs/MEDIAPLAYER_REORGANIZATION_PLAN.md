# MediaPlayer Reorganization Plan

## Overview
This document tracks the step-by-step reorganization of the MediaPlayer component folder.

## Reorganization Stages

### ✅ Stage 1a: Create docs folder and move existing MD files
**Status**: COMPLETED
- Created MediaPlayer/docs/ folder
- Moved MEDIA_PLAYER_MIGRATION.md → docs/
- Moved WAVEFORM_ARCHITECTURE.md → docs/
- Tested: Files moved correctly
- Committed: "Stage 1a: Create docs folder and move existing MediaPlayer documentation"

### 🔄 Stage 1b: Create new documentation files
**Status**: IN PROGRESS
- Create docs/MEDIAPLAYER_STRUCTURE.md
- Create docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
- Test: Verify files created with correct content
- Commit: "Stage 1b: Add MediaPlayer reorganization documentation"

### ⏳ Stage 2: Remove Duplicates & Rename
**Status**: PENDING
**Actions**:
1. Delete MediaPlayer.tsx (duplicate)
2. Delete SettingsModal.old.tsx
3. Rename MediaPlayerOriginal.tsx → index.tsx
4. Update import in page.tsx from `MediaPlayerOriginal` to `MediaPlayer`
5. Test: Run app, verify MediaPlayer loads
6. Update: docs/MEDIAPLAYER_STRUCTURE.md (mark completed)
7. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md (mark stage completed)
8. Commit: "Stage 2: Clean up duplicates and rename main MediaPlayer index"

### ⏳ Stage 3: Create Folder Structure
**Status**: PENDING
**Actions**:
1. Create styles/ folder
2. Create components/SettingsModal/ folder
3. Test: Verify folders exist
4. Update: docs/MEDIAPLAYER_STRUCTURE.md
5. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
6. Commit: "Stage 3: Create MediaPlayer folder structure"

### ⏳ Stage 4: Move CSS Files
**Status**: PENDING
**Actions**:
1. Move shortcuts-styles.css → styles/shortcuts.css
2. Move pedal-styles.css → styles/pedal.css
3. Move autodetect-styles.css → styles/autodetect.css
4. Update imports in index.tsx:
   - `'./shortcuts-styles.css'` → `'./styles/shortcuts.css'`
   - `'./pedal-styles.css'` → `'./styles/pedal.css'`
   - `'./autodetect-styles.css'` → `'./styles/autodetect.css'`
5. Test: Verify styles still work
6. Update: docs/MEDIAPLAYER_STRUCTURE.md
7. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
8. Commit: "Stage 4: Organize MediaPlayer CSS into styles folder"

### ⏳ Stage 5: Organize SettingsModal
**Status**: PENDING
**Actions**:
1. Move SettingsModal.tsx → components/SettingsModal/index.tsx
2. Delete components/SettingsModal.tsx (duplicate)
3. Move ShortcutsTab.tsx → components/SettingsModal/
4. Move PedalTab.tsx → components/SettingsModal/
5. Move AutoDetectTab.tsx → components/SettingsModal/
6. Update imports in index.tsx:
   - `'./ShortcutsTab'` → `'./components/SettingsModal/ShortcutsTab'`
   - `'./PedalTab'` → `'./components/SettingsModal/PedalTab'`
   - `'./AutoDetectTab'` → `'./components/SettingsModal/AutoDetectTab'`
7. Update imports in SettingsModal/index.tsx
8. Test: Open settings modal, verify all tabs work
9. Update: docs/MEDIAPLAYER_STRUCTURE.md
10. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
11. Commit: "Stage 5: Organize SettingsModal components"

### ⏳ Stage 6: Move AutoDetect Components
**Status**: PENDING
**Actions**:
1. Move AutoDetectEnhanced.tsx → components/SettingsModal/
2. Move AutoDetectRegular.tsx → components/SettingsModal/
3. Update imports in AutoDetectTab.tsx:
   - `'../AutoDetectEnhanced'` → `'./AutoDetectEnhanced'`
   - `'../AutoDetectRegular'` → `'./AutoDetectRegular'`
4. Test: Verify AutoDetect functionality
5. Update: docs/MEDIAPLAYER_STRUCTURE.md
6. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
7. Commit: "Stage 6: Move AutoDetect components to SettingsModal"

### ⏳ Stage 7: Clean Up Types
**Status**: PENDING
**Actions**:
1. Rename types.ts → types/index.ts
2. Verify types/marks.ts is in correct location
3. Update all imports:
   - `'./types'` → `'./types/index'` or `'./types'`
4. Test: TypeScript compilation
5. Update: docs/MEDIAPLAYER_STRUCTURE.md
6. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
7. Commit: "Stage 7: Organize MediaPlayer types"

### ⏳ Stage 8: Extract MediaPlayer CSS
**Status**: PENDING
**Actions**:
1. Extract from transcription-page.css:
   ```css
   /* Lines 355-358, 388-391, 529-545 */
   .placeholder-container.media-player { ... }
   .main-content.header-locked .placeholder-container.media-player { ... }
   .placeholder-container.media-player:hover { ... }
   .placeholder-container.media-player h3 { ... }
   ```
2. Add extracted styles to MediaPlayer.css with comment:
   ```css
   /* Extracted from transcription-page.css */
   ```
3. Remove extracted styles from transcription-page.css
4. Test: Verify MediaPlayer styling unchanged
5. Update: docs/MEDIAPLAYER_STRUCTURE.md
6. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md
7. Commit: "Stage 8: Extract MediaPlayer-specific CSS from page styles"

### ⏳ Stage 9: Final Verification
**Status**: PENDING
**Actions**:
1. Run full application test
2. Test all MediaPlayer features:
   - Load audio/video
   - Playback controls
   - Settings modal (all tabs)
   - Waveform display
   - Keyboard shortcuts
   - Auto-detect functionality
3. Verify all imports are correct
4. Check TypeScript compilation
5. Update: docs/MEDIAPLAYER_STRUCTURE.md (mark as complete)
6. Update: docs/MEDIAPLAYER_REORGANIZATION_PLAN.md (final status)
7. Commit: "Stage 9: Complete MediaPlayer reorganization"

## Important Notes
- Each stage must be tested before committing
- Both documentation files must be updated at each stage
- No functional changes - only reorganization
- ProjectNavigator handles media/project imports (not moving this)
- All existing functionality must be preserved

## Success Criteria
- [ ] All duplicate files removed
- [ ] Clear folder structure established
- [ ] All imports working correctly
- [ ] All functionality preserved
- [ ] Documentation complete and accurate
- [ ] No TypeScript errors
- [ ] Application runs without errors