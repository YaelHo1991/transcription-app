# 📁 Scripts Directory

Organized scripts for deployment, fixes, and utilities.

## 📂 Directory Structure

```
scripts/
├── deployment/     # Initial deployment and setup scripts
├── fixes/         # Problem-solving and fix scripts
└── utilities/     # Helper and status check scripts
```

## 🚀 Deployment Scripts (`/deployment`)

### Initial Setup
- `setup-droplet.sh` - Initial DigitalOcean droplet setup
- `simple-deploy.sh` - Simple one-command deployment
- `deploy.sh` - Standard deployment script
- `start-app.sh` - Start application after deployment

### Upload Scripts
- `upload-to-droplet.bat` - Windows batch file for uploading code
- `fast-upload.bat` - Fast upload excluding unnecessary files

## 🔧 Fix Scripts (`/fixes`)

### System Fixes
- `complete-system-fix.sh` - **MAIN FIX** - Fixes database, backend, frontend, and nginx
- `complete-fix.sh` - Complete fix for all issues
- `final-fix.sh` - Final deployment fixes
- `fix-and-start.sh` - Fix issues and start services
- `fix-api-urls.sh` - Fix API URL configuration
- `fix-deployment.sh` - Fix deployment issues
- `fix-nginx.sh` - Fix Nginx configuration
- `fix-urls.sh` - Fix URL and navigation issues
- `quick-fix.sh` - Quick fix for common issues

## 🛠️ Utilities (`/utilities`)

- `check-status.sh` - Check system status and find issues

## 📝 Quick Usage Guide

### For New Deployment:
```bash
# On droplet:
/root/scripts/deployment/setup-droplet.sh
/root/scripts/deployment/simple-deploy.sh
```

### For Fixing Issues:
```bash
# The main fix script (use this first):
/root/scripts/fixes/complete-system-fix.sh
```

### For Checking Status:
```bash
/root/scripts/utilities/check-status.sh
```

## 🎯 Most Important Scripts

1. **`complete-system-fix.sh`** - Fixes everything (database, API, frontend, nginx)
2. **`check-status.sh`** - Shows what's working and what's not
3. **`fast-upload.bat`** - Quick code upload from Windows

## 💡 Tips

- Always run `check-status.sh` first to diagnose issues
- Use `complete-system-fix.sh` for most problems
- Upload code with `fast-upload.bat` for updates
- Check logs if something doesn't work:
  - Frontend: `tail -f /var/log/frontend.log`
  - Backend: `pm2 logs backend`