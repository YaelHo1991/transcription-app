Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.

# Transcriber Code System (קוד מתמלל)
**Purpose**: Every user with transcription permissions (D, E, or F) gets a unique transcriber code
**Format**: TRN-XXXX (4 random digits)
**Usage**: Allows transcribers to work for multiple CRM users by entering their code
**Storage**: Stored in users.transcriber_code column
**Generation**: Automatically generated when user purchases transcription permissions

# System Architecture
## Frontend
- **Framework**: Next.js 15 with App Router
- **Port**: 3002 (main app)
- **Structure**:
  - `/crm` - CRM system (brown theme #b85042)
  - `/transcription` - Transcription system (pink theme #e91e63)
  - `/licenses` - License purchase page
  - `/login` - Dual-system login with theme switching

## Backend
- **Framework**: Express.js with TypeScript
- **Port**: 5000
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Permissions**: 
  - A, B, C = CRM permissions
  - D, E, F = Transcription permissions

## Key Features
- Permission-based access control
- Multi-tenant support via transcriber codes
- Hebrew RTL layout support
- Responsive design with proper scaling for large screens

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# CSS Extraction Best Practices
**CRITICAL**: When extracting CSS from an embedded style block to separate files:
1. NEVER modify the CSS properties, values, or behavior
2. ONLY reorganize the CSS into logical files
3. Keep the EXACT same selectors, properties, and values
4. Do NOT add new properties like flex-wrap or min-width unless they existed in the original
5. Do NOT change class names unless updating HTML to match
6. Test that the behavior remains IDENTICAL after extraction

**Error Example from Stage 20**: 
- Added `flex-wrap: wrap` to sliders container (didn't exist in original)
- Added `min-width: 200px` to slider groups (didn't exist in original)
- Changed modal structure and class names without preserving original HTML
- Result: Broke responsive layout and modal functionality