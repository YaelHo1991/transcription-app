# Stage 2 Security Implementation Plan
## Session Security & Audit Logging

### Overview
This document outlines the implementation plan for Stage 2 of our security enhancements, focusing on session management, audit logging, and account security features.

---

## 📋 Implementation Tasks

### 1. Database Schema Updates

#### A. Create Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### B. Create User Sessions Table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_remember_me BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

#### C. Create Login Attempts Table
```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255),
  ip_address INET,
  success BOOLEAN,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
```

#### D. Update Users Table
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS session_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS remember_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS remember_token_expires TIMESTAMP;
```

---

### 2. Backend Implementation

#### A. Audit Service (`/backend/src/services/auditService.ts`)
```typescript
interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  success?: boolean;
  errorMessage?: string;
}

enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_MODIFIED = 'DATA_MODIFIED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED'
}
```

#### B. Session Manager (`/backend/src/services/sessionManager.ts`)
- Session creation with timeout
- Activity tracking
- Concurrent session management
- Remember me token handling
- Session invalidation logic

#### C. Account Security Service (`/backend/src/services/accountSecurity.ts`)
- Failed login attempt tracking
- Account lockout logic
- Password strength validation
- Password history checking
- Suspicious activity detection

#### D. Middleware Updates
- Session timeout middleware
- Activity tracking middleware
- Audit logging middleware

---

### 3. Frontend Implementation

#### A. Session Management Components
- Session timeout warning modal
- Auto-logout functionality
- Remember me checkbox on login
- Session activity indicator

#### B. Security Notifications
- Email notification service integration
- In-app security alerts
- Login from new device notifications

#### C. Password Requirements Component
- Real-time password strength indicator
- Password requirements checklist
- Password history validation

---

### 4. Configuration & Settings

#### A. Environment Variables
```env
# Session Configuration
SESSION_TIMEOUT_MINUTES=30
SESSION_WARNING_MINUTES=5
MAX_CONCURRENT_SESSIONS=3
REMEMBER_ME_DAYS=30

# Security Settings
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_HISTORY_COUNT=5

# Audit Settings
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_LEVEL=INFO
```

---

## 📊 Implementation Timeline

### Week 1: Database & Backend Foundation
- [ ] Create database migrations
- [ ] Implement audit service
- [ ] Create session manager
- [ ] Add account security service

### Week 2: Authentication Flow Updates
- [ ] Update login endpoint with audit logging
- [ ] Implement session timeout logic
- [ ] Add remember me functionality
- [ ] Create account lockout system

### Week 3: Frontend Integration
- [ ] Add session timeout warnings
- [ ] Implement auto-logout
- [ ] Create security notifications
- [ ] Add password strength indicator

### Week 4: Testing & Deployment
- [ ] Unit tests for all services
- [ ] Integration testing
- [ ] Security testing
- [ ] Production deployment

---

## 🔒 Security Considerations

1. **Audit Log Security**
   - Audit logs should be write-only for application
   - Separate read permissions for admin review
   - Regular backup of audit logs
   - Encryption of sensitive metadata

2. **Session Security**
   - Use secure random tokens
   - HttpOnly, Secure, SameSite cookies
   - Regular session rotation
   - Clear sessions on logout

3. **Account Lockout**
   - Progressive delays between attempts
   - IP-based and username-based tracking
   - Admin override capability
   - Notification to user on lockout

4. **Password Security**
   - Never log passwords in audit logs
   - Use bcrypt with appropriate cost factor
   - Secure password reset tokens
   - Clear password history on account deletion

---

## ✅ Success Criteria

1. All login attempts are logged
2. Sessions timeout after inactivity
3. Account lockout works correctly
4. Password requirements are enforced
5. Audit logs capture all sensitive operations
6. No performance degradation
7. All tests pass
8. Security scan shows no new vulnerabilities

---

## 📚 References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)