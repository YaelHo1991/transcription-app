# Licenses/Selling System API

## Purpose
Handles all license purchasing and selling system functionality.

## Files
- `routes.ts` - Main routes for license operations
- `routes-complex.ts` - (Legacy) Complex route handlers - to be removed

## Endpoints
- `GET /api/licenses/stats` - Get statistics for the license page
- `POST /api/licenses/purchase` - Process a new license purchase

## Database Tables Used
- `users` - Creates/updates user records
- `licenses` - Stores purchased licenses

## Connected Frontend
- `/licenses` page - Public purchase form
- Uses fetch to `http://localhost:5000/api/licenses/`

## Key Features
- Creates new users or updates existing ones
- Generates unique license keys
- Handles transaction with proper rollback
- Stores permissions (A,B,C for CRM, D,E,F for transcription)

## Notes
- Public endpoint (no auth required for purchase)
- Validates email, name, and permissions
- Returns Hebrew success/error messages