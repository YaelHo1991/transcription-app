# Transcription Application Architecture

## Overview

The transcription application is a comprehensive system for managing audio/video transcription workflows. It consists of three main pages, each serving a specific role in the transcription pipeline:

1. **Transcription Page** (Pink Theme) - For transcribing audio/video files
2. **Proofreading Page** (Blue Theme) - For reviewing and editing transcriptions
3. **Export Page** (Green Theme) - For finalizing and exporting completed transcriptions

All pages share a common layout system with hovering header and sidebar bars that can be locked in place for better workspace management.

## File Structure

```
frontend/main-app/src/app/transcription/
├── shared/
│   └── components/
│       └── HoveringBarsLayout/
│           ├── HoveringBarsLayout.tsx      # Core layout logic
│           ├── HoveringBarsLayout.css      # Structural styles only
│           └── index.ts                    # Exports
│
├── transcription/
│   ├── page.tsx                           # Main transcription page
│   ├── components/
│   │   ├── TranscriptionHeader/
│   │   │   ├── TranscriptionHeader.tsx    # Header with transcription controls
│   │   │   └── TranscriptionHeader.css    # Pink theme styles
│   │   ├── TranscriptionSidebar/
│   │   │   ├── TranscriptionSidebar.tsx   # Lists transcription projects
│   │   │   └── TranscriptionSidebar.css   # Pink theme styles
│   │   └── [Other Components]/             # MediaPlayer, TextEditor, etc.
│   └── transcription-page.css             # Page-specific styles
│
├── proofreading/
│   ├── page.tsx                           # Main proofreading page
│   ├── components/
│   │   ├── ProofreadingHeader/
│   │   │   ├── ProofreadingHeader.tsx     # Header with proofreading tools
│   │   │   └── ProofreadingHeader.css     # Blue theme styles
│   │   └── ProofreadingSidebar/
│   │       ├── ProofreadingSidebar.tsx    # Lists projects for review
│   │       └── ProofreadingSidebar.css    # Blue theme styles
│   └── proofreading-page.css              # Page-specific styles
│
├── export/
│   ├── page.tsx                           # Main export page
│   ├── components/
│   │   ├── ExportHeader/
│   │   │   ├── ExportHeader.tsx           # Header with export options
│   │   │   └── ExportHeader.css           # Green theme styles
│   │   └── ExportSidebar/
│   │       ├── ExportSidebar.tsx          # Lists completed projects
│   │       └── ExportSidebar.css          # Green theme styles
│   └── export-page.css                    # Page-specific styles
│
├── layout.tsx                              # Transcription app layout wrapper
├── transcription.css                       # Shared transcription styles
└── ARCHITECTURE.md                         # This file
```

## Shared Components

### HoveringBarsLayout

The core layout component that provides consistent behavior across all pages.

**Responsibilities:**
- Hovering animation for header and sidebar
- Lock/unlock functionality
- Position management when bars are locked
- Content area resizing based on bar states
- Responsive behavior across screen sizes

**Props Interface:**
```typescript
interface HoveringBarsLayoutProps {
  headerContent: React.ReactNode;    // Custom header component
  sidebarContent: React.ReactNode;   // Custom sidebar component
  children: React.ReactNode;         // Main page content
  theme: 'transcription' | 'proofreading' | 'export';
  onHeaderLockChange?: (locked: boolean) => void;
  onSidebarLockChange?: (locked: boolean) => void;
}
```

**State Management:**
```typescript
const [headerLocked, setHeaderLocked] = useState(false);
const [sidebarLocked, setSidebarLocked] = useState(false);
const [headerHovered, setHeaderHovered] = useState(false);
const [sidebarHovered, setSidebarHovered] = useState(false);
```

## Page-Specific Components

### Transcription Page Components

**TranscriptionHeader:**
- Project navigation (previous/next)
- Media file navigation
- Progress display
- Logout functionality
- Quick access to transcription tools

**TranscriptionSidebar:**
- Lists active transcription projects
- Shows audio waveforms
- Displays transcription progress
- File upload capabilities
- Project assignment options

### Proofreading Page Components

**ProofreadingHeader:**
- Document navigation
- Proofreading tools (spell check, grammar)
- Review progress tracking
- Comments and annotations toggle

**ProofreadingSidebar:**
- Lists transcriptions ready for review
- Shows word count and completion status
- Deadline tracking
- Quality score indicators
- Filter by transcriber or project type

### Export Page Components

**ExportHeader:**
- Export format selection
- Batch export options
- Quality verification status
- Final approval controls

**ExportSidebar:**
- Lists completed and approved transcriptions
- Export history
- Format preferences per project
- Download management
- Archive options

## Styling Architecture

### Separation of Concerns

1. **Structural Styles** (in HoveringBarsLayout.css):
   - Positioning (fixed, absolute, relative)
   - Dimensions and spacing
   - Animations and transitions
   - Grid and flexbox layouts
   - Z-index layering
   - NO COLORS OR THEMES

2. **Theme Styles** (in component-specific CSS):
   - Background colors and gradients
   - Text colors
   - Border colors
   - Box shadows with theme colors
   - Icon colors
   - Hover states with theme colors

