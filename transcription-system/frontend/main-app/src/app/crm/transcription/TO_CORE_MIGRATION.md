# Core Migration Plan

## Items to Move to Core Folder

### From Current Structure to Core

#### 1. **Authentication & Session Management**
- `pages/main/components/header.php` → `core/auth/session-check.php`
- `pages/transcription/includes/auth-check.php` → `core/auth/auth-check.php`
- Login/logout logic → `core/auth/`

#### 2. **API Endpoints** (Already in core/api)
- Keep all API files in core/api
- Add missing endpoints from pages if any

#### 3. **Database Utilities**
- Database connection logic → `core/database/connection.php`
- Common queries → `core/database/queries/`
- Schema management → `core/database/schema/`

#### 4. **File Handling**
- `includes/file-validation.php` → `core/utilities/file-validation.php`
- Upload utilities → `core/utilities/upload-handler.php`
- File path management → `core/utilities/path-helper.php`

#### 5. **Global Assets**
- Keep in `core/assets/css/` and `core/assets/js/`
- Global styles (layout.css, base.css)
- Common JavaScript utilities

#### 6. **Configuration**
- Database config → `core/config/database.php`
- App settings → `core/config/app.php`
- API endpoints config → `core/config/api-endpoints.php`

#### 7. **Shared UI Components**
- Common headers/footers → `core/templates/`
- Error messages → `core/templates/messages/`
- Loading states → `core/templates/loading/`

## Items to Keep Page-Specific

### Should NOT Move to Core
1. Page-specific components (media player, text editor for transcription page)
2. Page-specific styles and scripts
3. Page-specific business logic
4. Component-specific configurations

## Migration Priority
1. **High Priority**: Authentication, Database, File validation
2. **Medium Priority**: Templates, Common UI
3. **Low Priority**: Optimization utilities

## Benefits
- Centralized maintenance
- Consistent authentication across pages
- Single source of truth for configurations
- Easier testing and updates