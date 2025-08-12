# CRM Integration Plan - Implementation Stages

## Current Status: Stage 1 - Documentation ✅

---

## Stage 1: Documentation & Cleanup ✅
- [x] Create CRM-SYSTEM.md with complete system logic
- [x] Document transcriber code system
- [x] Create this integration plan
- [ ] Fix folder structure (move old PHP files)

---

## Stage 2: Database Updates ✅
- [x] Add `transcriber_code` column to users table
- [x] Generate codes for existing users with D, E, or F permissions
- [x] Update selling system to generate codes on new purchases
- [x] Update dev tools to display transcriber codes
- [x] Create employee_links table for CRM-transcriber relationships

### SQL Changes Needed:
```sql
ALTER TABLE users ADD COLUMN transcriber_code VARCHAR(10) UNIQUE;
CREATE TABLE employee_links (
  id UUID PRIMARY KEY,
  crm_user_id UUID REFERENCES users(id),
  transcriber_code VARCHAR(10),
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Stage 3: CRM Design Implementation 🎨
- [ ] Create CRM folder structure in React
- [ ] Copy brown/terracotta theme (#b85042)
- [ ] Implement glass-morphism effects
- [ ] Create CRM-specific CSS modules
- [ ] Set up RTL support

### Design Files to Reference:
- `crm/assets/css/crm.css` - Main styles
- `crm/dashboard/crm_design_dashboard.html` - Dashboard design
- `crm/index.php` - Login form design

---

## Stage 4: Authentication & Login 🔐
- [ ] Create `/login?system=crm` route
- [ ] Implement brown-themed login page
- [ ] Connect to existing auth system
- [ ] Handle CRM permission checks (A, B, C)
- [ ] Redirect to CRM dashboard after login

---

## Stage 5: Core CRM Pages 📄
- [ ] Dashboard with 4 cubes
- [ ] Reports page (always visible)
- [ ] Navigation component with permission logic
- [ ] Layout with company name display

### Permission-Based Pages:
- [ ] Clients page (permission A)
- [ ] Projects page (permission B)
- [ ] Employees page (permission C)

---

## Stage 6: Transcriber Code Features 🔑
- [ ] Display code in user profile
- [ ] Add "Enter Code" form in employees page
- [ ] Auto-link users with both systems
- [ ] Show linked employees in CRM
- [ ] Handle multiple CRM employers per transcriber

---

## Stage 7: Company Name Display 🏢
- [ ] Show company as header/logo if exists
- [ ] Welcome message: "שלום [Full Name]"
- [ ] Handle users without company name
- [ ] Position company branding properly

---

## Stage 8: Testing & Validation ✅
- [ ] Test with יעל (ABCDEF permissions)
- [ ] Test with Test User (ABC only)
- [ ] Verify permission-based visibility
- [ ] Test transcriber code linking
- [ ] Validate company display
- [ ] Test navigation between pages
- [ ] Verify Hebrew RTL layout

---

## Stage 9: API Integration 🔌
- [ ] Create CRM API endpoints in backend
- [ ] Client CRUD operations
- [ ] Project management endpoints
- [ ] Employee linking endpoints
- [ ] Reports data endpoints

---

## Stage 10: Final Polish 💫
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Success messages
- [ ] Form validations
- [ ] Responsive design check

---

## Completed Stages Log

### Stage 1 - Completed: [Date]
- Created documentation files
- Defined transcriber code logic
- Planned implementation stages

---

## Notes for Implementation:
1. Keep old PHP files as reference until Stage 10
2. Test each stage before moving to next
3. Update this file as stages complete
4. Mark items with ✅ when done
5. Add any issues/blockers encountered

## Color Codes:
- ✅ Completed
- 🔄 In Progress
- ⏸️ Blocked
- 📝 Needs Documentation
- 🐛 Has Bugs