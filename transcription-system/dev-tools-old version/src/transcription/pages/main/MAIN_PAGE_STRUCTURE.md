# Main Page Structure Plan

## Current State
The main page serves as the dashboard but includes temporary upload functionality for development.

## Proposed Structure

### Layout
```
┌─────────────────────────────────────────────┐
│              Header (Logo, User)             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │   Stats     │  │   Recent    │          │
│  │   Grid      │  │   Activity  │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  ┌─────────────────────────────────┐        │
│  │     Quick Actions               │        │
│  │  [New Project] [Upload] [Search]│        │
│  └─────────────────────────────────┘        │
│                                             │
│  ┌─────────────────────────────────┐        │
│  │        Work Sections            │        │
│  │  ┌─────┐  ┌─────┐  ┌─────┐    │        │
│  │  │ CRM │  │Trans│  │License│   │        │
│  │  └─────┘  └─────┘  └─────┘    │        │
│  └─────────────────────────────────┘        │
│                                             │
│  ┌─────────────────────────────────┐        │
│  │     Active Projects List        │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### Components Structure
```
main/
├── index.php
├── MAIN_PAGE_STRUCTURE.md
├── components/
│   ├── header/
│   │   ├── index.php
│   │   ├── STRUCTURE.md
│   │   └── FUNCTIONS.md
│   ├── stats-dashboard/
│   │   ├── index.js
│   │   ├── stats-grid.php
│   │   ├── recent-activity.php
│   │   └── messages/
│   ├── quick-actions/
│   │   ├── index.php
│   │   ├── new-project-modal.php
│   │   ├── upload-handler.php
│   │   └── search-bar.php
│   ├── work-sections/
│   │   ├── index.php
│   │   ├── section-cards.php
│   │   └── navigation.js
│   └── project-list/
│       ├── index.php
│       ├── active-projects.php
│       ├── project-card.php
│       └── filters.php
└── core/
    ├── styles/
    │   ├── layout.css
    │   ├── dashboard.css
    │   └── responsive.css
    ├── scripts/
    │   ├── main-init.js
    │   ├── dashboard-api.js
    │   └── project-loader.js
    └── config/
        └── dashboard-config.js
```

### Key Functionality

#### 1. **Statistics Dashboard**
- Total projects count
- Active transcriptions
- Completed today
- Team performance
- Real-time updates via WebSocket

#### 2. **Quick Actions**
- **New Project**: Modal with project setup
- **Upload**: Drag-drop area for quick file upload
- **Search**: Global search across projects

#### 3. **Work Sections Navigation**
- **CRM**: → `/crm/`
- **Transcription**: → `/transcription/`
- **License**: → `/selling/`

#### 4. **Project Management**
- Active projects with progress
- Quick access to continue work
- Filter by status/assignee
- Batch operations

### Node.js Integration Plan

#### API Endpoints
```javascript
// Dashboard API
GET  /api/dashboard/stats
GET  /api/dashboard/recent-activity
GET  /api/dashboard/projects?status=active

// Project API  
POST /api/projects/create
POST /api/projects/upload
GET  /api/projects/search
```

#### Real-time Features
```javascript
// WebSocket events
socket.on('project:created')
socket.on('project:updated')
socket.on('stats:updated')
```

#### State Management
```javascript
// Zustand store
useDashboardStore
- stats
- recentActivity
- activeProjects
- filters
```

### Migration Steps
1. Create React components for each section
2. Implement API endpoints in Next.js
3. Add WebSocket for real-time updates
4. Integrate with existing PHP APIs
5. Progressive enhancement approach

### Performance Goals
- Initial load: < 2s
- Stats update: Real-time
- Search results: < 500ms
- Smooth animations: 60fps