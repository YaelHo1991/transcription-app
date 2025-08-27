# Transcription System Implementation Plan
**Updated: 2025-08-11 - Based on Existing PHP Structure**

## 📋 Current Status
- ✅ CRM System Complete
- ✅ Main Dashboard Complete
- ✅ Records Page Complete
- 🔄 Individual Pages In Progress
- 🎯 Following existing PHP design patterns

## Phase 0: Core Structure Setup ⏳ CURRENT

### 0.1 Folder Structure Creation
```
/app/transcription/
├── layout.tsx              # Main layout with navigation
├── page.tsx                # Main dashboard (golden theme)
├── transcription.css       # Shared styles
├── components/
│   ├── HoveringHeader.tsx  # Collapsible header on hover
│   └── HoveringSidebar.tsx # Right-side sidebar for some pages
├── records/
│   └── page.tsx           # Records page (golden theme)
├── proofreading/
│   └── page.tsx           # Proofreading page (blue theme + sidebar)
├── export/
│   └── page.tsx           # Export page (purple theme + sidebar)
└── transcription/
    └── page.tsx           # Placeholder page "עמוד בפיתוח"
```

### 0.2 Color Themes (From PHP)
- **Main/Records**: Golden/Brown
  - Primary: `#e0a96d`
  - Background: `linear-gradient(135deg, #ddc3a5 0%, #c7a788 100%)`
  - Header: `linear-gradient(135deg, #201e20 0%, #3d3a3c 100%)`
  
- **Proofreading**: Blue
  - Primary: `#007bff`
  - Gradient: `linear-gradient(135deg, #007bff 0%, #17a2b8 100%)`
  
- **Export**: Purple/Pink
  - Primary: `#6f42c1`
  - Gradient: `linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%)`
  
- **Transcription** (Future): Pink
  - Primary: `#e91e63`
  - Background: `linear-gradient(135deg, #f5ebf8 0%, #fce4ec 100%)`

### 0.3 Permission System
```typescript
// Permission checks for each page
const permissions = {
  main: true,           // All transcription users
  records: true,        // All transcription users  
  transcription: 'D',   // Requires D permission
  proofreading: 'E',    // Requires E permission
  export: 'F'          // Requires F permission
}
```

### 0.4 Shared Components
- [ ] HoveringHeader - Appears on mouse hover at top
- [ ] HoveringSidebar - Right-side panel for Proofreading/Export
- [ ] Navigation - Active state highlighting, permission-based
- [ ] ProjectCard - For displaying projects in grid

---

## Phase 1: Page Implementation 🚀 NEXT

