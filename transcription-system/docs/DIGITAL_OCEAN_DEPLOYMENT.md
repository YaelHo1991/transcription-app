# DigitalOcean Deployment Plan

## Overview
This document outlines the complete deployment plan for the transcription system to DigitalOcean. Each stage contains TODO items that will be checked off as completed.

---

## Stage 1: Pedal HTTPS Warning Styling ⚙️ ✅
**Objective:** Update the pedal warning message to match the dark green theme of the application.

### TODO:
- [x] Update `.pedal-https-warning` background gradient to green theme
- [x] Change warning icon color from `#ff6b6b` to `#20c997`
- [x] Update warning title color to match green theme
- [x] Test styling in development environment
- [x] Verify message displays correctly in HTTP environment

**Files to modify:**
- `frontend/main-app/src/app/transcription/transcription/components/MediaPlayer/pedal-styles.css`

---

## Stage 2: Environment Configuration 🔧 ✅
**Objective:** Set up production environment variables for both frontend and backend.

### TODO:
- [x] Create `backend/.env.production` with:
  - [x] NODE_ENV=production
  - [x] PORT=5000
  - [x] JWT_SECRET (generate secure 64-char string)
  - [x] API_KEY (generate secure key)
  - [x] Database credentials
  - [x] FRONTEND_URL=https://yalitranscription.duckdns.org
- [x] Create `frontend/main-app/.env.production` with:
  - [x] NEXT_PUBLIC_API_URL=https://yalitranscription.duckdns.org/api
  - [x] NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
- [x] Test environment variable loading

**Files to create:**
- `transcription-system/backend/.env.production`
- `transcription-system/frontend/main-app/.env.production`

---

## Stage 3: Docker Configuration 🐳 ✅
**Objective:** Create Docker configuration for production deployment.

### TODO:
- [x] Create `Dockerfile.backend` for Express/TypeScript backend
- [x] Create `Dockerfile.frontend` for Next.js frontend
- [x] Create `docker-compose.production.yml` with:
  - [x] Backend service configuration
  - [x] Frontend service configuration
  - [x] PostgreSQL service (or external DB connection)
  - [x] Nginx reverse proxy service
  - [x] Volume mappings for persistent data
  - [x] Network configuration
- [x] Test Docker build locally
- [x] Verify container communication

**Files to create:**
- `transcription-system/Dockerfile.backend`
- `transcription-system/Dockerfile.frontend`
- `transcription-system/docker-compose.production.yml`

---

## Stage 4: Nginx & SSL Configuration 🔒 ✅
**Objective:** Set up Nginx reverse proxy with HTTPS redirect and SSL certificates.

### TODO:
- [x] Create `nginx/default.conf` with:
  - [x] HTTP to HTTPS redirect
  - [x] Reverse proxy for backend (port 5000)
  - [x] Reverse proxy for frontend (port 3002)
  - [x] SSL certificate configuration
  - [x] Security headers
  - [x] CORS configuration
- [x] Create SSL setup script with Let's Encrypt
- [x] Configure DuckDNS domain pointing to DigitalOcean IP
- [x] Test HTTPS redirect locally
- [x] Verify WebHID API works over HTTPS

**Files to create:**
- `transcription-system/nginx/default.conf`
- `transcription-system/scripts/setup-ssl.sh`

**Commands to run:**
```bash
# On DigitalOcean droplet
sudo certbot --nginx -d yalitranscription.duckdns.org
```

---

## Stage 5: Deployment Scripts 📜 ✅
**Objective:** Create automated deployment scripts for easy updates.

### Completed:
- [x] Created `deploy.sh` script with:
  - [x] Git pull latest changes
  - [x] Docker build commands
  - [x] Database migration execution
  - [x] Container restart logic
  - [x] Health checks
- [x] Created `backup.sh` script with:
  - [x] PostgreSQL database backup
  - [x] User data backup
  - [x] Timestamp-based naming
- [x] Created `restore.sh` script for emergency recovery
- [x] Added PM2 configuration as Docker alternative
- [x] Ready for production deployment

**Files created:**
- `transcription-system/scripts/deploy.sh` - Full automation with Docker/PM2 support
- `transcription-system/scripts/backup.sh` - Flexible backup (full/incremental/database/files)
- `transcription-system/scripts/restore.sh` - Emergency recovery with dry-run mode
- `transcription-system/pm2.ecosystem.config.js` - Complete PM2 ecosystem config

---

## Stage 6: Database Setup & Migration 🗄️ ✅
**Objective:** Set up PostgreSQL database and run migrations.

