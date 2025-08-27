# Transcription Backup & Management System - Implementation Plan

## Overview
Comprehensive backup and transcription management system with auto-save, version history, and multi-media support.

## Core Requirements
- ✅ Auto-save every minute (if changes exist)
- ✅ TXT file backups with human-readable format
- ✅ Support multiple transcriptions per media file
- ✅ Support multiple media files per transcription
- ✅ Project-based organization
- ✅ Version history with restore capability
- ✅ Silent operation with status indicator

---

## Stage 1: Database Infrastructure
**Goal**: Create database schema for transcriptions, projects, and media relationships

### Tasks:
- [x] Create migration file for new tables
- [x] Add projects table
- [x] Add transcriptions table
- [x] Add media_files table
- [x] Add transcription_media junction table
- [x] Add transcription_backups table
- [x] Test database migrations
- [x] Update backend models

### Database Schema:
```sql
-- Projects for organizing work
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);

-- Transcriptions
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_backup_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  auto_backup_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'
);

-- Media files
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  external_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Transcription-Media relationship
CREATE TABLE transcription_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transcription_id, media_id)
);

-- Backup versions
CREATE TABLE transcription_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER,
  blocks_count INTEGER,
  speakers_count INTEGER,
  words_count INTEGER,
  change_summary TEXT,
  UNIQUE(transcription_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_project_id ON transcriptions(project_id);
CREATE INDEX idx_media_files_user_id ON media_files(user_id);
CREATE INDEX idx_transcription_media_transcription ON transcription_media(transcription_id);
CREATE INDEX idx_transcription_media_media ON transcription_media(media_id);
CREATE INDEX idx_backups_transcription ON transcription_backups(transcription_id);
```

### Commit: `feat: Add database schema for backup system`

---

## Stage 2: File System Structure
**Goal**: Create user data folder structure and backup service

### Tasks:
- [x] Create folder structure utilities
- [x] Implement user data directory creation
- [x] Create backup file writer service
- [x] Implement TXT format generator
- [x] Add file system error handling
- [x] Create cleanup utilities for old backups
- [ ] Test file operations

### Folder Structure:
```
backend/user_data/
└── user_[userId]/
    ├── projects/
    │   └── [project_name]/
    │       ├── transcriptions/
    │       │   └── [transcription_id]/
    │       │       ├── backups/
    │       │       │   ├── v1_2024-01-16_14-30.txt
    │       │       │   └── metadata.json
    │       ├── media/
    │       ├── crm/
    │       └── archives/
    ├── standalone_transcriptions/
    │   └── [media_name]/
    │       └── [transcription_id]/
    │           └── backups/
    ├── uploads/
    ├── crm/
    └── settings/
```

### TXT Backup Format:
```
=== TRANSCRIPTION BACKUP ===
Project: [Project Name]
Transcription: [Title]
Date: 2024-01-16 14:30:45
Version: 15
Media Files: 
  - file1.mp3 (local)
  - https://external.com/file2.mp3 (external)

=== SPEAKERS ===
[Code]: [Name] ([Description])

=== TRANSCRIPT ===
[Timestamp] [Speaker]: [Text]

=== METADATA ===
Total Words: X
Total Blocks: Y
```

### Commit: `feat: Implement file system structure for backups`

---

## Stage 3: Backend API
**Goal**: Create REST API endpoints for transcription management

### Tasks:
- [x] Create transcription controller
- [x] Implement CRUD operations for transcriptions
- [x] Add project management endpoints
- [x] Create media file management API
- [x] Implement backup trigger endpoint
- [x] Add version history endpoint
- [x] Create restore endpoint
- [x] Add authentication middleware
- [ ] Test all endpoints

### API Endpoints:
```
POST   /api/transcriptions/create
GET    /api/transcriptions/:id
PUT    /api/transcriptions/:id
DELETE /api/transcriptions/:id
GET    /api/transcriptions/user/:userId

POST   /api/projects/create
GET    /api/projects/:id
GET    /api/projects/user/:userId

POST   /api/media/upload
POST   /api/media/link-external
GET    /api/media/:id

POST   /api/backups/trigger/:transcriptionId
GET    /api/backups/history/:transcriptionId
POST   /api/backups/restore/:backupId
GET    /api/backups/preview/:backupId
```

### Commit: `feat: Add backend API for transcription management`

---

## Stage 4: Auto-Save Mechanism
**Goal**: Implement automatic backup system in TextEditor

### Tasks:
- [x] Add change detection to TextEditor
- [x] Implement debounced save logic
- [x] Create backup service in frontend
- [x] Add real-time save status component
- [x] Implement retry logic for failed saves
- [x] Add backup status indicator to UI
- [x] Test auto-save functionality

### Implementation:
```typescript
// Auto-save logic
const autoSaveService = {
  lastSave: Date.now(),
  hasChanges: false,
  saveInterval: 60000, // 1 minute
  
  checkAndSave: () => {
    if (hasChanges && Date.now() - lastSave > saveInterval) {
      performBackup();
    }
  }
};
```

### Commit: `feat: Implement auto-save mechanism`

---

