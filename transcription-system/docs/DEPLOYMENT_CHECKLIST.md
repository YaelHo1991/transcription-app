# 🚀 Master Deployment Checklist

## Complete Step-by-Step Deployment Guide
**Follow these steps IN ORDER on your LOCAL machine first, then on the droplet**

---

## 📋 Phase 1: LOCAL PREPARATION (Your Computer)

### ✅ Already Completed:
- [x] Stage 1: Pedal warning styling updated to green theme
- [x] Stage 2: Environment configuration files created
- [x] Stage 3: Docker configuration files created
- [x] Stage 4: Nginx and SSL configuration created
- [x] Stage 5: Deployment scripts created
- [x] Stage 6: Database setup scripts created

### 🔄 Step 1: Update Git Repository (LOCAL)
**⚠️ WARNING: This will replace your old PHP code!**

```bash
# Navigate to your transcription-system folder
cd C:\Users\ayelh\Documents\Projects\Transcription\transcription-system

# Run the Git update script
./scripts/update-git-repo.sh

# This script will:
# 1. Backup old PHP code to a new branch
# 2. Clean the repository
# 3. Add all new Node.js/React files
# 4. Commit and tag as v2.0.0
# 5. Push to your Git repository
```

---

## 📋 Phase 2: DIGITALOCEAN DROPLET SETUP

### 🔄 Step 2: Connect to Your Droplet
```bash
# From your local computer, SSH into the droplet
ssh root@157.245.137.210
```

### 🔄 Step 3: Prepare the Droplet
```bash
# Clone your updated repository
cd /opt
git clone [your-git-repository-url] transcription-system
cd transcription-system

# Make scripts executable
chmod +x scripts/*.sh

# Run droplet setup (installs all required software)
./scripts/setup-droplet.sh

# This will install:
# - Node.js 18, Docker, PostgreSQL, Nginx, FFmpeg
# - Configure firewall, swap space, and security
# Takes about 10-15 minutes
```

### 🔄 Step 4: Configure DuckDNS
```bash
# Edit the DuckDNS update script
nano /usr/local/bin/duckdns-update.sh

# Replace 'your-duckdns-token' with your actual token
# Save and exit (Ctrl+X, Y, Enter)

# Test DuckDNS update
/usr/local/bin/duckdns-update.sh
```

### 🔄 Step 5: Setup Database
```bash
# Quick database setup with auto-generated passwords
cd /opt/transcription-system
./scripts/init-database.sh --quick

# IMPORTANT: Save the passwords shown!
# Database password: [will be shown]
# Admin password: [will be shown]
```

### 🔄 Step 6: Configure Environment Files
```bash
# Copy the example environment files
cp backend/.env.production.example backend/.env.production
cp frontend/main-app/.env.production.example frontend/main-app/.env.production

# Edit backend environment
nano backend/.env.production

# Update these values:
# - DB_PASSWORD=[password from step 5]
# - JWT_SECRET=[keep the generated one or create new]
# - EMAIL_PASS=[your email app password if using email]

# Edit frontend environment (should be mostly ready)
nano frontend/main-app/.env.production

# Verify the domain is correct:
# NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
```

### 🔄 Step 7: Setup SSL Certificate
```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d yalitranscription.duckdns.org

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect (option 2)
```

### 🔄 Step 8: Deploy the Application
```bash
# Deploy with Docker (recommended)
cd /opt/transcription-system
./scripts/deploy.sh docker

# OR deploy with PM2 (alternative)
./scripts/deploy.sh pm2

# This will:
# - Build the application
# - Run database migrations
# - Start all services
# - Configure nginx
# Takes about 5-10 minutes
```

---

## 📋 Phase 3: VERIFICATION

### 🔄 Step 9: Verify Services
```bash
# Check if everything is running
docker-compose -f docker-compose.production.yml ps

# OR for PM2
pm2 status

# Check health
curl http://localhost:5000/api/health
curl http://localhost:3002

# Run system health check
/usr/local/bin/health-check.sh
```

### 🔄 Step 10: Test the Application
```
1. Open browser: https://yalitranscription.duckdns.org
2. Login with admin credentials from Step 5
3. Test:
   - [ ] Login works
   - [ ] Can create new project
   - [ ] Can upload audio file
   - [ ] Waveform generates
   - [ ] Can start transcription
   - [ ] Pedal connects (if HTTPS)
   - [ ] Can export to Word
```

---

## 📋 Phase 4: POST-DEPLOYMENT

### 🔄 Step 11: Setup Monitoring
```bash
# Access Netdata monitoring (if installed)
# http://157.245.137.210:19999

# View logs
docker-compose -f docker-compose.production.yml logs -f

# OR for PM2
pm2 logs
```

### 🔄 Step 12: Configure Backups
```bash
# Verify backup cron job
crontab -l

# Test backup manually
/opt/transcription-system/scripts/backup.sh full 30

# Backups will be in /opt/backups/
```

---

## 🆘 Troubleshooting

### If deployment fails:
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs
# OR
pm2 logs

# Restart services
docker-compose -f docker-compose.production.yml restart
# OR
pm2 restart all

# Check disk space
df -h

# Check memory
free -m
```

### If you need to rollback:
```bash
# On your local machine
git checkout php-backup-[date]
git branch -D main
git checkout -b main
git push origin main --force

# On droplet - restore from backup
/opt/transcription-system/scripts/restore.sh /opt/backups/[backup-folder]
```

### Common Issues:

1. **Port already in use:**
   ```bash
   # Find what's using the port
   lsof -i :5000
   lsof -i :3002
   
   # Kill the process if needed
   kill -9 [PID]
   ```

2. **Database connection failed:**
   ```bash
   # Check PostgreSQL status
   systemctl status postgresql
   
   # Check credentials in .env.production
   cat backend/.env.production | grep DB_
   ```

3. **Nginx not working:**
   ```bash
   # Test nginx config
   nginx -t
   
   # Restart nginx
   systemctl restart nginx
   ```

4. **SSL certificate issues:**
   ```bash
   # Renew certificate
   certbot renew --nginx
   ```

---

## 📞 Support Information

- **Droplet IP:** 157.245.137.210
- **Domain:** https://yalitranscription.duckdns.org
- **Default Admin:** admin (password from Step 5)
- **Backup Location:** /opt/backups/
- **Application Location:** /opt/transcription-system/
- **Logs Location:** /opt/transcription-system/logs/

---

## ✅ Final Checklist

After deployment, verify:
- [ ] Website loads at https://yalitranscription.duckdns.org
- [ ] HTTPS redirect works (http → https)
- [ ] Admin can login
- [ ] Database is backing up daily
- [ ] Monitoring is active
- [ ] All passwords are saved securely
- [ ] Team members have been notified
- [ ] Old PHP code is backed up in Git branch

---

## 🎉 Deployment Complete!

Once all checks pass, your transcription system is ready for production use!

**Remember:**
- Change the admin password after first login
- Set up additional user accounts as needed
- Monitor system resources regularly
- Keep backups for at least 30 days

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-08-21  
**System Version:** 2.0.0 (Node.js/React)