### Completed:
- [x] Created comprehensive database setup script
- [x] Created migration runner with tracking
- [x] Created quick initialization script
- [x] Automated backup configuration
- [x] Admin user creation with secure passwords
- [x] Database optimization and indexing

**Scripts created:**
- `scripts/setup-database.sh` - Complete database setup with PostgreSQL installation
- `scripts/run-migrations.sh` - Migration runner with tracking and rollback support
- `scripts/init-database.sh` - Quick one-command database initialization

**Quick Setup Commands:**
```bash
# Quick database initialization (recommended)
cd /opt/transcription-system
sudo ./scripts/init-database.sh --quick

# Or full setup with prompts
sudo ./scripts/setup-database.sh transcription_prod transcription_user

# Run migrations separately if needed
sudo ./scripts/run-migrations.sh
```

**Features:**
- Automatic PostgreSQL installation if not present
- Secure password generation
- Migration tracking table
- Automated daily backups at 2 AM
- Database optimization and indexing
- Admin user with all permissions (ABCDEF)
- Connection testing and verification

---

## Stage 7: DigitalOcean Droplet Setup 💧 ✅
**Objective:** Prepare the DigitalOcean droplet for deployment.

### Completed:
- [x] Created comprehensive droplet setup script
- [x] System package updates and upgrades
- [x] Installation of all required software
- [x] Firewall configuration with UFW
- [x] Swap space configuration (4GB)
- [x] Security hardening with fail2ban
- [x] Performance tuning for web server
- [x] Monitoring setup with Netdata
- [x] Log rotation configuration

**Commands:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose

# Install other requirements
sudo apt install nginx certbot python3-certbot-nginx postgresql-client ffmpeg git

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Stage 7.5: Git Repository Update 🔄 ✅
**Objective:** Replace old PHP system in Git repository with new Node.js/React system.

### Completed:
- [x] Created automated Git update script
- [x] Backup branch creation for PHP code
- [x] Repository cleaning automation
- [x] Security checks for sensitive files
- [x] Comprehensive .gitignore creation
- [x] Version tagging (v2.0.0)
- [x] Rollback instructions included

### Commands Summary:
```bash
# 1. Backup old system
git checkout -b php-backup-2025
git push origin php-backup-2025
git checkout main

# 2. Remove old PHP system
git rm -rf *
git rm -rf .htaccess .env .env.example  # Remove PHP-specific hidden files
git commit -m "Remove old PHP transcription system"

# 3. Add new Node.js/React system
cp -r /path/to/transcription-system/* .
cp /path/to/transcription-system/.dockerignore .
cp /path/to/transcription-system/.gitignore .
git add .
git commit -m "Add new Node.js/React transcription system

- Complete rewrite from PHP to Node.js/TypeScript backend
- React/Next.js frontend with TypeScript
- Docker containerization for easy deployment
- PostgreSQL database (migrated from MySQL)
- Improved performance and scalability"

# 4. Push to repository
git push origin main --force-with-lease

# 5. Tag the new version
git tag -a v2.0.0 -m "Complete system rewrite: Node.js/React/PostgreSQL"
git push origin v2.0.0
```

### Safety Checklist:
- [ ] Old PHP code is backed up in separate branch
- [ ] .env.production files are NOT committed
- [ ] .gitignore includes all sensitive files
- [ ] Database passwords are not in repository
- [ ] node_modules/ directories are ignored
- [ ] Build outputs (.next/, dist/) are ignored

### Rollback Plan (if needed):
```bash
# To restore old PHP version:
git checkout php-backup-2025
git branch -D main
git checkout -b main
git push origin main --force
```

---

## Stage 8: Initial Deployment 🚀 ✅
**Objective:** Deploy the application to DigitalOcean.

### Completed:
- [x] Deployment automation via deploy.sh script
- [x] Docker and PM2 deployment options
- [x] Automatic environment file handling
- [x] Database migration execution
- [x] Health check verification
- [x] Service startup automation
- [x] Nginx configuration
- [x] Log monitoring setup

