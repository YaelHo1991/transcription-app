# Media Player Modularization Plan

## Current State
- Working monolithic version at Stage 12 in `player/media-player.html`
- Single HTML file with embedded CSS and JavaScript
- All functionality tested and working

## Goal
Convert the monolithic media player into a modular architecture while maintaining 100% functionality and appearance.

## Approach: Incremental Extraction
We will extract code bit by bit, testing after each step to ensure nothing breaks.

## Phase 1: CSS Extraction (Keep JavaScript Intact)
1. **Create CSS file structure**
   - `modular-v2/css/base.css` - Reset and container styles
   - `modular-v2/css/controls.css` - Control buttons and layout
   - `modular-v2/css/progress.css` - Progress bar styles
   - `modular-v2/css/sliders.css` - Volume and speed sliders
   - `modular-v2/css/modal.css` - Settings modal
   - `modular-v2/css/shortcuts.css` - Keyboard shortcuts tab
   - `modular-v2/css/pedal.css` - Pedal settings tab
   - `modular-v2/css/autodetect.css` - Auto-detect tab
   - `modular-v2/css/video-cube.css` - Video cube styles
   - `modular-v2/css/responsive.css` - Media queries
   - `modular-v2/css/animations.css` - Transitions and animations

2. **Extract styles incrementally**
   - Copy `media-player.html` to `modular-v2/index.html`
   - Extract one CSS section at a time
   - Replace with `<link>` tag
   - Test that appearance remains identical
   - Commit after each successful extraction

## Phase 2: HTML Structure (Keep JavaScript Intact)
1. **Keep complete HTML structure**
   - Do NOT use JavaScript to create HTML elements
   - Keep all HTML elements in the main file
   - This ensures the player works even if JS fails to load

## Phase 3: JavaScript Modularization
1. **Create module structure**
   ```
   modular-v2/js/
   ├── core/
   │   ├── player.js - Audio/video player core
   │   ├── state.js - Global state management
   │   └── events.js - Event system
   ├── ui/
   │   ├── controls.js - Play/pause/seek controls
   │   ├── progress.js - Progress bar
   │   ├── sliders.js - Volume/speed sliders
   │   ├── display.js - Time display
   │   └── collapse.js - Collapse/expand functionality
   ├── features/
   │   ├── shortcuts.js - Keyboard shortcuts
   │   ├── pedal.js - Foot pedal
   │   ├── autodetect.js - Auto-detect
   │   └── video-cube.js - Video cube
   ├── settings/
   │   ├── modal.js - Settings modal
   │   ├── tabs.js - Tab navigation
   │   └── persistence.js - Save/load settings
   └── main.js - Entry point
   ```

2. **Extract JavaScript incrementally**
   - Start with utility functions
   - Move to independent features (video cube, shortcuts)
   - Then UI components (sliders, progress)
   - Finally core player logic
   - Test after each extraction

## Phase 4: Integration Testing
1. **Test all features**
   - Media playback (audio/video)
   - All controls work
   - Keyboard shortcuts
   - Pedal functionality
   - Auto-detect
   - Settings persistence
   - Responsive design
   - RTL layout

2. **Cross-browser testing**
   - Chrome
   - Firefox
   - Edge
   - Safari

## Phase 5: Optimization
1. **Bundle modules for production**
   - Create build script
   - Minify CSS/JS
   - Optimize load order

## Key Principles
1. **Test after every change** - Never move to next step if current step breaks anything
2. **Keep HTML static** - All HTML elements should exist in the DOM, not created by JS
3. **Maintain backward compatibility** - Each phase should work independently
4. **Preserve all functionality** - Nothing should be lost in the modularization
5. **Document everything** - Clear comments and documentation

## Current Status
- [x] Stage 12 restored and working
- [ ] Phase 1: CSS Extraction
- [ ] Phase 2: HTML Structure
- [ ] Phase 3: JavaScript Modularization
- [ ] Phase 4: Integration Testing
- [ ] Phase 5: Optimization

## Next Steps
1. Create `modular-v2` directory structure
2. Copy working `media-player.html` to `modular-v2/index.html`
3. Begin CSS extraction with `base.css`