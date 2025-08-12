# License Purchase Page

## Purpose
Public-facing page for purchasing system licenses.

## Files
- `page.tsx` - Main React component
- `licenses.module.css` - All styling for the page

## Features
- Hebrew RTL layout
- Two systems: CRM (pink theme) and Transcription (brown theme)
- Select permissions with checkboxes
- "Select All" functionality per system
- Real-time price calculation
- Form validation

## Visual Design
- **CRM System**: Pink theme (#be1558)
- **Transcription System**: Brown theme (#5a3f2a)
- Colored checkboxes matching system themes
- Responsive grid layout
- Professional gradient backgrounds

## API Integration
- Calls `POST /api/licenses/purchase`
- Sends: fullName, email, personalCompany, permissions[], totalAmount
- Handles success/error responses in Hebrew

## Pricing
- CRM permissions: ₪99 per month each
- Transcription permissions: ₪79 per month each

## State Management
- Local React state (useState)
- No authentication required
- Form resets on successful submission

## Notes
- Fully functional and connected to database
- Creates users and licenses on purchase
- Shows statistics from backend