## Stage 5: UI - New Transcription
**Goal**: Add New Transcription button and creation flow

### Tasks:
- [x] Design New Transcription icon/button
- [x] Create transcription creation modal
- [x] Add project selection dropdown
- [x] Implement media linking UI
- [x] Add "copy from existing" option
- [x] Create transcription title input
- [x] Connect to backend API
- [x] Test creation flow

### UI Components:
```
Toolbar:
[📝 New Transcription] [📂 Open] [💾 Save] [↶ Restore]

Modal:
┌─ New Transcription ─────────────┐
│ Title: [___________________]    │
│ Project: [Select Project ▼]     │
│ □ Link current media            │
│ □ Copy from: [Select ▼]         │
│ [Cancel] [Create]               │
└─────────────────────────────────┘
```

### Commit: `feat: Add New Transcription UI`

---

## Stage 6: Transcription Navigation
**Goal**: Implement navigation between multiple transcriptions

### Tasks:
- [x] Create transcription switcher component
- [x] Add dropdown near media player
- [x] Implement keyboard shortcuts (Ctrl+Alt+←/→)
- [x] Add transcription info display
- [x] Create quick switch menu
- [ ] Sync with media player
- [ ] Test navigation flow

### UI Component:
```
Media Player Area:
[▶] [⏸] [⏹] | Transcription: [Interview Part 1 ▼]
                             → Interview Part 1 ✓
                             → Interview Part 2
                             → Draft Version
                             → [+ New Transcription]
```

### Commit: `feat: Add transcription navigation`

---

## Stage 7: Backup Status Indicator
**Goal**: Add subtle backup status to UI

### Tasks:
- [x] Design status indicator component
- [x] Add to bottom status bar
- [x] Implement status updates
- [x] Add click for details
- [x] Create error indicators
- [x] Add retry button for failures
- [x] Test status updates

### UI Component:
```
Bottom Bar:
Words: 1,234 | Speakers: 3 | 💾 Auto-save on | Last: 2 min ago
                                              └─ Click for details
```

### Commit: `feat: Add backup status indicator`

---

## Stage 8: Version History & Restore
**Goal**: Implement version history viewer and restore functionality

### Tasks:
- [ ] Create version history modal
- [ ] Implement timeline view
- [ ] Add version preview pane
- [ ] Create diff highlighting
- [ ] Implement restore confirmation
- [ ] Add search within versions
- [ ] Create version comparison tool
- [ ] Test restore functionality

### UI Component:
```
┌─ Version History ───────────────────────────┐
│ [Search versions...]                        │
├──────────────────────────────────────────────┤
│ Timeline:                    │ Preview:      │
│ ▼ Today                      │               │
│   • 14:30 (current)          │ [Preview of   │
│   • 14:15                    │  selected     │
│   • 13:45                    │  version]     │
│ ▼ Yesterday                  │               │
│   • 17:30                    │               │
│   • 16:00                    │ [Restore]     │
└──────────────────────────────────────────────┘
```

### Commit: `feat: Add version history and restore`

---

## Stage 9: Media Management
**Goal**: Implement media file upload and management

### Tasks:
- [ ] Create media upload component
- [ ] Add drag-and-drop support
- [ ] Implement external URL linking
- [ ] Create media library view
- [ ] Add media metadata extraction
- [ ] Implement media-transcription linking
- [ ] Test media operations

### Commit: `feat: Add media management`

---

## Stage 10: Testing & Optimization
**Goal**: Comprehensive testing and performance optimization

### Tasks:
- [ ] Unit tests for backup service
- [ ] Integration tests for API
- [ ] E2E tests for user flows
- [ ] Performance optimization for large files
- [ ] Stress test auto-save
- [ ] Test recovery scenarios
- [ ] Documentation update
- [ ] User guide creation

### Commit: `test: Add comprehensive tests for backup system`

---

## Stage 11: Final Polish
**Goal**: UI polish and edge case handling

### Tasks:
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Add tooltips and help text
- [ ] Implement keyboard shortcuts
- [ ] Add user preferences
- [ ] Create onboarding flow
- [ ] Final bug fixes
- [ ] Update CLAUDE.md

### Commit: `feat: Complete backup system implementation`

---

## Progress Tracking

### Overall Progress: 7/11 Stages Complete

- [x] Stage 1: Database Infrastructure ✅
- [x] Stage 2: File System Structure ✅
- [x] Stage 3: Backend API ✅
- [x] Stage 4: Auto-Save Mechanism ✅
- [x] Stage 5: UI - New Transcription ✅
- [x] Stage 6: Transcription Navigation ✅
- [x] Stage 7: Backup Status Indicator ✅
- [ ] Stage 8: Version History & Restore
- [ ] Stage 9: Media Management
- [ ] Stage 10: Testing & Optimization
- [ ] Stage 11: Final Polish

---

## Notes
- Each stage should be completed and tested before moving to the next
- Git commits after each stage completion
- Update this document as tasks are completed
- Consider user feedback after Stage 7 (basic functionality complete)
- Performance testing critical for auto-save feature
- Ensure backward compatibility with existing TextEditor