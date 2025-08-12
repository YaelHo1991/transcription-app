# Transcription Page Files Review List

## JavaScript Files to Review and Categorize

### Core Application Files ✅
- [ ] `index.php` - Main page entry
- [ ] `includes/config.php` - Configuration
- [ ] `includes/auth-check.php` - Authentication

### Assets JavaScript Files 📁
Located in `assets/js/`:

#### Primary Files (Keep)
- [ ] `transcription-app.js` - Main application logic
- [ ] `config.js` - Configuration settings
- [ ] `utils.js` - Utility functions
- [ ] `drag-drop.js` - Drag and drop functionality

#### Media Loading Files (Consolidate)
- [ ] `media-loader.js`
- [ ] `media-connector.js`
- [ ] `media-consolidated.js`
- [ ] `media-fix.js`
- [ ] `direct-media-loader.js`
- [ ] `project-media-loader.js`
- [ ] `real-projects-loader.js`
- [ ] `simple-init.js`
- [ ] `media-path-fix.js`
- [ ] `debug-media-load.js`
- [ ] `final-fix.js`

### Auto-Detect Files (Review for Consolidation) 🔍
Root level files that should be moved to media-player component:

#### Main Auto-Detect Files
- [ ] `auto-detect-block-editor-fix.js`
- [ ] `clean-auto-detect-fix.js`
- [ ] `simple-auto-detect-fix.js`
- [ ] `minimal-auto-detect.js`
- [ ] `final-auto-detect-patch.js`
- [ ] `disable-auto-detect.js`

#### Mode and Debug Files
- [ ] `debug-mode-switch.js`
- [ ] `debug-actual-modes.js`
- [ ] `debug-block-editor-auto-detect.js`
- [ ] `direct-mode-test.js`
- [ ] `trace-mode-behavior.js`
- [ ] `final-mode-fix.js`

#### Fix Files (Temporary)
- [ ] `fix-auto-detect-complete.js`
- [ ] `fix-auto-detect-now.js`
- [ ] `fix-button-swap.js`
- [ ] `fix-localstorage-swap.js`
- [ ] `fix-mode-swap.js`
- [ ] `fix-onclick-swap.js`
- [ ] `fix-settings-modal-autodetect.js`

### CSS Files 📋
- [ ] `fix-shortcuts-scrollbar.css`
- [ ] `assets/css/base.css`
- [ ] `assets/css/layout.css`
- [ ] `assets/css/layout-improved.css`

## Action Plan for Each Category

### 1. **Core Files** → Move to `core/`
- Config and authentication logic
- Base initialization

### 2. **Media Files** → Consolidate into `components/media-player/core/`
- Create single `media-handler.js`
- Remove duplicate functionality
- Keep best implementation

### 3. **Auto-Detect Files** → Move to `components/media-player/auto-detect/`
- Consolidate into `auto-detect-manager.js`
- Keep enhanced and regular modes
- Remove debug and fix files after testing

### 4. **Component Files** → Already organized in components/

## Files to Delete After Review
- All debug-*.js files (after extracting useful code)
- All fix-*.js files (after confirming fixes are integrated)
- Duplicate media loading files
- Test files (test-*.js)

## Review Priority
1. **High**: Media loading consolidation (blocking other work)
2. **High**: Auto-detect consolidation (complex functionality)
3. **Medium**: Mode switching logic
4. **Low**: Debug and fix files

## Notes
- Many files appear to be iterations of fixes for the same issues
- Auto-detect functionality is core to the media player
- Mode switching between block editor and regular editor needs careful review
- Keep backup before deleting any files