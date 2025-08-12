# Pages Structure Overview

## Page Architecture

Each page follows this structure:
```
page-name/
├── index.php              # Main entry point
├── PAGE_STRUCTURE.md      # Page documentation
├── components/            # Page-specific components
│   └── component-name/
│       ├── index.php/js   # Component entry
│       ├── STRUCTURE.md   # Component structure
│       ├── FUNCTIONS.md   # Component functions
│       └── messages/      # Component messages
└── core/                  # Page-specific core logic
    ├── styles/           # Page styles
    ├── scripts/          # Page scripts
    └── config/           # Page config
```

## Actual Page Files
```
pages/
├── PAGES_STRUCTURE.md           # This file
├── main/                        # Dashboard page
│   ├── index.php               (1,231 lines)
│   ├── index-BACKUP.php        (1,504 lines)
│   ├── check-folder-creation.php (277 lines)
│   ├── test-create-folder.php   (91 lines)
│   └── MAIN_PAGE_STRUCTURE.md
├── transcription/               # Core transcription workspace
│   ├── index.php               (186 lines)
│   ├── TRANSCRIPTION_PAGE_STRUCTURE.md
│   ├── TRANSCRIPTION_FILES_REVIEW.md
│   └── [various JS debug files]
├── transcription2/              # Alternative implementation
│   └── index.php
├── proofreading/                # Review interface
│   └── index.php               (2,013 lines)
├── export/                      # Export functionality  
│   └── index.php               (1,520 lines)
└── records/                     # Records management
    └── index.php               (614 lines)
```

## Current Pages

### 1. **Main (Dashboard)**
**Purpose**: Entry point, project management, statistics
**Key Features**:
- Project statistics grid
- Work sections (CRM, Transcription, License)
- Independent project creation
- File management modal

**Components**:
- `stats-grid` - Statistics display
- `work-sections` - Navigation cards
- `project-management` - Project listing
- `independent-projects` - Standalone project handler
- `file-manager-modal` - File browser

**Files**: index.php (1,231 lines)

### 2. **Transcription**
**Purpose**: Core transcription workspace
**Key Features**:
- Media playback with auto-detect
- Rich text editor with blocks
- Speaker management
- Remarks/support panel
- Keyboard shortcuts

**Components**:
- `media-player` - Audio/video playback
- `text-editor` - Transcription editor
- `speakers` - Speaker management
- `remarks` - Notes panel
- `sidebar` - Project info
- `navigation` - Media navigation
- `workspace-header` - Progress tracking

**Files**: index.php (186 lines)

### 3. **Proofreading**
**Purpose**: Review and correct transcriptions
**Key Features**:
- Read-only media player
- Editing interface
- Comparison view
- Export preview

**Files**: index.php (2,013 lines)
**Status**: Basic structure, needs development

### 4. **Export**
**Purpose**: Export transcriptions in various formats
**Key Features**:
- Format selection
- Template management
- Preview
- Batch export

**Files**: index.php (1,520 lines)
**Status**: Basic structure, needs development

### 5. **Records**
**Purpose**: Archive and search completed transcriptions
**Key Features**:
- Search functionality
- Filtering
- Archive management
- Re-export options

**Files**: index.php (614 lines)
**Status**: Basic structure, needs development

## Page Communication
- Pages communicate through:
  - URL parameters for project/file IDs
  - Session storage for user preferences
  - API calls for data persistence
  - Shared core utilities

## Development Status
- ✅ Main: Functional
- ✅ Transcription: Functional (needs cleanup)
- 🚧 Proofreading: Basic structure
- 🚧 Export: Basic structure
- 🚧 Records: Basic structure