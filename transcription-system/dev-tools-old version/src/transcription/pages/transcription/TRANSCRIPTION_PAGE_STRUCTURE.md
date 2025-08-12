# Transcription Page Structure

## Page Layout
```
┌─────────────────────────────────────────────────────────┐
│                    Header (Logo, User)                   │
├────────────┬────────────────────────────────┬───────────┤
│            │                                 │           │
│  Sidebar   │         Media Player            │  Speakers │
│            │                                 │   Panel   │
│  Project   ├─────────────────────────────────┤           │
│   Info     │                                 │           │
│            │                                 │           │
│  Stats     │         Text Editor             │  Remarks/ │
│            │                                 │  Support  │
│            │                                 │           │
│            │                                 │           │
└────────────┴─────────────────────────────────┴───────────┘
                    Navigation Bar (Bottom)
```

## Proposed Clean Structure
```
transcription/
├── index.php                        # Main page entry
├── TRANSCRIPTION_PAGE_STRUCTURE.md  # This file
├── TRANSCRIPTION_FILES_REVIEW.md    # Files to review
├── components/
│   ├── header/                     # Top header
│   ├── sidebar/                    # Left panel
│   ├── media-player/               # Media playback
│   ├── text-editor/                # Main editor
│   ├── speakers/                   # Speaker management
│   ├── remarks/                    # Notes panel
│   ├── navigation/                 # Bottom nav
│   └── workspace-header/           # Project info bar
├── core/
│   ├── styles/
│   │   ├── layout.css             # Page layout
│   │   ├── containers.css         # Container styles
│   │   ├── responsive.css         # Mobile styles
│   │   └── themes.css             # Color themes
│   ├── scripts/
│   │   ├── page-init.js           # Page initialization
│   │   ├── component-loader.js    # Load components
│   │   ├── state-manager.js       # Page state
│   │   └── fullscreen.js          # Fullscreen mode
│   └── config/
│       ├── page-config.js         # Page settings
│       └── shortcuts-config.js    # Keyboard config
└── assets/                        # Moved from root
    ├── js/                       # Consolidated JS
    └── css/                      # Consolidated CSS
```

## Component Communication Flow
```
Media Player ←→ Text Editor (timestamps)
     ↓              ↓
Navigation    Speakers Panel (assignments)
     ↓              ↓
        Sidebar (project info)
```

## Core Functionality

### Page Initialization
1. Load project data
2. Initialize all components
3. Restore saved state
4. Set up event listeners
5. Enable keyboard shortcuts

### State Management
- Current project ID
- Active media file
- Editor content
- Speaker list
- User preferences
- Component visibility

### Component Loading Order
1. Header (authentication check)
2. Sidebar (project info)
3. Media Player (file loading)
4. Text Editor (content loading)
5. Speakers Panel (speaker list)
6. Navigation (controls)
7. Remarks (if needed)

### Event System
- Global event bus for component communication
- Namespaced events (component:action)
- Centralized error handling
- State synchronization

### Responsive Behavior
- **Desktop**: Full layout with all panels
- **Tablet**: Collapsible sidebar, tabs for speakers/remarks
- **Mobile**: Stacked layout, swipe navigation

## Files to Consolidate

### JavaScript Consolidation
1. **Media Loading** → `core/scripts/media-loader.js`
2. **Auto-Detect** → `components/media-player/auto-detect/`
3. **Mode Switching** → `core/scripts/view-modes.js`
4. **Debug Files** → Remove after extracting useful code

### CSS Organization
1. **Base Styles** → `core/styles/base.css`
2. **Component Styles** → Each component folder
3. **Responsive** → `core/styles/responsive.css`
4. **Print Styles** → `core/styles/print.css`

## Performance Optimizations
- Lazy load components
- Debounce save operations
- Virtual scrolling for long texts
- Web Workers for auto-save
- Service Worker for offline