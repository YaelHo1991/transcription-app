# 🚀 PROJECT LOADER IMPLEMENTATION PLAN

## Phase 1: Cleanup & Preparation
### 1.1 Remove Old Upload Code
**Files to clean:**
- `page.tsx`: Remove handleMediaUpload, handleProjectUpload, mediaCollections state
- `page.tsx`: Remove getOrCreateProject function
- `page.tsx`: Remove project creation/loading useEffects
- Delete any unused modal components

### 1.2 Activate ESLint Monitoring
```bash
# Before each commit, run:
npm run lint

# For real-time checking in VS Code:
# Install ESLint extension
# Add to settings.json:
{
  "eslint.validate": ["javascript", "typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Phase 2: Create Shared Architecture

### 2.1 Shared ProjectLoader Component
```
src/app/transcription/shared/components/ProjectLoader/
├── index.tsx                 # Main component
├── ProjectUploadButton.tsx   # The + button
├── FolderSelector.tsx       # Folder browse dialog
├── MediaScanner.tsx          # Scans folder for media
├── ProjectDisplay.tsx        # Shows loaded projects
├── types.ts                  # Shared types
└── styles.module.css         # Scoped styles (no conflicts!)
```

### 2.2 Shared Project Service
```typescript
// lib/services/projectService/index.ts
export class ProjectService {
  // Core operations used by all pages
  async uploadFolder(files: FileList): Promise<Project>
  async loadProject(projectId: string): Promise<Project>
  async getProjects(userId: string): Promise<Project[]>
  
  // Page-specific extensions (empty for now)
  async loadTranscriptionData(projectId: string): Promise<any>
  async loadProofreadingData(projectId: string): Promise<null> // Skeleton
  async loadExportData(projectId: string): Promise<null>       // Skeleton
}
```

## Phase 3: Integration Pattern

### 3.1 Transcription Page (Full Implementation)
```typescript
// app/transcription/transcription/page.tsx
import { ProjectLoader } from '../shared/components/ProjectLoader';

function TranscriptionPage() {
  const [currentProject, setCurrentProject] = useState(null);
  
  return (
    <MediaPlayer>
      <ProjectLoader
        context="transcription"
        onProjectLoad={(project) => {
          setCurrentProject(project);
          // Load transcription-specific data
        }}
      />
    </MediaPlayer>
  );
}
```

### 3.2 Proofreading Page (Skeleton Only)
```typescript
// app/transcription/proofreading/page.tsx
import { ProjectLoader } from '../shared/components/ProjectLoader';

function ProofreadingPage() {
  return (
    <div>
      <ProjectLoader
        context="proofreading"
        onProjectLoad={(project) => {
          console.log('Project loaded for proofreading:', project);
          // TODO: Implement when proofreading is ready
        }}
      />
      <div>Proofreading content will go here</div>
    </div>
  );
}
```

### 3.3 Export Page (Skeleton Only)
```typescript
// app/transcription/export/page.tsx
import { ProjectLoader } from '../shared/components/ProjectLoader';

function ExportPage() {
  return (
    <div>
      <ProjectLoader
        context="export"
        showMediaPlayer={false}  // No media player on export
        onProjectLoad={(project) => {
          console.log('Project loaded for export:', project);
          // TODO: Implement when export is ready
        }}
      />
      <div>Export settings will go here</div>
    </div>
  );
}
```

## Phase 4: Backend Structure

### 4.1 Unified Project Storage
```
/data/users/{userId}/
├── projects/                    # Shared project data
│   └── {projectId}/
│       ├── metadata.json       # Project info
│       └── media/              # Media references
└── pages/                      # Page-specific data
    ├── transcription/
    │   └── {projectId}/
    ├── proofreading/           # Empty for now
    │   └── {projectId}/
    └── export/                 # Empty for now
        └── {projectId}/
```

## Phase 5: Testing Strategy

### 5.1 ESLint Duplicate Prevention Test
```typescript
// Test file 1: components/TestA.tsx
const projectName = "test";  // Should be fine

// Test file 2: components/TestB.tsx  
const projectName = "test2"; // Should trigger warning if same name

// CSS Test
/* styles1.css */
.projectLoader { }  // Should be fine

/* styles2.css */  
.projectLoader { }  // ESLint should warn about duplicate
```

### 5.2 Cross-Page Testing
1. Upload project in Transcription page
2. Navigate to Proofreading - project should appear
3. Navigate to Export - project should appear
4. All three pages share same project list

## Implementation Order

### Week 1: Foundation
- [ ] Clean up old upload code
- [ ] Create shared ProjectLoader component
- [ ] Implement backend project service
- [ ] Set up ESLint for duplicate detection

### Week 2: Transcription Integration
- [ ] Integrate ProjectLoader in transcription page
- [ ] Test folder upload flow
- [ ] Implement multi-computer support
- [ ] Test with real transcription data

### Week 3: Cross-Page Setup
- [ ] Add ProjectLoader skeleton to Proofreading
- [ ] Add ProjectLoader skeleton to Export
- [ ] Verify projects appear in all pages
- [ ] Test navigation between pages

### Week 4: Polish
- [ ] Add drag-and-drop
- [ ] Implement URL support
- [ ] Add storage quota UI
- [ ] Performance optimization

## ESLint Configuration for Project

```json
// Additional rules for our project
{
  "rules": {
    // Naming conventions to prevent conflicts
    "naming-convention": [
      "error",
      {
        "selector": "class",
        "prefix": ["ProjectLoader", "PL"],  // Prefix for ProjectLoader classes
        "format": ["PascalCase"]
      },
      {
        "selector": "interface",
        "prefix": ["I"],  // IProject, IMediaFile, etc.
        "format": ["PascalCase"]
      }
    ],
    // CSS Module enforcement
    "css-modules/no-undef-class": "error",
    "css-modules/no-unused-class": "warn"
  }
}
```

## Success Criteria
✅ No duplicate function/variable names (ESLint catches them)
✅ Projects load in all three pages
✅ Old upload code completely removed
✅ Clean separation between shared and page-specific code
✅ Multi-computer support works
✅ Storage quota properly enforced