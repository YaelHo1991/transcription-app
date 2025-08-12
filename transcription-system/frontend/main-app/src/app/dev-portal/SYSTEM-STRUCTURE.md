# 📚 System Architecture Overview

### **Overall Structure**
```
transcription-system/
├── backend/           # Express.js API server (Port 5000)
├── frontend/          # Next.js applications (Port 3000)
└── database/          # PostgreSQL database files
```

---

## 🔧 **Backend (Port 5000)**

### **Purpose**: API server + Developer Dashboard
### **Tech Stack**: Express.js, TypeScript, PostgreSQL

### **Key Directories**:
```
backend/
├── src/
│   ├── server.ts              # Main server entry point
│   ├── api/                   # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── licenses/          # License management
│   │   ├── crm/              # CRM operations
│   │   └── transcription/     # Transcription services
│   ├── dev-tools/            # Developer dashboard
│   │   ├── development-html.ts # Dev dashboard UI
│   │   ├── mock-data.ts      # Test data (dev only)
│   │   └── routes.ts         # Dev tool endpoints
│   ├── middleware/           # Security & auth middleware
│   │   ├── security.middleware.ts # Rate limiting, helmet, etc.
│   │   └── auth.middleware.ts    # JWT verification
│   └── db/                   # Database management
│       ├── connection.ts     # PostgreSQL connection
│       └── seed.ts           # Database seeding
```

### **Key Features**:
- **JWT Authentication** with ABCDEF permission system
- **Security**: Rate limiting, SQL injection protection, CORS, Helmet
- **Dev Dashboard** at `/dev` (only in development mode)
- **RESTful API** for all business logic

---

## 🎨 **Frontend (Port 3000)**

### **Purpose**: User-facing web application
### **Tech Stack**: Next.js 15, TypeScript, React

### **Key Directories**:
```
frontend/main-app/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx        # Root layout with navigation
│   │   ├── dev-portal/       # Main landing page
│   │   ├── licenses/         # License sales system
│   │   ├── crm/             # CRM interface
│   │   ├── transcription/    # Transcription interface
│   │   └── api/             # API proxy routes
│   ├── components/          # Reusable components
│   │   └── Navigation.tsx   # Persistent nav bar
│   └── context/            # React contexts
│       └── AuthContext.tsx  # Authentication state
```

### **Key Features**:
- **Persistent Navigation** across all pages
- **Hebrew RTL Support** throughout
- **Beautiful Gradients** on dev-portal
- **Protected Routes** with auth context
- **API Proxy** through Next.js for CORS handling

---

## 🗄️ **Database (PostgreSQL)**

### **Tables**:
- `users` - User accounts with permissions
- `licenses` - License management
- `projects` - CRM projects
- `transcriptions` - Transcription data

---

## 🔐 **Security Architecture**

### **Authentication Flow**:
1. User logs in → Frontend `/login`
2. Credentials sent to Backend `/api/auth/login`
3. Backend validates → Returns JWT token
4. Frontend stores token → Includes in API requests
5. Backend verifies JWT on each protected route

### **Permission System (ABCDEF)**:
- **A** - Admin access
- **B** - Billing/licenses
- **C** - CRM access
- **D** - Development tools
- **E** - Export capabilities
- **F** - Full transcription access

---

## 🌐 **Navigation Flow**

```
[Navigation Bar - Present on all pages]
    ↓
🏠 Home (dev-portal) → Beautiful landing page with system previews
    ├── 📋 Licenses → License sales interface
    ├── 👥 CRM → Customer relationship management
    └── 🎯 Transcription → Transcription workspace

🔧 Dev Tools (separate) → Backend dashboard for developers
```

---

## 🚀 **Current Status**

### **Working Features**:
✅ Authentication system with JWT  
✅ Persistent navigation bar  
✅ Dev portal with system previews  
✅ Backend developer dashboard  
✅ Security middleware (rate limiting, CSP, etc.)  
✅ Database connection and seeding  
✅ Hebrew RTL support  

### **Ready for Implementation**:
- License sales functionality
- CRM features
- Transcription interface
- User management
- File uploads

---

## 📁 **Environment Configuration**

### **Development** (`.env.development`):
- Dev tools enabled
- Mock data available
- Relaxed CORS
- Debug logging

### **Production** (`.env.production.example`):
- Dev tools disabled
- Strict security
- Production database
- HTTPS required

The system is modular, secure, and ready for feature development. Each component is isolated but connected through the navigation and API layer.