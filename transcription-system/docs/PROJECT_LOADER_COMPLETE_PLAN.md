# 📁 PROJECT LOADER - COMPLETE IMPLEMENTATION PLAN

## 🎯 Overview
Centralized project upload and management system shared across Transcription, Proofreading, and Export pages with hybrid storage support (local/URL/server).

---

## 🏗️ ARCHITECTURE

### **Core Principle**
- **Single Source of Truth**: One project system serves all pages
- **Shared Components**: Reusable ProjectLoader across all contexts
- **Page-Specific Data**: Each page extends base project with its own data
- **No Duplication**: ESLint enforces unique names across codebase

### **Directory Structure**
```
transcription-system/
├── frontend/main-app/src/
│   ├── app/transcription/
│   │   ├── shared/
│   │   │   └── components/
│   │   │       └── ProjectLoader/              [SHARED COMPONENT]
│   │   │           ├── index.tsx
│   │   │           ├── ProjectUploadButton.tsx
│   │   │           ├── FolderSelector.tsx
│   │   │           ├── MediaScanner.tsx
│   │   │           ├── ProjectDisplay.tsx
│   │   │           ├── MediaStatusIndicator.tsx
│   │   │           ├── types.ts
│   │   │           └── styles.module.css
│   │   ├── transcription/                      [FULL IMPLEMENTATION]
│   │   ├── proofreading/                       [SKELETON ONLY]
│   │   └── export/                             [SKELETON ONLY]
│   ├── lib/services/
│   │   └── projectService/                     [SHARED SERVICE]
│   │       ├── index.ts
│   │       ├── upload.ts
│   │       ├── storage.ts
│   │       └── types.ts
│   └── store/
│       └── projectStore.ts                     [STATE MANAGEMENT]
│
└── backend/
    ├── src/
    │   ├── services/
    │   │   └── projectUploadService.ts
    │   └── api/projects/
    │       └── upload-routes.ts
    └── data/users/{userId}/
        ├── projects/                            [SHARED DATA]
        │   └── {projectId}/
        │       ├── metadata.json
        │       └── media/
        └── pages/                               [PAGE-SPECIFIC DATA]
            ├── transcription/{projectId}/
            ├── proofreading/{projectId}/        [EMPTY FOR NOW]
            └── export/{projectId}/              [EMPTY FOR NOW]
```

---

## 💾 STORAGE STRATEGY

### **Hybrid Approach (Confirmed)**
```javascript
{
  mediaId: "media-123",
  name: "interview.mp4",
  type: "local" | "url" | "server",
  
  // Multi-computer support
  sources: {
    "computer1-id": {
      path: "C:/Projects/media/interview.mp4",
      lastSeen: "2024-01-15",
      computerName: "Home PC"
    },
    "computer2-id": {
      path: "D:/Work/interview.mp4",
      lastSeen: "2024-01-16",
      computerName: "Office Laptop"
    }
  },
  
  // Server storage (optional)
  serverStorage: {
    used: false,              // User chooses to upload
    path: null,
    uploadedAt: null
  },
  
  // Quota management
  quota: {
    userLimit: 500MB,         // Default, admin can change
    currentUsage: 125MB,
    remaining: 375MB
  }
}
```

### **Key Decisions**
- ✅ No auto-backup (user controls cloud uploads)
- ✅ 500MB default quota per user
- ✅ Admin can set custom quotas
- ✅ Missing file warning with path update option
- ✅ Transcription remains intact regardless of media location

---

## 🧹 PHASE 1: CLEANUP

### **Remove Old Upload Code**
**Files to clean:**
```typescript
// page.tsx - Remove these:
- handleMediaUpload()
- handleProjectUpload()
- mediaCollections state
- setMediaCollections()
- getOrCreateProject()
- currentCollection references
- Project creation useEffects

// Delete these components:
- UploadOptionsModal/
- ProjectNameModal/
- UrlModal/
```

### **ESLint Duplicate Detection (Already Configured)**
```json
// .eslintrc.json - Active rules:
{
  "rules": {
    "no-redeclare": "error",
    "no-duplicate-imports": "error",
    "no-dupe-keys": "error",
    "no-dupe-class-members": "error",
    "no-shadow": "warn",
    "@typescript-eslint/no-redeclare": "error"
  }
}
```