### 1.1 Main Dashboard Page
**Theme**: Golden/Brown (#e0a96d)
**Features from PHP**:
- [ ] Statistics grid (4 boxes)
  - פרויקטים פעילים (Active Projects)
  - שעות תומללו (Hours Transcribed)
  - פרויקטים הושלמו (Completed Projects)
  - דיוק ממוצע (Average Accuracy)
- [ ] Three-column project layout
- [ ] Project cards with:
  - Title and status
  - Media duration
  - Progress indicator
  - Last updated time
- [ ] Quick actions buttons
- [ ] Search and filter options

**Status**: ⏳ Ready to implement

### 1.2 Records Page
**Theme**: Same as Main (Golden/Brown)
**Features from PHP**:
- [ ] Archive listing
- [ ] Search functionality
- [ ] Filter by:
  - Date range
  - Client
  - Status
  - Transcriber
- [ ] Export options per record
- [ ] Re-open for editing

**Status**: ⏳ Ready to implement

### 1.3 Proofreading Page
**Theme**: Blue (#007bff)
**Special Features**:
- [ ] Hovering sidebar (right side)
- [ ] Project selection
- [ ] Read-only media player
- [ ] Text comparison view
- [ ] Comments panel
- [ ] Export preview
- [ ] Quality metrics display

**Status**: ⏳ Ready to implement

### 1.4 Export Page
**Theme**: Purple (#6f42c1)
**Special Features**:
- [ ] Hovering sidebar (right side)
- [ ] Format selection cards:
  - Word (.docx)
  - PDF
  - SRT Subtitles
  - Plain Text
- [ ] Template options
- [ ] Preview panel
- [ ] Batch export option
- [ ] Download history

**Status**: ⏳ Ready to implement

### 1.5 Transcription Page (Placeholder)
**Content**: Simple placeholder
```typescript
// Display message: "עמוד בפיתוח"
// "Page Under Development"
```
**Note**: DO NOT implement actual transcription features yet

**Status**: ⏳ Ready to implement

---

## Phase 2: Integration & Navigation

### 2.1 Layout & Navigation
- [ ] Main layout with collapsible header
- [ ] Navigation menu with active states
- [ ] Permission-based menu items
- [ ] User info display
- [ ] Logout functionality

### 2.2 API Integration
- [ ] Connect to existing backend
- [ ] Project listing endpoints
- [ ] User permissions check
- [ ] File upload preparation
- [ ] Export functionality

### 2.3 State Management
- [ ] User context (permissions, info)
- [ ] Project state
- [ ] Navigation state
- [ ] Theme context

---

## Phase 3: Transcription Page (FUTURE - When Approved)

### 3.1 Media Player Component
**Based on existing PHP structure**:
- Complex media controls
- Keyboard shortcuts (F1-F10)
- Speed control
- Waveform visualization

### 3.2 Text Editor
**From PHP components**:
- Rich text editing
- Speaker management
- Auto-detect features
- Timestamp insertion
- Block-based editing

### 3.3 Support Components
- Sidebar with project info
- Remarks panel
- Helper files section
- Workspace header with progress

**Note**: This phase will only begin when explicitly approved

---

## Implementation Progress Tracking

### Completed ✅
- [x] Examined PHP structure
- [x] Identified color themes
- [x] Mapped page requirements
- [x] Updated plan.md
- [x] Created main dashboard with 3 work sections
- [x] Implemented color themes for each section
- [x] Created records page with table view
- [x] Added navigation (top bar, not sidebar)
- [x] Fixed layout to prevent scrolling
- [x] Added action buttons inside each column
- [x] Made column headers clickable links
- [x] Created proofreading page with blue theme and hovering sidebar
- [x] Created export page with purple theme and hovering sidebar
- [x] Created transcription placeholder page with pink theme

### In Progress 🔄
- [ ] Testing and refinement of all pages

### Upcoming 📅
- [ ] Phase 1: Page Implementation
- [ ] Phase 2: Integration & Navigation
- [ ] Phase 3: Transcription Page (When approved)

---

## Technical Decisions

### Frontend Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules + Inline styles (matching PHP approach)
- **State**: React Context + Hooks
- **RTL Support**: Native CSS direction: rtl

### Design Patterns from PHP
1. **Hovering UI Elements**
   - Header slides down on hover
   - Sidebar slides from right on hover
   
2. **Color-Coded Pages**
   - Each section has distinct theme
   - Gradients for visual appeal
   
3. **Card-Based Layouts**
   - Projects in cards
   - Statistics in boxes
   - Feature sections as cards

### File Organization
```
transcription/
├── api/           # API route handlers
├── components/    # Reusable components
├── hooks/         # Custom React hooks
├── styles/        # Global styles
├── types/         # TypeScript definitions
└── utils/         # Helper functions
```

---

## Security & Permissions

### Access Control
1. Check user permissions on page load
2. Redirect unauthorized users
3. Hide restricted navigation items
4. Validate permissions on API calls

### Data Protection
1. No sensitive data in localStorage
2. JWT tokens for authentication
3. Secure file uploads
4. Encrypted media streaming

---

## Testing Checklist

### Phase 0
- [ ] Folder structure created
- [ ] Base styles applied
- [ ] Navigation works

### Phase 1
- [ ] All pages load correctly
- [ ] Themes applied properly
- [ ] Hovering elements work
- [ ] RTL layout correct
- [ ] Responsive design

### Phase 2
- [ ] API connections work
- [ ] Permissions enforced
- [ ] State management stable
- [ ] Navigation highlights active page

---

## Notes & Warnings

⚠️ **DO NOT**:
- Copy the actual transcription page content yet
- Implement complex media player features
- Add features not in the PHP version
- Change the established color themes

✅ **DO**:
- Follow PHP design patterns exactly
- Update plan.md after each step
- Test each component thoroughly
- Maintain Hebrew RTL support

---

## Next Immediate Steps

1. ✅ Update this plan.md
2. ⏳ Create folder structure
3. ⏳ Implement shared components
4. ⏳ Create main page
5. ⏳ Update plan.md with progress

---

*Last Updated: 2025-08-11 - Phase 1 Complete*
*Version: 2.1 - All Pages Implemented*