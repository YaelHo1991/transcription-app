# Text Shortcuts Implementation Plan

## Overview
Implementation of a comprehensive text shortcuts system for the transcription editor with both system-wide and user-specific shortcuts.

## Key Features
- System-wide shortcuts managed by developers
- User-specific shortcuts (100 per user quota)
- Real-time expansion during typing
- Category-based organization
- Import/export capabilities

## Progress Tracking
- [x] Stage 1: Database Setup ✅ (2025-01-16)
- [ ] Stage 2: Backend API - Core
- [ ] Stage 3: Frontend Manager Class
- [ ] Stage 4: TextEditor Integration
- [ ] Stage 5: UI Components - Basic
- [ ] Stage 6: User Shortcuts Management
- [ ] Stage 7: Advanced Features
- [ ] Stage 8: Performance Optimization

---

## Stage 1: Database Setup and Initial Data

### Tasks
1. Create database tables for shortcuts
2. Add migration files
3. Seed initial system shortcuts
4. Add user quota table

### Implementation
```sql
-- Tables to create:
-- 1. system_shortcuts (system-wide shortcuts)
-- 2. user_shortcuts (personal shortcuts)
-- 3. user_shortcut_quotas (usage limits)
-- 4. shortcut_categories (for organization)
```

### Files to Create/Modify
- `backend/migrations/007_create_shortcuts_tables.sql`
- `backend/src/db/seed-shortcuts.ts`

### Testing Instructions
1. Run migration: `npm run migrate`
2. Check database tables: `psql -d transcription_dev -c "\dt"`
3. Verify seed data: `SELECT * FROM system_shortcuts LIMIT 5;`
4. Test user quota initialization

### What to Test
- Tables created successfully
- Initial shortcuts loaded
- Hebrew text stored correctly
- Indexes working for fast lookup

### Git Commit
```bash
git add .
git commit -m "feat: Add database schema for shortcuts system"
```

### ✅ Stage 1 Complete: 2025-01-16

---

## Stage 2: Backend API - Core Functionality

### Tasks
1. Create ShortcutService class
2. Implement basic CRUD operations
3. Add API endpoints
4. Add authentication middleware

### Files to Create/Modify
- `backend/src/services/shortcutService.ts`
- `backend/src/api/transcription/shortcuts/routes.ts`
- `backend/src/models/shortcut.model.ts`

### API Endpoints
```
GET    /api/transcription/shortcuts          - Get all shortcuts for user
POST   /api/transcription/shortcuts          - Add user shortcut
PUT    /api/transcription/shortcuts/:id      - Update user shortcut
DELETE /api/transcription/shortcuts/:id      - Delete user shortcut
GET    /api/transcription/shortcuts/quota    - Get user quota info
```