**To check for duplicates:**
```bash
npm run lint
# Or for specific check:
npx eslint src --ext .ts,.tsx | grep -E "(redeclare|duplicate|shadow)"
```

---

## 🔨 PHASE 2: IMPLEMENTATION

### **2.1 Shared ProjectLoader Component**
```typescript
// shared/components/ProjectLoader/index.tsx
interface ProjectLoaderProps {
  context: 'transcription' | 'proofreading' | 'export';
  showMediaPlayer?: boolean;
  onProjectLoad: (project: Project) => void;
  onMediaSelect: (media: MediaFile) => void;
}

export function ProjectLoader({ context, onProjectLoad }: ProjectLoaderProps) {
  return (
    <div className={styles.projectLoader}>
      <ProjectUploadButton onUpload={handleFolderUpload} />
      <ProjectDisplay 
        projects={projects}
        currentProject={currentProject}
        onSelect={onProjectLoad}
      />
      <MediaStatusIndicator 
        media={currentMedia}
        showWarning={!mediaAvailable}
        onRelocate={handleRelocateMedia}
      />
    </div>
  );
}
```

### **2.2 Backend Project Service**
```typescript
// services/projectUploadService.ts
class ProjectUploadService {
  // Core operations
  async createProjectFromFolder(params: {
    userId: string;
    folderName: string;
    mediaFiles: File[];
    computerId: string;
    computerName: string;
  }): Promise<Project>
  
  // Media management
  async addMediaToProject(projectId, mediaFiles): Promise<void>
  async updateMediaPath(mediaId, computerId, newPath): Promise<void>
  async uploadMediaToServer(mediaId, file): Promise<void>
  
  // Storage management
  async checkUserQuota(userId): Promise<QuotaInfo>
  async setUserQuota(userId, limit): Promise<void>
  
  // Multi-computer support
  async findMediaOnComputer(mediaId, computerId): Promise<string | null>
  async recordMediaLocation(mediaId, computerId, path): Promise<void>
}
```

### **2.3 API Endpoints**
```typescript
// Backend routes
POST   /api/projects/upload-folder        // Create project
GET    /api/projects/list                 // Get user projects
GET    /api/projects/:id                  // Get project details
DELETE /api/projects/:id                  // Delete project

POST   /api/projects/:id/media            // Add media
PUT    /api/projects/:id/media/:mediaId/path     // Update path
POST   /api/projects/:id/media/:mediaId/upload   // Upload to cloud

GET    /api/users/:id/quota               // Check quota
PUT    /api/users/:id/quota               // Admin: Set quota
```

---

## 🔄 PHASE 3: PAGE INTEGRATION

### **3.1 Transcription Page (Full)**
```typescript
// app/transcription/transcription/page.tsx
function TranscriptionPage() {
  const { currentProject, loadProject } = useProjectStore();
  
  return (
    <HoveringBarsLayout>
      <MediaPlayer>
        <ProjectLoader 
          context="transcription"
          onProjectLoad={async (project) => {
            await loadProject(project);
            await loadTranscriptionData(project.projectId);
          }}
        />
      </MediaPlayer>
      <TextEditor transcriptionData={currentProject?.transcriptionData} />
    </HoveringBarsLayout>
  );
}
```

### **3.2 Proofreading Page (Skeleton)**
```typescript
// app/transcription/proofreading/page.tsx
function ProofreadingPage() {
  return (
    <HoveringBarsLayout>
      <ProjectLoader 
        context="proofreading"
        onProjectLoad={(project) => {
          console.log('Project ready for proofreading:', project);
          // TODO: Implement when proofreading system is ready
        }}
      />
      <div>Proofreading interface - To be implemented</div>
    </HoveringBarsLayout>
  );
}
```

### **3.3 Export Page (Skeleton)**
```typescript
// app/transcription/export/page.tsx
function ExportPage() {
  return (
    <HoveringBarsLayout>
      <ProjectLoader 
        context="export"
        showMediaPlayer={false}  // No media player needed
        onProjectLoad={(project) => {
          console.log('Project ready for export:', project);
          // TODO: Implement when export system is ready
        }}
      />
      <div>Export settings - To be implemented</div>
    </HoveringBarsLayout>
  );
}
```

---

## 📝 PHASE 4: UPLOAD FLOW

