# Frontend Structure Overview

## Technology Stack
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **CSS Modules** for component styling
- **React Context** for state management

## Directory Structure
```
src/
├── app/                    # Next.js pages (App Router)
│   ├── (public)/          # No auth required
│   │   ├── licenses/      # License purchase page
│   │   └── login/         # Login page (multiple styles)
│   │
│   ├── (protected)/       # Auth required (to be added)
│   │   ├── crm/          # CRM system
│   │   └── transcription/ # Transcription system
│   │
│   ├── api-test/         # API testing page (dev only)
│   ├── dev-portal/       # Frontend dev tools
│   │
│   ├── layout.tsx        # Root layout with providers
│   ├── page.tsx          # Home/landing page
│   └── globals.css       # Global styles
│
├── components/           # Reusable components
│   ├── Navigation.tsx    # Main nav bar
│   └── auth/
│       └── ProtectedRoute.tsx # Auth wrapper
│
├── context/              # Global state
│   └── AuthContext.tsx   # User auth state
│
├── styles/               # Additional styles
│   └── theme.ts         # Color themes
│
└── types/               # TypeScript definitions
    └── auth.ts          # User, License types
```

## Page Structure

### Public Pages (No Login Required)
- `/` - Home page
- `/licenses` - Purchase licenses
- `/login` - Login (with system-specific styling)

### Protected Pages (Login Required)
- `/crm` - CRM dashboard
- `/transcription` - Transcription app

## Styling Strategy

### System Themes
- **CRM**: Pink theme (#be1558)
- **Transcription**: Brown theme (#5a3f2a)
- **Admin/Dev**: Blue theme

### CSS Organization
- `globals.css` - Base styles, resets
- `[page].module.css` - Page-specific styles
- Component styles in same folder as component

## State Management
- **Auth Context**: Global user state
- **Local State**: Form handling, UI state
- **No Redux**: Keeping it simple

## API Communication
- All API calls to `http://localhost:5000`
- Fetch API (no Axios needed)
- Proper error handling
- Hebrew error messages

## Key Features
- RTL support for Hebrew
- Responsive design
- Fast refresh in development
- TypeScript throughout
- Modular architecture