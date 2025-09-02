# Project Backup and Delete Functionality

## Overview
This document outlines the implementation requirements for project backup and delete features in the transcription system.

## Current System Architecture

### Project Structure
- Projects are stored in the backend at `/backend/user_data/users/{userId}/projects/{projectId}/`
- Each project contains multiple media files with their transcriptions
- Projects are managed through the `projectStore` (Zustand store)

### Current Save System
The save system uses `projectStore.saveMediaData()` which saves to the backend API:
- **Endpoint**: `PUT /api/projects/{projectId}/media/{mediaId}/transcription`
- **Data Saved**:
  - `blocks`: Array of transcription blocks with timestamps
  - `speakers`: Array of speaker objects with colors and metadata
  - `remarks`: Array of remarks/notes

### Data Format
```json
{
  "blocks": [
    {
      "id": "block-123",
      "text": "טקסט התמלול",
      "speaker": "speaker-1",
      "startTime": 0.5,
      "endTime": 3.2,
      "timestamp": "00:00:00"
    }
  ],
  "speakers": [
    {
      "id": "speaker-1",
      "code": "01",
      "name": "דובר א",
      "description": "מנהל הפגישה",
      "color": "#667eea",
      "count": 15
    }
  ],
  "remarks": [
    {
      "id": "remark-1",
      "text": "הערה חשובה",
      "blockId": "block-123",
      "timestamp": "2025-01-02T10:30:00Z"
    }
  ],
  "metadata": {
    "mediaId": "media-123",
    "fileName": "interview.mp3",
    "originalName": "ראיון_מנהל.mp3",
    "mimeType": "audio/mp3",
    "size": 15728640,
    "stage": "transcription",
    "createdAt": "2025-01-02T09:00:00Z",
    "lastModified": "2025-01-02T10:30:00Z"
  }
}
```

## Backup Functionality Requirements

### 1. Backup Structure
- **Use the same JSON format** as the current save system
- **Include all timestamps** in speaker blocks (startTime, endTime, timestamp)
- **Preserve all metadata** including speakers, remarks, and media information
- **Add backup metadata**:
  ```json
  {
    "backupId": "backup-{timestamp}",
    "backupDate": "2025-01-02T10:30:00Z",
    "backupType": "manual" | "auto",
    "projectId": "proj-123",
    "projectName": "Project Name",
    "totalMedia": 5,
    "backedUpMedia": ["media-1", "media-2", ...]
  }
  ```

### 2. Backup Storage
- Store backups in: `/backend/user_data/users/{userId}/backups/{projectId}/`
- File naming: `backup_{YYYY-MM-DD}_{HH-mm-ss}.json`
- Include all media transcriptions in a single backup file

### 3. Backup API Endpoints
```
POST /api/projects/{projectId}/backup     - Create backup
GET  /api/projects/{projectId}/backups    - List backups
GET  /api/projects/{projectId}/backups/{backupId} - Get specific backup
POST /api/projects/{projectId}/restore/{backupId} - Restore from backup
DELETE /api/projects/{projectId}/backups/{backupId} - Delete backup
```

### 4. UI Integration
- Add backup button in project menu (three dots menu or dedicated button)
- Show backup status/progress indicator
- List available backups with restore option
- Confirmation dialog before restore (warns about overwriting current data)

## Delete Project Functionality Requirements

### 1. Delete Confirmation
- **Two-step confirmation** to prevent accidental deletion
- Show project details in confirmation dialog:
  - Project name
  - Number of media files
  - Last modified date
  - Total transcription time

### 2. Delete Process
1. Show initial delete confirmation
2. Optional: Create automatic backup before deletion
3. Delete project data from backend
4. Update UI (remove from project list)
5. Show success notification

### 3. Delete API Endpoint
```
DELETE /api/projects/{projectId}
```
- Should delete all associated data:
  - All media files and transcriptions
  - All project metadata
  - Associated backups (optional - could keep backups)

### 4. UI Integration
- Add delete button in project menu
- Use red color for delete actions
- Disable delete for currently active project
- Show loading state during deletion

## Implementation Notes

### Frontend (projectStore.ts)
Add new methods to the store:
```typescript
interface ProjectState {
  // ... existing state ...
  
  // New methods
  backupProject: (projectId: string) => Promise<boolean>;
  listBackups: (projectId: string) => Promise<Backup[]>;
  restoreBackup: (projectId: string, backupId: string) => Promise<boolean>;
  deleteProject: (projectId: string, createBackup?: boolean) => Promise<boolean>;
}
```

### Backend Considerations
- Ensure proper file permissions for backup directory
- Implement file size limits for backups
- Add cleanup for old backups (e.g., keep last 10 backups)
- Validate user ownership before delete/backup operations

### Security
- Verify user authentication for all operations
- Validate project ownership
- Sanitize file paths to prevent directory traversal
- Log all delete operations for audit trail

## Current Component Locations

### Key Files to Modify
1. **Frontend**:
   - `/frontend/main-app/src/lib/stores/projectStore.ts` - Add backup/delete methods
   - `/frontend/main-app/src/app/transcription/transcription/components/TranscriptionSidebar/TranscriptionSidebar.tsx` - Add UI buttons
   - `/frontend/main-app/src/app/transcription/shared/components/ProjectLoader/index.tsx` - Project management UI

2. **Backend**:
   - `/backend/src/controllers/projectController.ts` - Add backup/delete endpoints
   - `/backend/src/services/projectService.ts` - Implement backup/delete logic
   - `/backend/src/routes/projectRoutes.ts` - Register new routes

## Testing Checklist
- [ ] Backup creates complete copy of all project data
- [ ] Timestamps are preserved in backups
- [ ] Restore overwrites current data correctly
- [ ] Delete removes all project files
- [ ] Proper error handling for failed operations
- [ ] UI updates correctly after operations
- [ ] Confirmation dialogs prevent accidental actions
- [ ] Auto-save doesn't interfere with backup/delete operations

## Important Context from Current Session
- The save system uses `projectStore.saveMediaData()` which is working reliably
- All save triggers (Ctrl+S, navigation, icon click) use the same method
- The system handles Hebrew text and RTL layout
- Projects can have multiple media files
- Each media file has its own transcription data
- The system supports auto-save on navigation between projects/media