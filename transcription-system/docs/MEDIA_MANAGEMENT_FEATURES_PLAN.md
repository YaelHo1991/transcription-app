# Media Management Features Implementation Plan

## Overview
This document outlines the comprehensive plan for implementing media management enhancements in the Transcription System. Each feature will be implemented following a structured approach with specific sub-agent assistance.

## Sub-Agents Required

### Planning Phase Agents
1. **architecture-surgeon** - Plan refactoring without breaking existing functionality
2. **project-organizer** - Understand current structure and plan folder/media organization
3. **api-architect** - Design new API endpoints for media operations

### Execution Phase Agents
1. **media-sync-engineer** - Implement drag-and-drop and media loading features
2. **theme-coordinator** - Adjust green theme styling
3. **hebrew-rtl-processor** - Ensure proper RTL layout
4. **performance-optimizer** - Implement chunked storage
5. **backup-guardian** - Handle storage options (local vs server)
6. **integration-engineer** - Implement chunked storage system
7. **session-chronicler** - Document implementation sessions
8. **transcription-validator** - Validate data integrity after changes

## Feature Implementations

### Feature 1: Single Media Upload Button
**Priority:** High  
**Complexity:** Medium  
**Location:** Sidebar (`TranscriptionSidebar.tsx`)

#### Requirements:
- Add "הוסף מדיה" button next to "הוסף פרויקט"
- Modal with file input and name field
- Auto-generate folder name: `YYYY-MM-DD_HH-MM-SS`
- Allow custom name override
- Create project structure automatically

#### Sub-Agents:
- **Planning:** `project-organizer`, `api-architect`
- **Execution:** `media-sync-engineer`, `hebrew-rtl-processor`
- **Testing:** `transcription-validator`

#### Implementation Stages:
1. Create UI button and modal component
2. Implement file selection logic
3. Add API endpoint for single media project creation
4. Update project store to handle new project type
5. Test with various media formats
6. Ensure Hebrew RTL support

---

### Feature 2: Drag & Drop Functionality
**Priority:** High  
**Complexity:** High  
**Locations:** Sidebar, Main Page תמלול column

#### Requirements:
- **Folder Drop:** Create new project
- **Media Drop:**
  - On existing project: Add to project
  - On empty area: Create new project
- Visual feedback during drag
- Support multiple file types

#### Sub-Agents:
- **Planning:** `architecture-surgeon`, `project-organizer`
- **Execution:** `media-sync-engineer`, `performance-optimizer`
- **Testing:** `transcription-validator`

#### Implementation Stages:
1. Implement HTML5 Drag & Drop API handlers
2. Create drop zone components
3. Add visual feedback (hover states, drop indicators)
4. Implement file type detection
5. Handle folder vs file logic
6. Add progress indicators for uploads
7. Test with various file sizes and types

---

### Feature 3: Project Rename Capability
**Priority:** Medium  
**Complexity:** Low  
**Location:** Sidebar, Project Management Modal

#### Requirements:
- Edit icon next to project names
- Inline editing or modal
- Update all references (database, file system)
- Maintain data integrity

#### Sub-Agents:
- **Planning:** `api-architect`
- **Execution:** `backup-guardian`, `transcription-validator`
- **Testing:** `transcription-validator`

#### Implementation Stages:
1. Add edit UI components
2. Create rename API endpoint
3. Implement file system rename logic
4. Update database references
5. Handle edge cases (duplicate names, special characters)
6. Test with active projects

---

### Feature 4: Main Page תמלול Column Enhancement
**Priority:** High  
**Complexity:** Medium  
**Location:** Main transcription page

