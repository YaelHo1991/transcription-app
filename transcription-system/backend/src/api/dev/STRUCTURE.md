# Developer Tools API

## Purpose
Development-only endpoints for system management and debugging.

## Files
- `routes.ts` - All dev tool endpoints

## Endpoints
- `GET /dev` - Serves the developer dashboard HTML
- `GET /dev/api/users` - Get all users with full details
- `GET /dev/api/stats` - Get system statistics
- `DELETE /dev/api/users/:id` - Delete a user
- `POST /dev/api/clear-sessions` - Clear all sessions
- `GET /dev/test-connection` - Test database connection
- `GET /dev/system-info` - Get system information

## Security
- Only accessible when NODE_ENV=development
- All endpoints check isDevelopment flag
- Returns 403 in production

## Database Access
- Full read access to users and licenses
- Can delete users (except admin)
- Shows passwords in plain text (dev only)

## Connected Frontend
- Developer Dashboard at http://localhost:5000/dev
- HTML served directly from backend
- No separate frontend component

## Notes
- CSP allows inline scripts for dev tools
- Shows Hebrew UI
- Real-time user and license management