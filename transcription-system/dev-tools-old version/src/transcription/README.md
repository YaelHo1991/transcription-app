# Transcription App - Structure Documentation

## Overview
The transcription app has been reorganized into a clean, modular structure that separates infrastructure code from page-specific code.

## Current Actual File Structure

```
client/src/transcription/
├── core/
│   ├── assets/
│   │   ├── css/
│   │   ├── images/
│   │   └── js/
│   │       └── upload.js
│   └── common/
│       └── config.php
│
├── pages/
│   ├── main/
│   │   ├── assets/
│   │   │   ├── css/
│   │   │   │   └── dashboard.css
│   │   │   └── js/
│   │   │       ├── dashboard.js
│   │   │       ├── projects.js
│   │   │       └── file-manager.js
│   │   └── index.php
│   │
│   └── transcription/
│       ├── assets/
│       │   ├── css/
│       │   │   ├── base.css
│       │   │   └── layout.css
│       │   └── js/
│       │       ├── config.js
│       │       ├── drag-drop.js
│       │       ├── transcription-app.js
│       │       └── utils.js
│       ├── components/
│       │   ├── header/
│       │   │   ├── header.css
│       │   │   ├── header.js
│       │   │   └── header.php
│       │   ├── sidebar/
│       │   │   ├── sidebar.css
│       │   │   ├── sidebar.js
│       │   │   └── sidebar.php
│       │   ├── media-player/
│       │   │   ├── controls/                # Player control components
│       │   │   │   ├── controls.css
│       │   │   │   └── controls.js
│       │   │   ├── css/                     # Player styling
│       │   │   │   ├── media-player.css
│       │   │   │   └── player-base.css
│       │   │   ├── includes/                # PHP component templates
│       │   │   │   ├── advanced-controls.php
│       │   │   │   ├── file-info-bar.php
│       │   │   │   ├── main-controls.php
│       │   │   │   ├── progress-bar.php
│       │   │   │   └── video-layout.php
│       │   │   ├── js/                      # Core player JavaScript
│       │   │   │   ├── MediaPlayer.js
│       │   │   │   └── init.js
│       │   │   ├── modals/                  # (Empty - placeholder)
│       │   │   ├── pedal/                   # (Empty - for USB pedal support)
│       │   │   ├── progress-bar/            # Progress bar component
│       │   │   │   ├── progress-bar.css
│       │   │   │   └── progress-bar.js
│       │   │   ├── shortcuts/               # (Empty - keyboard shortcuts)
│       │   │   ├── player.php               # (Not in use - monolithic version)
│       │   │   ├── player-new.php           # Currently connected modular version
│       │   │   ├── player-new1.php          # Another version
│       │   │   └── simple-player.php        # Basic HTML5 player
│       │   ├── text-editor/
│       │   │   ├── editor.css
│       │   │   ├── editor.js
│       │   │   └── editor.php
│       │   ├── speakers/
│       │   │   ├── speakers.css
│       │   │   ├── speakers.js
│       │   │   └── speakers.php
│       │   └── remarks/
│       │       ├── remarks.css
│       │       ├── remarks.js
│       │       └── remarks.php
│       ├── includes/
│       │   ├── auth-check.php
│       │   ├── config.php
│       │   ├── helper-files.php (should be in components)
│       │   ├── navigation-bar.php (should be in components)
│       │   └── workspace-header.php (should be in components)
│       ├── index.php (current active file)
│       ├── index-backup.php
│       └── Transcription-green.html (original template)

## Transcription Page Component Structure

### Visual Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                    Header (Hovering - Hidden by default)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐ │
│  │          │  │                                                │ │
│  │ Sidebar  │  │           Workspace Header                     │ │
│  │(Hovering)│  ├────────────────────────────────────────────────┤
│  │          │  │                                                │ │
│  │Projects  │  │  ┌──────────────────────┐ ┌────────────────┐ │ │
│  │  List    │  │  │                      │ │                │ │ │
│  │          │  │  │   Media Player       │ │   Speakers     │ │ │
│  │          │  │  │                      │ │                │ │ │
│  │          │  │  ├──────────────────────┤ ├────────────────┤ │ │
│  │          │  │  │                      │ │                │ │ │
│  │          │  │  │                      │ │   Remarks/     │ │ │
│  │          │  │  │   Text Editor        │ │   Notes        │ │ │
│  │          │  │  │   (Transcription)    │ │                │ │ │
│  │          │  │  │                      │ ├────────────────┤ │ │
│  │          │  │  │                      │ │ Helper Files   │ │ │
│  │          │  │  │                      │ │   (Toggle)     │ │ │
│  │          │  │  └──────────────────────┘ └────────────────┘ │ │
│  └──────────┘  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy
```
index.php
├── Header (components/header/)
│   └── Hovering navigation menu
├── Sidebar (components/sidebar/)
│   ├── Project statistics
│   └── Project list with media info
├── Main Content
│   ├── Workspace Header (includes/workspace-header.php)
│   │   ├── Project title & current media
│   │   └── Project navigation buttons
│   ├── Navigation Bar (includes/navigation-bar.php)
│   │   ├── Project navigation
│   │   └── Media navigation
│   └── Workspace Grid (70% / 30% split)
│       ├── Main Workspace
│       │   ├── Media Player (components/media-player/)
│       │   │   └── Currently using: player-new.php
│       │   └── Text Editor (components/text-editor/)
│       └── Side Workspace
│           ├── Speakers (components/speakers/)
│           ├── Remarks (components/remarks/)
│           └── Helper Files (includes/helper-files.php)
```

### Media Player Component Structure

The media player is the most complex component with multiple subfolders:

1. **Active Components**:
   - `controls/` - JavaScript and CSS for player controls (play, pause, speed, etc.)
   - `css/` - Main styling files for the media player
   - `includes/` - PHP templates for modular player components (used by player-new.php)
   - `js/` - Core MediaPlayer class and initialization scripts
   - `progress-bar/` - Separate component for the progress/seek bar

2. **Empty Placeholder Folders**:
   - `modals/` - Intended for modal dialogs (shortcuts help, settings)
   - `pedal/` - For USB foot pedal integration
   - `shortcuts/` - For keyboard shortcut handling

3. **Multiple Player Versions**:
   - `player.php` - Original monolithic version (not referenced in index.php)
   - `player-new.php` - Modular refactored version (currently connected)
   - `player-new1.php` - Another version (purpose unclear)
   - `simple-player.php` - Basic HTML5 player fallback

### Current Issues

1. **Missing JavaScript Includes**: Media player scripts not loaded in index.php
   - Need to add: MediaPlayer.js, controls.js, progress-bar.js, init.js

2. **Misplaced Components**: Three files in includes/ should be in components/
   - helper-files.php → components/helper-files/
   - navigation-bar.php → components/navigation/
   - workspace-header.php → components/workspace-header/

3. **Navigation Duplication**: Both workspace-header and navigation-bar have project nav

4. **Media Player Confusion**: Multiple versions and empty folders
   - Should clarify which player version to use
   - Remove or complete empty folders (modals, pedal, shortcuts)
   - player.php file exists but isn't referenced anywhere

## Intended Folder Structure

```
transcription-app/
├── core/                       # Infrastructure and shared resources
│   ├── api/                   # API endpoints
│   │   ├── files.php
│   │   ├── projects.php
│   │   └── upload.php
│   ├── assets/                # Global assets
│   │   ├── css/
│   │   ├── images/
│   │   └── js/
│   │       └── upload.js
│   ├── common/                # Common PHP includes
│   │   ├── auth.php
│   │   ├── database.php
│   │   ├── footer.php
│   │   └── header.php
│   ├── database/              # Database schema and utilities
│   │   └── schema.sql
│   └── includes/              # Other includes
│       └── file-validation.php
│
├── pages/                     # Application pages
│   ├── main/                  # Dashboard/Homepage
│   │   ├── assets/           # Page-specific assets
│   │   │   ├── css/
│   │   │   │   ├── dashboard.css
│   │   │   │   ├── stats.css
│   │   │   │   ├── projects.css
│   │   │   │   └── file-manager.css
│   │   │   └── js/
│   │   │       ├── dashboard.js
│   │   │       ├── projects.js
│   │   │       └── file-manager.js
│   │   ├── components/        # Dashboard components
│   │   │   ├── header.php
│   │   │   ├── navigation.php
│   │   │   ├── stats-grid.php
│   │   │   ├── work-sections.php
│   │   │   ├── independent-projects.php
│   │   │   └── file-manager-modal.php
│   │   ├── index.php         # Original file
│   │   └── index-clean.php   # Clean version with separated assets
│   │
│   ├── transcription/         # Transcription page
│   │   ├── assets/           # Page-specific assets
│   │   │   ├── css/
│   │   │   │   ├── transcription.css
│   │   │   │   └── header.css
│   │   │   └── js/
│   │   │       ├── transcription.js
│   │   │       └── header.js
│   │   ├── components/        # Transcription components
│   │   │   ├── media-player/
│   │   │   │   ├── player.php
│   │   │   │   ├── player.js
│   │   │   │   └── player.css
│   │   │   ├── text-editor/
│   │   │   │   ├── editor.php
│   │   │   │   ├── editor.js
│   │   │   │   └── editor.css
│   │   │   ├── speakers/
│   │   │   │   ├── speakers.php
│   │   │   │   ├── speakers.js
│   │   │   │   └── speakers.css
│   │   │   └── remarks/
│   │   │       ├── remarks.php
│   │   │       ├── remarks.js
│   │   │       └── remarks.css
│   │   ├── index.php         # Original file
│   │   └── index-clean.php   # Clean version with separated assets
│   │
│   ├── proofreading/          # Proofreading page
│   │   └── index.php
│   │
│   ├── export/                # Export page
│   │   └── index.php
│   │
│   └── records/               # Records page
│       └── index.php
│
└── login.php                  # Login page at root level
```

## Key Benefits

1. **Clear Separation**: Core infrastructure (API, database, common files) is separated from page-specific code
2. **Modular Components**: Each page has its own components folder with self-contained PHP, JS, and CSS files
3. **Asset Organization**: CSS and JavaScript are split into logical files instead of being inline
4. **Maintainability**: Each component is isolated and can be modified without affecting others
5. **Scalability**: Easy to add new pages or components following the established pattern

## Migration Notes

- The `index-clean.php` files demonstrate the new structure with separated assets
- Original `index.php` files are preserved for reference
- All paths need to be updated to reflect the new structure
- Component imports use relative paths from the page directory

## Next Steps

1. Update all include paths in the original files to use the new structure
2. Test all functionality to ensure nothing is broken
3. Remove the original files once the clean versions are verified
4. Update any external references to the old file paths