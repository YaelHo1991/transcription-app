# 📚 Deployment Lessons Learned & Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Critical Issues Encountered](#critical-issues-encountered)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Configuration](#environment-configuration)
5. [Common Errors and Solutions](#common-errors-and-solutions)
6. [Security Considerations](#security-considerations)
7. [Database Management](#database-management)
8. [Future Deployment Process](#future-deployment-process)

---

## Overview

This document captures all lessons learned from the Digital Ocean deployment on August 25, 2025, and provides a comprehensive guide for future deployments.

**Key Statistics:**
- Total issues resolved: 15+
- Time to resolution: ~2 hours
- Critical security issues found: 5
- Database migrations missed: 1 (backup system)

---

## Critical Issues Encountered

### 1. Server-Side Rendering (SSR) Issues ❌ → ✅

**Problem:** 
```
ReferenceError: navigator is not defined
```

**Root Cause:** Next.js SSR tries to access browser-only objects on server

**Files Affected:**
- `src/lib/services/resourceMonitor/ResourceMonitor.ts`
- `src/lib/services/resourceMonitor/thresholds.ts`

**Solution:**
```typescript
// Always check if running in browser
const isMobile = typeof navigator !== 'undefined' 
  ? /Android|webOS|iPhone|iPad/i.test(navigator.userAgent)
  : false;
```

**Prevention:** 
- Always use `typeof window !== 'undefined'` or `typeof navigator !== 'undefined'`
- Test with `npm run build && npm start` locally before deployment

### 2. Nginx Routing Conflicts ❌ → ✅

**Problem:** `/dev-portal/shortcuts-admin` returned 404

**Root Cause:** Nginx `/dev` location intercepted `/dev-portal` requests

**Original Config:**
```nginx
location /dev {
    proxy_pass http://127.0.0.1:5000/dev;
}
```

**Solution:**
```nginx
# More specific route MUST come first
location /dev-portal {
    proxy_pass http://[::1]:3002;
    # ... proxy headers
}

location /dev {
    proxy_pass http://127.0.0.1:5000/dev;
}
```

**Prevention:** Order nginx locations from most specific to least specific

### 3. IPv6 vs IPv4 Mismatch ❌ → ✅

**Problem:** 502 Bad Gateway - nginx couldn't connect to Next.js

**Root Cause:** Next.js listening on IPv6 (:::3002), nginx trying IPv4 (127.0.0.1)

**Solution:** Update nginx to use IPv6:
```nginx
proxy_pass http://[::1]:3002;  # Instead of http://127.0.0.1:3002
```

### 4. Missing Database Migrations ❌ → ✅

**Problem:** Backup system tables didn't exist on DO

**Tables Missing:**
- projects
- transcriptions  
- media_files
- transcription_backups
- transcription_media

**Solution:**
```bash
ssh do "cd /root/transcription-app/transcription-system/backend && \
  PGPASSWORD=transcription_pass psql -h localhost -p 5432 \
  -U transcription_user -d transcription_system \
  -f migrations/008_create_backup_system_tables.sql"
```

**Prevention:** Run ALL migrations during deployment

### 5. HTTPS/SSL Not Configured ❌ → ✅

**Problem:** Site unsecured, pedal device couldn't connect

**Solution:** Install Let's Encrypt:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yalitranscription.duckdns.org
```

---

## Pre-Deployment Checklist

### Local Testing
- [ ] Run `npm run build` in frontend - check for errors
- [ ] Run `npm start` (production mode) - verify it works
- [ ] Test all critical features in production build
- [ ] Check for `navigator`, `window`, `document` usage without guards
- [ ] Run `npm run typecheck` and `npm run lint`

### Code Review
- [ ] Search for `DEV_MODE = true` - should use environment variables
- [ ] Search for hardcoded passwords - move to .env files
- [ ] Search for `console.log` - remove or use proper logging
- [ ] Check all API endpoints have proper authentication
- [ ] Verify no development-only code in production

### Database
- [ ] List all migration files: `ls migrations/*.sql`
- [ ] Document which migrations need to run
- [ ] Backup existing database before migrations
- [ ] Have rollback plan ready

### Environment Variables
- [ ] Create `.env.production` file
- [ ] Document all required environment variables
- [ ] Never commit .env files to git
- [ ] Use strong, unique passwords

---

## Environment Configuration

### Current Issues Found

#### 1. Development Mode in Production 🔴
**File:** `frontend/main-app/src/services/backupService.ts`
```typescript
// WRONG - hardcoded
const DEV_MODE = true;

// CORRECT - use environment
const DEV_MODE = process.env.NODE_ENV === 'development';
```

#### 2. Frontend Running in Dev Mode 🔴
**Current:** `pm2 start 'npx next dev -p 3002'`
**Should be:** 
```bash
npm run build
pm2 start 'npm start' --name frontend
```

#### 3. Hardcoded Database Password 🔴
**Found in:** 42 locations
**Current:** `transcription_pass` hardcoded everywhere
**Should be:** Use environment variables

### Recommended Environment Structure

#### `.env.development`
```env
NODE_ENV=development
DATABASE_URL=postgresql://transcription_user:transcription_pass@localhost:5432/transcription_system
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3002
JWT_SECRET=dev-secret-change-in-production
```

#### `.env.production`
```env
NODE_ENV=production
DATABASE_URL=postgresql://transcription_user:STRONG_PASSWORD_HERE@localhost:5432/transcription_system
API_URL=https://yalitranscription.duckdns.org
FRONTEND_URL=https://yalitranscription.duckdns.org
JWT_SECRET=GENERATE_STRONG_SECRET_HERE
```

---

## Common Errors and Solutions

### Error: "Cannot GET /route"
**Causes:**
1. Route not defined in backend
2. Nginx routing issue
3. Wrong port in proxy_pass

**Debug Steps:**
```bash
# Test locally on server
curl http://localhost:3002/route
curl http://[::1]:3002/route

# Check nginx config
grep -A5 "location /route" /etc/nginx/sites-available/transcription

# Check nginx error logs
tail -f /var/log/nginx/error.log
```

### Error: "502 Bad Gateway"
**Causes:**
1. Backend/frontend crashed
2. Wrong port in nginx
3. IPv4/IPv6 mismatch

**Debug Steps:**
```bash
# Check if services running
pm2 list
pm2 logs frontend --lines 50
pm2 logs backend --lines 50

# Check ports
netstat -tulpn | grep -E '3002|5000'

# Test direct connection
curl http://localhost:3002
curl http://[::1]:3002
```

### Error: "navigator is not defined"
**Cause:** SSR trying to access browser API

**Fix Pattern:**
```typescript
// For any browser API
if (typeof window !== 'undefined') {
  // Browser-only code here
}

// For navigator specifically
const userAgent = typeof navigator !== 'undefined' 
  ? navigator.userAgent 
  : 'SSR';
```

### Error: "Module not found"
**Causes:**
1. Dependencies not installed
2. Case sensitivity on Linux (Windows is case-insensitive)

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check file names match imports exactly (case-sensitive!)
```

---

## Security Considerations

### Critical Security Issues to Fix

1. **Remove DEV_MODE flags**
   - Files: `backupService.ts`, others
   - Replace with environment checks

2. **Switch to Production Build**
   ```bash
   # Current (WRONG)
   pm2 start 'npx next dev -p 3002'
   
   # Correct
   npm run build
   pm2 start 'npm start' --name frontend
   ```

3. **Move Secrets to Environment Variables**
   - Database password (42 locations)
   - JWT secrets
   - API keys

4. **Disable Source Maps in Production**
   ```javascript
   // next.config.js
   module.exports = {
     productionBrowserSourceMaps: false,
   }
   ```

5. **Add Security Headers**
   ```nginx
   # In nginx config
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   ```

### Security Checklist
- [ ] All secrets in environment variables
- [ ] Production builds only
- [ ] Source maps disabled
- [ ] Console.logs removed
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Database password is strong
- [ ] JWT secret is unique and strong
- [ ] No development endpoints exposed

---

## Database Management

### Migration Management

#### Check Current State
```bash
# List all tables
PGPASSWORD=transcription_pass psql -h localhost -p 5432 \
  -U transcription_user -d transcription_system -c '\dt'

# Count tables (should be 14+ after all migrations)
... -c '\dt' | wc -l
```

#### Run Migrations
```bash
# Run specific migration
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 \
  -U transcription_user -d transcription_system \
  -f migrations/XXX_migration_name.sql

# Run all migrations in order
for file in migrations/*.sql; do
  echo "Running $file..."
  PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 \
    -U transcription_user -d transcription_system -f "$file"
done
```

### Required Tables

After all migrations, these tables must exist:
1. users
2. sessions
3. licenses
4. shortcut_categories
5. system_shortcuts
6. user_shortcuts
7. user_shortcut_quotas
8. shortcut_usage_stats
9. waveforms
10. projects
11. transcriptions
12. media_files
13. transcription_backups
14. transcription_media

### Backup Strategy
```bash
# Backup before deployment
pg_dump -h localhost -U transcription_user transcription_system > backup_$(date +%Y%m%d).sql

# Restore if needed
psql -h localhost -U transcription_user transcription_system < backup_20250825.sql
```

---

## Future Deployment Process

### Step-by-Step Deployment Guide

#### 1. Pre-Deployment (Local)
```bash
# 1. Check for issues
npm run typecheck
npm run lint

# 2. Build and test production
npm run build
npm start

# 3. Test critical features
# - Login
# - Transcription
# - Shortcuts
# - File upload
```

#### 2. Prepare Deployment Package
```bash
# 1. Update version
npm version patch

# 2. Build frontend
cd frontend/main-app
npm run build

# 3. Build backend  
cd ../../backend
npm run build

# 4. Create deployment archive
tar -czf deploy_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.env \
  --exclude=user_data \
  .
```

#### 3. Deploy to Server
```bash
# 1. Upload files
scp deploy_*.tar.gz do:/root/transcription-app/

# 2. SSH to server
ssh do

# 3. Backup current version
cd /root/transcription-app
tar -czf backup_$(date +%Y%m%d).tar.gz transcription-system/

# 4. Extract new version
tar -xzf deploy_*.tar.gz

# 5. Install dependencies
cd transcription-system/backend
npm ci --production
cd ../frontend/main-app
npm ci --production

# 6. Run migrations
cd ../../backend
for file in migrations/*.sql; do
  PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 \
    -U transcription_user -d transcription_system -f "$file"
done

# 7. Build frontend
cd ../frontend/main-app
npm run build

# 8. Restart services
pm2 restart all
pm2 save

# 9. Test
curl https://yalitranscription.duckdns.org/api/health
```

#### 4. Post-Deployment Verification
- [ ] API health check passes
- [ ] Can login
- [ ] Can access transcription page
- [ ] Shortcuts load
- [ ] File upload works
- [ ] No errors in logs: `pm2 logs --lines 100`
- [ ] Check nginx logs: `tail -f /var/log/nginx/error.log`

### Rollback Plan
```bash
# If deployment fails
cd /root/transcription-app
rm -rf transcription-system
tar -xzf backup_$(date +%Y%m%d).tar.gz
pm2 restart all
```

---

## PM2 Configuration

### Current Setup (Development - WRONG)
```javascript
// Current ecosystem.config.js
{
  name: 'frontend',
  script: 'npx next dev -p 3002'  // DEV MODE
}
```

### Production Setup (CORRECT)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'backend',
      script: './dist/server.js',
      cwd: '/root/transcription-app/transcription-system/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        CORS_ORIGIN: 'https://yalitranscription.duckdns.org'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/root/transcription-app/transcription-system/frontend/main-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
```

### PM2 Commands
```bash
# Save configuration
pm2 save

# Set up startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs frontend --lines 100
pm2 logs backend --lines 100

# Restart with updated env
pm2 restart frontend --update-env
```

---

## Monitoring and Debugging

### Health Checks
```bash
# API health
curl https://yalitranscription.duckdns.org/api/health

# Frontend health
curl -I https://yalitranscription.duckdns.org

# Database connection
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 \
  -U transcription_user -d transcription_system -c 'SELECT 1'
```

### Log Locations
- PM2 logs: `~/.pm2/logs/`
- Nginx access: `/var/log/nginx/access.log`
- Nginx errors: `/var/log/nginx/error.log`
- Application logs: Check PM2 logs

### Common Debug Commands
```bash
# Check services
pm2 list
systemctl status nginx

# Check ports
netstat -tulpn | grep -E '3002|5000|443|80'

# Check disk space
df -h

# Check memory
free -m

# Check processes
ps aux | grep -E 'node|nginx|postgres'
```

---

## Contact & Support

**Created by:** Claude & User
**Date:** August 25, 2025
**Last Updated:** August 25, 2025

For issues, refer to this document first. If problem persists, check:
1. PM2 logs
2. Nginx error logs
3. Browser console for frontend errors
4. Network tab for API errors

Remember: **Always test in production mode locally before deploying!**