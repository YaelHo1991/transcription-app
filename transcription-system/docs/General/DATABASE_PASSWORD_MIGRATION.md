# 🔐 Database Password Migration Guide

## Overview
This guide provides a step-by-step process to migrate from hardcoded database passwords to environment variables. Currently, the password "transcription_pass" appears in 42 locations throughout the codebase.

**Current State:** Password hardcoded everywhere  
**Target State:** Password in environment variables  
**Risk Level:** High if done incorrectly  
**Estimated Time:** 2-3 hours  

---

## Phase 1: Preparation (Do This First)

### 1.1 Inventory Current Password Usage

```bash
# Find all occurrences locally
grep -r "transcription_pass" transcription-system/ --exclude-dir=node_modules

# Count occurrences
grep -r "transcription_pass" transcription-system/ --exclude-dir=node_modules | wc -l
```

**Known Locations (42 instances):**
- Backend database configuration
- Migration scripts
- Test files
- Deployment scripts
- PM2 configurations
- Documentation

### 1.2 Create Environment Files

#### Local Development (.env.development)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=transcription_pass
DATABASE_URL=postgresql://transcription_user:transcription_pass@localhost:5432/transcription_system

# Application
NODE_ENV=development
PORT=5000
FRONTEND_PORT=3002

# Security
JWT_SECRET=development-secret-change-in-production
SESSION_SECRET=dev-session-secret

# URLs
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3002
```

#### Production (.env.production)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=GENERATE_STRONG_PASSWORD_HERE
DATABASE_URL=postgresql://transcription_user:STRONG_PASSWORD@localhost:5432/transcription_system

# Application
NODE_ENV=production
PORT=5000
FRONTEND_PORT=3002

# Security
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
SESSION_SECRET=GENERATE_ANOTHER_64_CHAR_STRING

# URLs
API_URL=https://yalitranscription.duckdns.org
FRONTEND_URL=https://yalitranscription.duckdns.org
```

### 1.3 Generate Strong Passwords

```bash
# Generate strong password (32 characters)
openssl rand -base64 32

# Generate JWT secret (64 characters)
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Password Requirements:**
- Minimum 20 characters
- Mix of uppercase, lowercase, numbers
- No special characters that break URLs (avoid @, :, /)
- Document in secure location (password manager)

---

## Phase 2: Code Migration

### 2.1 Update Backend Database Configuration

**File:** `backend/src/db/connection.ts`

**Current (WRONG):**
```typescript
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'transcription_system',
  user: 'transcription_user',
  password: 'transcription_pass'
};
```

**Updated (CORRECT):**
```typescript
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'transcription_system',
  user: process.env.DB_USER || 'transcription_user',
  password: process.env.DB_PASSWORD || 'transcription_pass' // Fallback for dev only
};

// Validate in production
if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  throw new Error('Database password not configured in production!');
}
```

### 2.2 Update PM2 Ecosystem Configuration

**File:** `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      script: './dist/server.js',
      env: {
        NODE_ENV: 'production',
        // Load from .env file
        DB_PASSWORD: process.env.DB_PASSWORD,
        JWT_SECRET: process.env.JWT_SECRET,
        // Or use dotenv
        node_args: '-r dotenv/config'
      }
    }
  ]
};
```

### 2.3 Update Migration Scripts

Create a migration runner that uses environment variables:

**File:** `backend/scripts/run-migrations.js`
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const migrationsDir = path.join(__dirname, '../migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

const dbUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

files.forEach(file => {
  console.log(`Running migration: ${file}`);
  try {
    execSync(`psql "${dbUrl}" -f "${path.join(migrationsDir, file)}"`, {
      stdio: 'inherit'
    });
    console.log(`✅ ${file} completed`);
  } catch (error) {
    console.error(`❌ ${file} failed:`, error.message);
    process.exit(1);
  }
});

console.log('All migrations completed!');
```

### 2.4 Update Shell Scripts

Replace hardcoded passwords in shell scripts:

**Before:**
```bash
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user
```

**After:**
```bash
# Load from environment
source .env.production
PGPASSWORD=$DB_PASSWORD psql -h localhost -U transcription_user

# Or use connection string
psql "$DATABASE_URL"
```

---

## Phase 3: Database Password Change

### 3.1 Change Password in PostgreSQL

```sql
-- Connect as superuser or transcription_user
ALTER USER transcription_user WITH PASSWORD 'NEW_STRONG_PASSWORD_HERE';

-- Verify change
\du transcription_user
```

### 3.2 Update Application Configuration

1. Update `.env.production` with new password
2. Restart services:
```bash
pm2 restart backend
pm2 restart frontend
```

3. Test connection:
```bash
# Test with new password
PGPASSWORD=NEW_PASSWORD psql -h localhost -U transcription_user -d transcription_system -c "SELECT 1"
```

---

## Phase 4: Testing

### 4.1 Local Testing