### Color Schemes

**Transcription (Pink Theme):**
- Primary: #e91e63
- Gradient: linear-gradient(135deg, #f5ebf8 0%, #fce4ec 100%)
- Header: linear-gradient(135deg, #201e20 0%, #3d3a3c 100%)

**Proofreading (Blue Theme):**
- Primary: #2196f3
- Gradient: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)
- Header: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)

**Export (Green Theme):**
- Primary: #4caf50
- Gradient: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)
- Header: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)

### Responsive Breakpoints

```css
/* Quarter window */
@media (max-width: 599px), (max-height: 499px)

/* Half window */
@media (min-width: 600px) and (max-width: 1200px)

/* Full screen */
@media (min-width: 1201px)
```

## Layout Behavior

### Four Layout Modes

1. **Both Bars Floating** (Default)
   - Header hidden at top, appears on hover
   - Sidebar hidden at right, appears on hover
   - Maximum content space

2. **Header Locked, Sidebar Floating**
   - Header fixed at top of page
   - Content adjusts height: calc(100vh - 180px)
   - Sidebar still hoverable

3. **Header Floating, Sidebar Locked**
   - Sidebar fixed at right
   - Content adjusts width: calc(100% - 230px)
   - Header still hoverable

4. **Both Bars Locked**
   - Header fixed at top
   - Sidebar fixed at right (starts below header)
   - Content adjusts both dimensions
   - Different heights per screen size

### Screen Size Adaptations

**Quarter Screen (< 600px):**
- Allow overflow with scrollbar
- Minimal spacing between components
- Single column layout for sidebar components

**Half Window (600px - 1200px):**
- Components shrink to fit without overflow
- Reduced spacing
- Two-column grid may become single column

**Full Screen (> 1201px):**
- Comfortable spacing
- Full two-column grid
- Larger sidebar when locked

### Spacing Rules

```css
/* Main content margins */
margin: 0 clamp(10px, 1.2vw, 25px) clamp(10px, 1.2vw, 25px) clamp(10px, 1.2vw, 25px);

/* Grid gaps */
gap: clamp(8px, 1vw, 25px);

/* Component spacing */
padding: clamp(8px, 0.8vw, 15px);
```

## Implementation Guidelines

### Adding a New Page

1. Create folder structure:
   ```
   new-page/
   ├── page.tsx
   ├── components/
   │   ├── NewPageHeader/
   │   └── NewPageSidebar/
   └── new-page.css
   ```

2. Import and use HoveringBarsLayout:
   ```tsx
   import HoveringBarsLayout from '../shared/components/HoveringBarsLayout';
   ```

3. Create custom header and sidebar components

4. Define theme colors in CSS

### Modifying Components

**To change header content:**
- Edit the specific header component (e.g., TranscriptionHeader.tsx)
- Keep layout logic in HoveringBarsLayout

**To change sidebar content:**
- Edit the specific sidebar component
- Maintain consistent data loading patterns

**To adjust positioning:**
- Modify HoveringBarsLayout.css for structural changes
- Update media queries if needed

### Best Practices

1. **Never mix structural and theme styles**
2. **Keep data fetching in page-specific components**
3. **Use consistent naming conventions**
4. **Test all four layout modes when making changes**
5. **Verify responsive behavior at all breakpoints**
6. **Maintain RTL (Hebrew) support**

## Technical Details

### State Management

- Local state for UI interactions (hovering, locking)
- Props for passing data between layout and content
- Consider Redux/Context for complex state if needed

### Event Handling

```typescript
// Hover detection
onMouseEnter={() => setHeaderHovered(true)}
onMouseLeave={() => setHeaderHovered(false)}

// Lock toggling
onClick={() => setHeaderLocked(!headerLocked)}
```

### Performance Considerations

1. **CSS Transitions:** Use transform/opacity for smooth animations
2. **Debouncing:** Consider debouncing hover events if performance issues
3. **Lazy Loading:** Load sidebar content on demand
4. **Memoization:** Use React.memo for expensive components

### Z-Index Hierarchy

```css
.header-trigger-area    { z-index: 1001; }
.hovering-header        { z-index: 1000; }
.hovering-sidebar       { z-index: 999; }
.sidebar.locked         { z-index: 997; }
.main-content          { z-index: 1; }
```

## Future Enhancements

1. **Keyboard Shortcuts:** Add shortcuts for locking/unlocking bars
2. **Persistence:** Save lock state in localStorage
3. **Animations:** Add more sophisticated transitions
4. **Themes:** Allow user-customizable color themes
5. **Mobile Support:** Optimize for touch devices
6. **Accessibility:** Add ARIA labels and keyboard navigation

## Troubleshooting

### Common Issues

**Sidebar touching edge:**
- Check `width: calc(100% - 20px)` on grid
- Verify margin-right on sidebar components

**Header not aligning:**
- Ensure consistent margin/padding values
- Check workspace-header width calculation

**Overflow in locked state:**
- Adjust height calculations for different screen sizes
- Verify component min-height values

**Components not shrinking:**
- Check flex values on containers
- Verify media query breakpoints

---

*Last Updated: [Current Date]*
*Version: 1.0*