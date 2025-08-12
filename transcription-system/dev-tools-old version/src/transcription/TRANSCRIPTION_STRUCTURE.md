# Transcription Module Structure

## Current Structure
```
transcription/
├── login.php                    # Authentication entry (389 lines)
├── logout.php                   # Session termination (39 lines)  
├── README.md                    # Module documentation
├── TRANSCRIPTION_STRUCTURE.md   # This file
├── TO_CORE_MIGRATION.md        # Migration documentation
├── core/                       # Shared infrastructure
│   ├── api/                    # Backend endpoints
│   │   ├── create-project-with-media.php  (198 lines)
│   │   ├── files.php                      (243 lines)
│   │   ├── projects.php                   (443 lines)
│   │   └── upload.php                     (206 lines)
│   ├── assets/                 # Global CSS/JS/Images
│   │   ├── css/
│   │   │   └── styles.css                 (814 lines)
│   │   ├── js/
│   │   │   ├── collapsible.js             (109 lines)
│   │   │   ├── main.js                    (346 lines)
│   │   │   └── upload.js                  (384 lines)
│   │   └── images/
│   ├── common/                 # Shared PHP includes
│   │   ├── auth.php                       (191 lines)
│   │   ├── database.php                   (70 lines)
│   │   ├── footer.php                     (13 lines)
│   │   └── header.php                     (196 lines)
│   ├── database/               # Schema definitions
│   │   └── schema.sql
│   └── includes/               # Utilities
│       └── file-validation.php            (449 lines)
├── pages/                      # Application pages
│   ├── PAGES_STRUCTURE.md
│   ├── main/                   # Dashboard/Homepage
│   ├── transcription/          # Core transcription workspace
│   ├── transcription2/         # Alternative transcription implementation
│   ├── proofreading/           # Review interface
│   ├── export/                 # Export functionality
│   └── records/                # Records management
└── components/                 # Standalone media player demo
    └── media-player/
        ├── clean-demo.html                 (126 lines)
        ├── clean-standalone-player.js      (688 lines)
        ├── demo.html                       (204 lines)
        ├── how-it-loads-files.html         (248 lines)
        ├── original-demo.html              (115 lines)
        ├── original-standalone-player.js    (651 lines)
        └── standalone-media-player.js      (727 lines)

## Proposed Clean Structure
```
transcription/
├── login.php
├── logout.php
├── README.md
├── TRANSCRIPTION_STRUCTURE.md
├── core/
│   ├── api/          # All API endpoints
│   ├── assets/       # Global assets
│   ├── auth/         # Authentication logic
│   ├── database/     # DB connections & schemas
│   ├── utilities/    # Shared utilities
│   └── config/       # Global configurations
└── pages/
    ├── PAGES_STRUCTURE.md
    ├── main/
    │   ├── index.php
    │   ├── MAIN_STRUCTURE.md
    │   ├── components/
    │   └── core/
    ├── transcription/
    │   ├── index.php
    │   ├── TRANSCRIPTION_STRUCTURE.md
    │   ├── TRANSCRIPTION_FILES_REVIEW.md
    │   ├── components/
    │   └── core/
    ├── proofreading/
    ├── export/
    └── records/
```

## Key Principles
1. Each page is self-contained with its own components and core
2. Global/shared functionality lives in root core folder
3. Clear separation between page-specific and global code
4. Documentation at every level