### Testing Instructions
1. Test with Postman/curl:
   ```bash
   curl http://localhost:5000/api/transcription/shortcuts \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
2. Add a user shortcut
3. Check quota enforcement
4. Verify system shortcuts are returned

### What to Test
- API returns both system and user shortcuts
- User shortcuts override system ones
- Quota limits work (100 shortcuts max)
- Authentication required

### Git Commit
```bash
git add .
git commit -m "feat: Add backend API for shortcuts management"
```

### ✅ Stage 2 Complete: _____

---

## Stage 3: Frontend Shortcuts Manager Class

### Tasks
1. Create ShortcutManager class
2. Implement text processing logic
3. Add caching mechanism
4. Handle Hebrew RTL properly

### Files to Create/Modify
- `frontend/.../TextEditor/utils/ShortcutManager.ts`
- `frontend/.../TextEditor/types/shortcuts.ts`

### Core Functionality
```typescript
class ShortcutManager {
  - loadShortcuts()
  - processText(text, cursorPos)
  - addPersonalShortcut()
  - deletePersonalShortcut()
  - getCachedShortcuts()
}
```

### Testing Instructions
1. Create test instance in console
2. Test text processing: `manager.processText("ע'ד", 3)`
3. Verify expansion: should return "עורך דין"
4. Test with Hebrew prefixes

### What to Test
- Shortcut detection at cursor position
- Hebrew text handling
- Cache updates correctly
- Performance with 1000+ shortcuts

### Git Commit
```bash
git add .
git commit -m "feat: Add ShortcutManager class for frontend"
```

### ✅ Stage 3 Complete: _____

---

## Stage 4: TextEditor Integration

### Tasks
1. Integrate ShortcutManager into TextEditor
2. Add keyboard event handlers
3. Implement real-time expansion
4. Add visual feedback

### Files to Modify
- `frontend/.../TextEditor/TextEditor.tsx`
- `frontend/.../TextEditor/blocks/TextBlock.tsx`
- `frontend/.../TextEditor/TextEditor.css`

### Integration Points
- On keypress: check for shortcuts
- On space/punctuation: trigger expansion
- Show tooltip on expansion
- Support undo/redo

### Testing Instructions
1. Open TextEditor
2. Type a shortcut (e.g., "ע'ד")
3. Press space or punctuation
4. Should expand to full text
5. Test undo (Ctrl+Z)

### What to Test
- Real-time expansion works
- Cursor position correct after expansion
- Visual feedback appears
- Undo/redo functionality
- No lag during typing

### Git Commit
```bash
git add .
git commit -m "feat: Integrate shortcuts into TextEditor"
```

### ✅ Stage 4 Complete: _____

---

## Stage 5: UI Components - Basic Modal

### Tasks
1. Create shortcuts modal component
2. Add toolbar icon to TextEditor
3. Display shortcuts list
4. Add search/filter functionality

### Files to Create/Modify
- `frontend/.../TextEditor/components/ShortcutsModal.tsx`
- `frontend/.../TextEditor/components/ShortcutsModal.css`
- `frontend/.../TextEditor/TextEditor.tsx` (add icon)

### UI Elements
- Toolbar icon (keyboard icon)
- Modal with tabs (System/Personal)
- Search bar
- Shortcuts list with categories
- Quota indicator

### Testing Instructions
1. Click shortcuts icon in toolbar
2. Modal should open
3. View system shortcuts
4. Search for specific shortcut
5. Check responsive design

### What to Test
- Modal opens/closes properly
- Shortcuts display correctly
- Search works with Hebrew
- Categories shown properly
- RTL layout correct

### Git Commit
```bash
git add .
git commit -m "feat: Add shortcuts modal UI component"
```

### ✅ Stage 5 Complete: _____

---

## Stage 6: User Shortcuts Management

### Tasks
1. Add "Add Shortcut" form
2. Implement edit functionality
3. Add delete with confirmation
4. Show quota usage

### Files to Modify
- `frontend/.../components/ShortcutsModal.tsx`
- `frontend/.../components/AddShortcutForm.tsx`

### Features
- Add new personal shortcut
- Edit existing shortcuts
- Delete with confirmation
- Quota bar (e.g., 23/100 used)
- Validation (no duplicates)

### Testing Instructions
1. Add new personal shortcut
2. Try to add duplicate (should fail)
3. Edit existing shortcut
4. Delete shortcut
5. Check quota updates

### What to Test
- Can add up to 100 shortcuts
- Cannot exceed quota
- Duplicates prevented
- Changes persist after reload
- Sync with backend

### Git Commit
```bash
git add .
git commit -m "feat: Add user shortcuts management UI"
```

### ✅ Stage 6 Complete: _____

---

## Stage 7: Advanced Features

### Tasks
1. Add import/export functionality
2. Implement categories
3. Add bulk operations
4. Create admin interface

### Files to Create/Modify
- `frontend/.../components/ImportExportModal.tsx`
- `backend/src/api/shortcuts/import.ts`
- `frontend/.../dev-portal/shortcuts-admin/*`

### Features
- Import from CSV/text file
- Export to CSV
- Bulk enable/disable
- Category management
- Admin dashboard for system shortcuts

### Testing Instructions
1. Export shortcuts to CSV
2. Import from file
3. Test category filtering
4. Admin: add system shortcut
5. Verify it appears for all users

### What to Test
- Import handles Hebrew correctly
- Export format readable
- Categories filter properly
- Admin changes reflect immediately
- File size limits work

### Git Commit
```bash
git add .
git commit -m "feat: Add import/export and admin features"
```

### ✅ Stage 7 Complete: _____

---

## Stage 8: Performance Optimization

### Tasks
1. Implement lazy loading
2. Add debouncing
3. Optimize database queries
4. Add caching layer

### Optimizations
- Load shortcuts in batches
- Debounce API calls
- Index database properly
- Cache frequently used shortcuts
- Use Web Workers for processing

### Testing Instructions
1. Load with 10,000+ shortcuts
2. Monitor typing performance
3. Check memory usage
4. Test with slow connection
5. Verify no UI freezing

### Performance Targets
- < 10ms expansion time
- < 100ms modal open
- < 200ms search results
- No lag with 10k shortcuts

### Git Commit
```bash
git add .
git commit -m "feat: Optimize shortcuts performance"
```

### ✅ Stage 8 Complete: _____

---

## Completion Checklist

### Database
- [ ] Tables created
- [ ] Migrations run
- [ ] Seed data loaded
- [ ] Indexes optimized

### Backend
- [ ] API endpoints working
- [ ] Authentication implemented
- [ ] Quota management
- [ ] Import/export

### Frontend
- [ ] ShortcutManager class
- [ ] TextEditor integration
- [ ] Modal UI
- [ ] User management
- [ ] Admin interface

### Testing
- [ ] Unit tests written
- [ ] Integration tests
- [ ] Performance tested
- [ ] Hebrew/RTL verified

### Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Code comments

## Notes
- Each stage should be completed and tested before moving to the next
- Commit after each stage is approved
- Update this document with completion dates
- Add any issues or changes below

## Issues/Changes Log
<!-- Add any issues encountered or changes made during implementation -->

## Final Review
- [ ] All stages complete
- [ ] Testing passed
- [ ] Documentation updated
- [ ] Ready for production