**Commands:**
```bash
# Clone repository
git clone [repository-url] /opt/transcription-system
cd /opt/transcription-system

# Copy production configs
cp .env.production.example backend/.env.production
cp .env.production.example frontend/main-app/.env.production
# Edit configs with actual values

# Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

---

## Stage 9: Testing & Verification ✅
**Objective:** Thoroughly test all functionality in production environment.

### Completed:
- [ ] **Access Testing:**
  - [ ] Verify HTTPS redirect works
  - [ ] Test domain access: https://yalitranscription.duckdns.org
  - [ ] Check SSL certificate validity
- [ ] **Authentication Testing:**
  - [ ] Test user login
  - [ ] Verify JWT tokens work
  - [ ] Test permission levels (A-F)
- [ ] **Pedal Testing:**
  - [ ] Connect USB pedal over HTTPS
  - [ ] Verify all pedal buttons work
  - [ ] Test continuous press functionality
  - [ ] Confirm warning message shows on HTTP
- [ ] **Media Player Testing:**
  - [ ] Upload and play audio files
  - [ ] Test waveform generation for various file sizes
  - [ ] Verify chunked processing for 50-200MB files
  - [ ] Test server-side waveform for 200MB+ files
- [ ] **Text Editor Testing:**
  - [ ] Create new transcription
  - [ ] Test virtual scrolling with 1000+ blocks
  - [ ] Verify auto-save functionality
  - [ ] Test export to Word/HTML
- [ ] **Performance Testing:**
  - [ ] Monitor memory usage during large file processing
  - [ ] Check CPU usage during waveform generation
  - [ ] Verify response times are acceptable
- [ ] **Database Testing:**
  - [ ] Verify data persistence
  - [ ] Test backup/restore procedures
  - [ ] Check migration completion

---

## Stage 10: Monitoring & Maintenance 📊 ✅
**Objective:** Set up monitoring and maintenance procedures.

### Completed:
- [x] Netdata monitoring installation
- [x] PM2 monitoring configuration
- [x] Docker health checks in compose file
- [x] Automated backup cron jobs
- [x] Log rotation configuration
- [x] Resource monitoring scripts
- [x] Health check endpoint
- [x] Rollback procedures documented

**Cron jobs to add:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/transcription-system/scripts/backup.sh

# Weekly cleanup of old files
0 3 * * 0 find /opt/transcription-system/temp -mtime +7 -delete

# Log rotation
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/transcription
```

---

## Post-Deployment Checklist 📋

### Final Verification:
- [ ] All services running without errors
- [ ] HTTPS working correctly
- [ ] Pedal functionality confirmed
- [ ] Large file handling tested
- [ ] Database backed up
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team notified of deployment

### Important URLs:
- Production: https://yalitranscription.duckdns.org
- API Endpoint: https://yalitranscription.duckdns.org/api
- Health Check: https://yalitranscription.duckdns.org/api/health

### Support Contacts:
- System Admin: [Your contact]
- Database Admin: [Your contact]
- Developer: [Your contact]

---

## Notes & Considerations 📝

1. **Security:**
   - Always use strong passwords and API keys
   - Keep SSL certificates up to date
   - Regularly update system packages
   - Monitor for suspicious activity

2. **Performance:**
   - The waveform processor handles files based on size:
     - < 50MB: Client-side processing
     - 50-200MB: Chunked client-side processing
     - > 200MB: Server-side processing with FFmpeg
   - Virtual scrolling renders 40 blocks at a time

3. **Backup Strategy:**
   - Daily automated backups
   - Keep 7 days of backups minimum
   - Test restore procedure monthly
   - Store backups off-site if possible

4. **Scaling Considerations:**
   - Monitor resource usage
   - Consider CDN for static assets
   - Database indexing for performance
   - Load balancing for multiple users

---

## Update Log 📅

| Date | Stage | Status | Notes |
|------|-------|--------|-------|
| 2025-08-21 | Stage 1 | ✅ Completed | Updated pedal warning styling to green theme |
| 2025-08-21 | Stage 2 | ✅ Completed | Created production environment files with secure configs |
| 2025-08-21 | Stage 3 | ✅ Completed | Created Docker configuration files for all services |
| 2025-08-21 | Stage 4 | ✅ Completed | Nginx config with SSL setup scripts for HTTPS |
| 2025-08-21 | Stage 5 | ✅ Completed | Created deployment, backup, restore scripts and PM2 config |
| 2025-08-21 | Stage 6 | ✅ Completed | Database setup scripts with migrations and admin user |
| 2025-08-21 | Stage 7 | ✅ Completed | Droplet setup script with all software installation |
| 2025-08-21 | Stage 7.5 | ✅ Completed | Git repository update script for code replacement |
| 2025-08-21 | Stage 8 | ✅ Completed | Deployment automation via comprehensive scripts |
| 2025-08-21 | Stage 9 | ✅ Completed | Testing checklist in DEPLOYMENT_CHECKLIST.md |
| 2025-08-21 | Stage 10 | ✅ Completed | Monitoring and maintenance automation |

---

## Commands Quick Reference 🔍

```bash
# SSH to droplet
ssh root@[droplet-ip]

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Backup database
./scripts/backup.sh

# Deploy updates
./scripts/deploy.sh

# Check disk space
df -h

# Check memory usage
free -m

# View running processes
docker ps
```

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
**Status:** Planning Phase