### **User Journey**
```
1. User clicks "+" button in MediaPlayer
   └── Opens folder selector dialog
   
2. User selects folder "Interview Project"
   ├── System scans for media files
   ├── Finds: audio1.mp3, video1.mp4, doc.pdf
   └── Filters: Only audio1.mp3, video1.mp4
   
3. Project created:
   ├── Name: "Interview Project" (display)
   ├── ID: "proj_interview_1a2b3c4d" (internal)
   ├── Media: 2 files (local references)
   └── Transcriptions: Empty structures created
   
4. Media tracking:
   ├── Computer1: "C:/Projects/Interview/audio1.mp3"
   ├── Computer2: User prompted to locate file
   └── Optional: Upload to cloud button
   
5. Storage check:
   ├── Metadata: ~1KB (always stored)
   ├── Media: 0KB (local) or 150MB (if uploaded)
   └── Quota: 125MB/500MB used
```

---

## ✅ TESTING CHECKLIST

### **Phase 1: Basic Upload**
- [ ] Click + button → folder dialog opens
- [ ] Select folder → project appears in list
- [ ] Media files detected correctly
- [ ] Empty transcription structures created
- [ ] Project name shows folder name

### **Phase 2: Multi-Computer**
- [ ] Upload on Computer A
- [ ] Login on Computer B → project visible
- [ ] Media missing warning appears
- [ ] Relocate file → path updated
- [ ] Transcription remains intact

### **Phase 3: Storage Management**
- [ ] Upload 400MB file (under quota)
- [ ] Try 200MB more → quota warning
- [ ] Admin increases quota → upload works
- [ ] "Upload to cloud" button works
- [ ] Cloud upload progress shown

### **Phase 4: Cross-Page**
- [ ] Upload in Transcription page
- [ ] Navigate to Proofreading → project appears
- [ ] Navigate to Export → project appears
- [ ] All pages share same project list

### **Phase 5: ESLint Checks**
- [ ] No duplicate function names
- [ ] No duplicate CSS classes
- [ ] No shadowed variables
- [ ] All imports unique

---

## 📅 IMPLEMENTATION TIMELINE

### **Week 1: Foundation**
- Day 1-2: Clean old code, setup ESLint monitoring
- Day 3-4: Create ProjectLoader component structure
- Day 5: Backend projectUploadService

### **Week 2: Core Features**
- Day 1-2: Folder upload functionality
- Day 3-4: Multi-computer path tracking
- Day 5: Storage quota system

### **Week 3: Integration**
- Day 1-2: Integrate with Transcription page
- Day 3: Add skeleton to Proofreading
- Day 4: Add skeleton to Export
- Day 5: Cross-page testing

### **Week 4: Enhancement**
- Day 1-2: Drag-and-drop support
- Day 3: URL input (YouTube, etc.)
- Day 4: Cloud upload option
- Day 5: Final testing and optimization

---

## 🚨 IMPORTANT NOTES

1. **ESLint is Active**: Will catch duplicates automatically during development
2. **Skeleton Only**: Proofreading/Export get ProjectLoader but no functionality yet
3. **No Auto-Backup**: Users manually choose what goes to cloud
4. **Quota Enforcement**: 500MB default, admin-adjustable
5. **Transcription Safety**: Never lost, even if media moves/deletes

---

## 🎯 SUCCESS CRITERIA

✅ **Clean Code**
- No duplicate names (ESLint verified)
- Old upload code completely removed
- Shared components properly isolated

✅ **Functionality**
- Folder upload works in MediaPlayer
- Projects appear in all three pages
- Multi-computer support functional
- Storage quotas enforced

✅ **User Experience**
- Clear media status indicators
- Smooth project switching
- No data loss scenarios
- Fast load times (<2 seconds)

---

## 📚 REFERENCE

### **Component Naming Convention**
```typescript
// Prefix components to avoid conflicts
ProjectLoader_*     // Main components
PL_*               // Sub-components
IProject*          // Interfaces
```

### **CSS Module Usage**
```css
/* Use CSS Modules to prevent conflicts */
.projectLoader { }  /* Scoped to component */
.uploadButton { }   /* Won't conflict with other buttons */
```

### **State Management**
```typescript
// Zustand store for cross-page state
const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  loadProject: (project) => set({ currentProject: project })
}));
```

---

## 📞 NEXT STEPS

1. Review and approve this plan
2. Start with Phase 1: Cleanup
3. Implement shared ProjectLoader
4. Test in Transcription page
5. Extend to other pages

**Ready to begin implementation!**