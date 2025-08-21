# Backend Structure Overview

## Directory Structure
```
backend/src/
├── api/                    # All API endpoints
│   ├── auth/              # Authentication (login/logout)
│   ├── crm/               # CRM system endpoints
│   ├── dev/               # Developer tools
│   ├── licenses/          # License/selling system
│   ├── transcription/     # Transcription system
│   └── routes.ts          # Main router combining all
│
├── db/                     # Database layer
│   ├── connection.ts      # PostgreSQL connection pool
│   └── seed.ts           # Initial data seeding
│
├── middleware/            # Express middleware
│   ├── auth.middleware.ts # JWT validation, permissions
│   ├── error.middleware.ts # Error handling
│   └── security.middleware.ts # CSP, rate limiting, helmet
│
├── models/                # Data models
│   └── user.model.ts     # User CRUD operations
│
├── dev-tools/            # Developer dashboard
│   ├── development-html.ts # Dashboard HTML
│   └── mock-data.ts      # Test data
│
└── server.ts             # Main Express server

```

## API Organization Principle

Each system has its own folder:
- **Isolated**: Each system's logic is separate
- **Modular**: Easy to add/remove systems
- **Clean**: Short, focused files
- **Consistent**: Same structure pattern

## Database Connection
- Single connection pool in `db/connection.ts`
- All routes use the same `db` export
- Automatic connection on server start
- Graceful shutdown handling

## Security Layers
1. Helmet (security headers)
2. CORS (cross-origin control)
3. Rate limiting (prevent abuse)
4. SQL injection protection
5. JWT authentication
6. Permission-based access control

## Environment Variables (.env.development)
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET
- NODE_ENV=development
- PORT=5000

## Key Features
- TypeScript for type safety
- Nodemon for auto-reload
- Express 5 for modern features
- PostgreSQL with UUID support
- Proper error handling throughout