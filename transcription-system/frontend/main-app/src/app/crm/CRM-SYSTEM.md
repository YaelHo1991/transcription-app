# CRM System Documentation

## System Overview
מערכת ניהול לקוחות ופרויקטים מקיפה לחברות תמלול

## Visual Design
- **Primary Color**: Brown/Terracotta (#b85042, #a0453a)
- **Secondary Colors**: Beige/Cream (#f5f6f0, #ede8d3)
- **Accent**: Light greens (#e7e8d1, #d4d5c0)
- **Layout**: RTL Hebrew interface
- **Style**: Modern, professional with glass-morphism effects

## Pages Structure

### Always Available (All CRM Users)

#### 1. Dashboard (דשבורד)
- **URL**: `/crm` or `/crm/dashboard`
- **Features**:
  - 4 Summary Cubes linking to each module:
    - Client Management summary
    - Projects Management summary  
    - Employee Management summary
    - Reports summary
  - Quick stats and overview
  - Recent activity
  - Welcome message with user/company name

#### 2. Reports (דוחות)
- **URL**: `/crm/reports`
- **Features**:
  - Dynamic reports based on purchased permissions
  - Client reports (if has permission A)
  - Project reports (if has permission B)
  - Employee reports (if has permission C)
  - Export capabilities
  - Date range filtering

### Permission-Based Pages

#### A. Client Management (ניהול לקוחות) - Permission A
- **URL**: `/crm/clients`
- **Features**:
  - Add/Edit/Delete clients
  - Client contact details
  - Job history per client
  - Personal preferences and notes
  - Payment history and remarks
  - Reusable data for future jobs
  - Communication log
  - Client status (active/inactive)

#### B. Project Management (ניהול פרויקטים) - Permission B  
- **URL**: `/crm/projects`
- **Features**:
  - Create new projects
  - Upload media files
  - Link project to client
  - Set deadlines and priorities
  - Three-phase workflow:
    1. Transcription (תמלול)
    2. Proofreading (הגהה)
    3. Export (ייצוא)
  - Assign to employees
  - Auto-send to app users
  - Manual send for non-app users
  - Receive completed work
  - Invoice generation
  - Delivery to client

#### C. Employee Management (ניהול עובדים) - Permission C
- **URL**: `/crm/employees`
- **Features**:
  - Add employees (manual or via code)
  - View availability
  - Assign projects
  - Track performance
  - Communication tools
  - Work history
  - Payment tracking

## Transcriber Code System (קוד מתמלל)

### Core Logic
**EVERY user with transcription permissions (D, E, or F) gets a unique transcriber code**

### Purpose
- Allows transcribers to work for MULTIPLE CRM users
- Enables flexible employment relationships
- One code works with unlimited employers

### Code Rules
```
Has D, E, or F permissions → ALWAYS gets a transcriber code
Has only A, B, C → No code (CRM only, doesn't transcribe)
Code format: TRN-XXXX (4 random digits)
```

### Use Cases

#### 1. User with ABCDEF (Both Systems)
- Has own CRM system
- Has transcription app
- Gets transcriber code for working with OTHERS
- Auto-linked as employee in OWN CRM
- Can share code with other CRM companies

#### 2. User with DEF Only (Transcriber)
- Has transcription app only
- Gets transcriber code
- Shares code with multiple CRM employers
- Can work for several companies

#### 3. User with ABC Only (CRM Manager)
- Has CRM system only
- No transcriber code
- Enters employees' codes to link them
- Manages transcribers via their codes

### Code Flow
1. **Registration/Purchase**: User buys D, E, or F → System generates code
2. **Code Display**: Shown in confirmation, profile, dev tools
3. **Employee Linking**: CRM user enters code → Links transcriber
4. **Auto-Link**: User with both systems → Auto-linked in own CRM
5. **Multi-Employment**: One code → Multiple CRM employers

## Navigation Structure
```
CRM Navigation Bar
├── Dashboard (always visible)
├── Reports (always visible)
├── Clients (if has permission A)
├── Projects (if has permission B)
└── Employees (if has permission C)
```

## User Flow

### Login Flow
1. User goes to `/login?system=crm`
2. Sees CRM-styled login (brown theme)
3. Enters credentials
4. System checks permissions (A, B, C)
5. Redirects to CRM dashboard
6. Shows only purchased pages in navigation

### Company Name Display
- **With company**: Shows as header/branding
- **Welcome**: "שלום [Full Name]"
- **Company placement**: Above navigation or as logo
- **Without company**: Just shows "שלום [Full Name]"

## Database Schema

### Required Tables/Fields
- **users**: 
  - transcriber_code (VARCHAR)
  - personal_company (VARCHAR)
  - permissions (VARCHAR)
  
- **clients**: Client management data
- **projects**: Project tracking
- **employees**: Links via transcriber_code
- **employee_links**: 
  - crm_user_id (UUID)
  - transcriber_code (VARCHAR)
  - linked_at (TIMESTAMP)

### Permission Codes
- A: Client Management (ניהול לקוחות)
- B: Project Management (ניהול פרויקטים)
- C: Employee Management (ניהול עובדים)
- D: Transcription (תמלול)
- E: Proofreading (הגהה)
- F: Export (ייצוא)

## Technical Implementation

### Folder Structure
```
app/crm/
├── layout.tsx           # CRM layout with nav
├── page.tsx            # Dashboard
├── reports/
│   └── page.tsx        # Reports page
├── clients/
│   └── page.tsx        # Client management
├── projects/
│   └── page.tsx        # Project management
├── employees/
│   └── page.tsx        # Employee management
└── components/
    ├── Navigation.tsx   # CRM navigation
    ├── DashboardCube.tsx
    ├── PermissionGuard.tsx
    └── CompanyHeader.tsx
```

### Key Features to Implement
1. Permission-based routing
2. Dynamic navigation based on permissions
3. Transcriber code generation and linking
4. Company name display logic
5. RTL Hebrew support
6. Brown theme consistency
7. Glass-morphism UI effects

## Future Enhancements
- Real-time notifications
- Mobile app integration
- Advanced reporting
- Automated workflows
- Client portal
- Payment integration
- Project templates
- Bulk operations

## Notes
- All text in Hebrew (RTL)
- Responsive design required
- Must maintain exact design from PHP version
- Focus on user experience and efficiency
- Transcriber code is central to employee management
- One transcriber can work for multiple CRM companies