#### Requirements:
- Match exact dark green (#20c997) from MediaPlayer
- Display real projects with metadata
- Link projects to transcription page
- "תמלול חדש" with three options
- Drag & drop support

#### Sub-Agents:
- **Planning:** `theme-coordinator`, `architecture-surgeon`
- **Execution:** `theme-coordinator`, `hebrew-rtl-processor`, `media-sync-engineer`
- **Testing:** `transcription-validator`

#### Implementation Stages:
1. Update CSS to match exact theme colors
2. Fetch and display real project data
3. Implement project cards with links
4. Create "תמלול חדש" modal with options
5. Add drag & drop to column area
6. Test responsive design

---

### Feature 5: Local vs Server Storage Options
**Priority:** Medium  
**Complexity:** High  
**Location:** Project settings, Backend storage service

#### Requirements:
- Storage preference per project
- Upload/download mechanisms
- Storage status indicators
- Migration between storage types

#### Sub-Agents:
- **Planning:** `api-architect`, `backup-guardian`
- **Execution:** `backup-guardian`, `integration-engineer`
- **Testing:** `performance-optimizer`, `transcription-validator`

#### Implementation Stages:
1. Add storage preference to project model
2. Create upload service for server storage
3. Implement download/streaming for server files
4. Add storage status indicators
5. Create migration utility
6. Test with large files

---

### Feature 6: Chunked Storage Implementation
**Priority:** Low  
**Complexity:** Very High  
**Location:** Backend storage service

#### Requirements:
- Split files into 5MB chunks
- Store chunk metadata
- Reassemble for playback
- Resume capability
- Storage optimization

#### Sub-Agents:
- **Planning:** `api-architect`, `performance-optimizer`
- **Execution:** `integration-engineer`, `performance-optimizer`, `backup-guardian`
- **Testing:** `performance-optimizer`, `transcription-validator`

#### Implementation Stages:
1. Design chunk storage schema
2. Implement file splitting algorithm
3. Create chunk upload/download handlers
4. Build reassembly service
5. Add resume capability
6. Implement cleanup for orphaned chunks
7. Performance testing with large files

## Implementation Workflow Template

For each feature implementation:

### 1. Planning Phase
```markdown
## Feature: [Feature Name]
## File: docs/features/[FEATURE_NAME]_IMPLEMENTATION.md

### Stage 1: Analysis
- [ ] Use `[planning-agent]` to analyze current implementation
- [ ] Document existing code structure
- [ ] Identify impact areas

### Stage 2: Design
- [ ] Use `[design-agent]` to create detailed design
- [ ] Define API contracts
- [ ] Create UI mockups if needed

### Stage 3: Implementation Plan
- [ ] Break down into subtasks
- [ ] Assign sub-agents for each task
- [ ] Define success criteria
```

### 2. Execution Phase
```markdown
### Stage 4: Implementation
- [ ] Use `session-chronicler` to start session
- [ ] Implement core functionality with `[execution-agent]`
- [ ] Add error handling
- [ ] Implement UI components

### Stage 5: Testing
- [ ] Use `transcription-validator` for data integrity
- [ ] Test edge cases
- [ ] Verify Hebrew RTL support
- [ ] Check responsive design

### Stage 6: Bug Fixes
- [ ] Document issues found
- [ ] Fix with appropriate sub-agent
- [ ] Re-test affected areas
```

### 3. Documentation & Commit Phase
```markdown
### Stage 7: Documentation
- [ ] Update feature documentation
- [ ] Add inline code comments
- [ ] Update API documentation

### Stage 8: Git Commit
- [ ] Use `session-chronicler` for commit message
- [ ] Stage all changes
- [ ] Create descriptive commit
- [ ] Push to repository
```

## Technical Specifications

### File Structure
```
transcription-system/
├── frontend/main-app/
│   ├── src/app/transcription/
│   │   ├── components/
│   │   │   ├── TranscriptionSidebar/  # Feature 1, 2, 3
│   │   │   ├── ProjectManagementModal/ # Feature 3
│   │   │   └── MediaPlayer/           # Feature 2
│   │   └── page.tsx                   # Feature 4
│   └── src/services/
│       ├── projectService.ts          # Features 1-6
│       └── storageService.ts          # Features 5, 6
└── backend/
    ├── src/api/
    │   ├── projects/                  # Features 1, 3
    │   └── storage/                   # Features 5, 6
    └── src/services/
        ├── projectService.ts           # Features 1-4
        ├── storageService.ts           # Features 5, 6
        └── chunkService.ts             # Feature 6
```

### Dependencies Between Features
```mermaid
graph TD
    F1[Single Media Upload] --> F2[Drag & Drop]
    F1 --> F4[Main Page Enhancement]
    F3[Project Rename] --> F1
    F4 --> F2
    F5[Storage Options] --> F6[Chunked Storage]
    F1 --> F5
```

### Testing Requirements
- All features must maintain existing functionality
- Hebrew RTL support must be verified
- Responsive design for screens 768px-1920px
- Permission levels D, E, F must be respected
- Backup system compatibility
- Cross-browser testing (Chrome, Firefox, Edge)

### Success Criteria
Each feature is considered complete when:
1. All functionality works as specified
2. No regression in existing features
3. Tests pass (if automated tests exist)
4. Documentation is updated
5. Code is committed to Git
6. Feature works with Hebrew content
7. Responsive design is maintained

## Implementation Priority Order

### Phase 1 (Week 1)
1. Feature 4: Main Page Enhancement (styling only)
2. Feature 1: Single Media Upload

### Phase 2 (Week 2)
3. Feature 3: Project Rename
4. Feature 2: Drag & Drop

### Phase 3 (Week 3)
5. Feature 5: Storage Options

### Phase 4 (Week 4)
6. Feature 6: Chunked Storage

## Notes
- Each feature should be implemented incrementally
- Test thoroughly before moving to next feature
- Use sub-agents proactively for complex tasks
- Document any deviations from plan
- Create feature branches for version control
- Regular commits with descriptive messages

## Relaבךשוגקd Documentation
- [SUB_AGENTS_DESIGN.md](./SUB_AGENTS_DESIGN.md) - Sub-agent specifications
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current project status
- [TRANSCRIPTION_PROGRESS_TRACKING.md](./TRANSCRIPTION_PROGRESS_TRACKING.md) - Progress tracking
3ן
---
*Last Updated: 2025-09-08*
*Status: Planning Phase*

● Based on my analysis of your authentication system, I have a comprehensive plan to implement the main login system
  with proper permission controls:
  ⎿  User rejected Claude's plan:
     ╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
     │ Main Login System & Permission Control Plan                                                                
     │
     │                                                                                                            
     │
     │ Current System Analysis:                                                                                   
     │
     │                                                                                                            
     │
     │ - Permissions: A,B,C (CRM), D,E,F (Transcription)                                                          
     │
     │ - Admin detection: Uses is_admin column + specific user IDs for יעל הורי                                   
     │
     │ - Your User IDs:                                                                                           
     │
     │   - Production: 3134f67b-db84-4d58-801e-6b2f5da0f6a3                                                       
     │
     │   - Local: bfc0ba9a-daae-46e2-acb9-5984d1adef9f                                                            
     │
     │                                                                                                            
     │
     │ Implementation Plan:                                                                                       
     │
     │                                                                                                            
     │
     │ 1. Add Super Developer Role                                                                                
     │
     │                                                                                                            
     │
     │ - Add new column is_developer to users table (only true for יעל)                                           
     │
     │ - This separates developer access from regular admin functions                                             
     │
     │ - Developer-only features:                                                                                 
     │
     │   - Access to management tab regardless of licenses                                                        
     │
     │   - Make other users admin                                                                                 
     │
     │   - Delete storage                                                                                         
     │
     │   - Access dev portal                                                                                      
     │
     │                                                                                                            
     │
     │ 2. Update Main Page Login System                                                                           
     │
     │                                                                                                            
     │
     │ - Modify main page (page.tsx) to show login when not authenticated                                         
     │
     │ - Add management tab for developer users only (not just admins)                                            
     │
     │ - Keep existing navigation for all authenticated users                                                     
     │
     │                                                                                                            
     │
     │ 3. License Purchase Page Updates                                                                           
     │
     │                                                                                                            
     │
     │ - Show purchased licenses as grayed out/blocked                                                            
     │
     │ - Display user's current permissions visually                                                              
     │
     │ - Allow purchase of additional licenses only                                                               
     │
     │                                                                                                            
     │
     │ 4. Permission Hierarchy                                                                                    
     │
     │                                                                                                            
     │
     │ Developer (יעל only) -> Can do everything                                                                  
     │
     │ Admin (is_admin=true) -> Can manage users in their licensed systems                                        
     │
     │ Regular Users -> Access based on permissions (A-F)                                                         
     │
     │                                                                                                            
     │
     │ 5. Backend Security Updates                                                                                
     │
     │                                                                                                            
     │
     │ - Create requireDeveloper middleware for developer-only endpoints                                          
     │
     │ - Update admin endpoints to differentiate between admin and developer                                      
     │
     │ - Secure critical operations (storage deletion, admin creation) to developer only                          
     │
     │                                                                                                            
     │
     │ 6. Frontend Components                                                                                     
     │
     │                                                                                                            
     │
     │ - Add DeveloperGuard component (wraps developer-only UI)                                                   
     │
     │ - Update AuthContext to include isDeveloper check                                                          
     │
     │ - Modify management tab visibility logic                                                                   
     │
     │                                                                                                            
     │
     │ Files to Modify:                                                                                           
     │
     │                                                                                                            
     │
     │ 1. Backend:                                                                                                
     │
     │   - Add migration for is_developer column                                                                  
     │
     │   - Update auth.middleware.ts - add requireDeveloper                                                       
     │
     │   - Update admin routes - separate developer operations                                                    
     │
     │   - Update user model and auth responses                                                                   
     │
     │ 2. Frontend:                                                                                               
     │
     │   - Update page.tsx - add management tab for developers                                                    
     │
     │   - Update AuthContext - add isDeveloper flag                                                              
     │
     │   - Create LicensePurchase component with blocking logic                                                   
     │
     │   - Update types to include is_developer                                                                   
     │
     │                                                                                                            
     │
     │ Security Notes:                                                                                            
     │
     │                                                                                                            
     │
     │ - Developer status is hardcoded to specific user IDs                                                       
     │
     │ - Cannot be changed via API (only database direct access)                                                  
     │
     │ - All critical operations double-check user ID                                                             
     │
     │ - Admin status can be granted by developer only                                                            
     │
     │                                                                                                            
     │
     │ This approach gives you full control while maintaining system security and allowing admins to have appropriate  │
     │ permissions within their licensed systems.                                                                 
     │
     ╰────────────────────