```bash
# 1. Set environment
export NODE_ENV=development

# 2. Test database connection
node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  pool.query('SELECT NOW()')
    .then(res => console.log('✅ Connected:', res.rows[0]))
    .catch(err => console.error('❌ Failed:', err.message))
    .finally(() => pool.end());
"

# 3. Run application
npm run dev
```

### 4.2 Production Testing

```bash
# 1. Deploy configuration
scp .env.production do:/root/transcription-app/transcription-system/backend/

# 2. SSH and test
ssh do
cd /root/transcription-app/transcription-system/backend
node -e "require('dotenv').config(); console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');"

# 3. Restart and monitor
pm2 restart backend --update-env
pm2 logs backend --lines 50
```

---

## Phase 5: Rollback Plan

### If Things Go Wrong:

1. **Immediate Rollback:**
```sql
-- Revert password in PostgreSQL
ALTER USER transcription_user WITH PASSWORD 'transcription_pass';
```

2. **Restore old configuration:**
```bash
# On server
cd /root/transcription-app
git checkout -- .
pm2 restart all
```

3. **Emergency Fix:**
```bash
# Temporarily set password in PM2
pm2 set backend:env.DB_PASSWORD transcription_pass
pm2 restart backend
```

---

## Security Best Practices

### 1. Never Commit .env Files
```gitignore
# .gitignore
.env
.env.*
!.env.example
```

### 2. Create .env.example
```env
# .env.example (commit this)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=YOUR_PASSWORD_HERE
```

### 3. Use Different Passwords Per Environment
- Development: Simple password OK
- Staging: Moderate complexity
- Production: Maximum security

### 4. Rotate Passwords Regularly
- Every 90 days for production
- After any security incident
- When team members leave

### 5. Password Storage
- Use password manager (1Password, LastPass)
- Document in secure location
- Never in code, comments, or commits

---

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current password
- [ ] Generate new strong password
- [ ] Create .env files
- [ ] Test locally with new setup

### During Migration
- [ ] Update database password in PostgreSQL
- [ ] Update .env.production file
- [ ] Update PM2 configuration
- [ ] Deploy to server
- [ ] Restart all services

### Post-Migration
- [ ] Test all API endpoints
- [ ] Verify database connections
- [ ] Check application logs
- [ ] Monitor for 24 hours
- [ ] Remove hardcoded passwords from code

### Cleanup
- [ ] Remove old passwords from code
- [ ] Update documentation
- [ ] Notify team of change
- [ ] Schedule next rotation

---

## Common Issues

### Issue: "FATAL: password authentication failed"
**Solution:**
```bash
# Check password is set
echo $DB_PASSWORD

# Check .env file loaded
node -e "require('dotenv').config(); console.log(process.env.DB_PASSWORD);"

# Verify PostgreSQL password
psql -U postgres -c "SELECT usename, passwd FROM pg_shadow WHERE usename='transcription_user';"
```

### Issue: "Environment variable not found"
**Solution:**
```bash
# Check file exists
ls -la .env*

# Check PM2 environment
pm2 env backend

# Reload with new environment
pm2 restart backend --update-env
```

### Issue: "Connection timeout"
**Solution:**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection parameters
psql -h localhost -p 5432 -U transcription_user -d transcription_system
```

---

## Automation Script

Save as `migrate-password.sh`:

```bash
#!/bin/bash

# Database Password Migration Script
# Usage: ./migrate-password.sh [new_password]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Database Password Migration Tool${NC}"
echo "================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Get new password or generate
if [ -z "$1" ]; then
    NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "/@+=")
    echo -e "${GREEN}Generated password: $NEW_PASSWORD${NC}"
else
    NEW_PASSWORD=$1
fi

# Backup current configuration
echo "Creating backup..."
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Update PostgreSQL password
echo "Updating database password..."
sudo -u postgres psql <<EOF
ALTER USER transcription_user WITH PASSWORD '$NEW_PASSWORD';
EOF

# Update .env file
echo "Updating environment file..."
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$NEW_PASSWORD/" .env.production

# Restart services
echo "Restarting services..."
pm2 restart all --update-env

# Test connection
echo "Testing connection..."
PGPASSWORD=$NEW_PASSWORD psql -h localhost -U transcription_user -d transcription_system -c "SELECT 1" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Password migration successful!${NC}"
    echo -e "${YELLOW}New password saved to .env.production${NC}"
else
    echo -e "${RED}❌ Migration failed! Rolling back...${NC}"
    cp .env.production.backup.$(date +%Y%m%d) .env.production
    pm2 restart all
    exit 1
fi
```

---

## Final Notes

**Timeline Recommendation:**
1. **Now:** Keep current password, focus on other issues
2. **Before Production:** Implement environment variables
3. **Production Launch:** Change to strong password
4. **Post-Launch:** Regular rotation schedule

**Priority:** LOW until ready for production  
**Risk:** HIGH if done incorrectly  
**Benefit:** Essential for production security

Remember: **Test thoroughly in development before touching production!**