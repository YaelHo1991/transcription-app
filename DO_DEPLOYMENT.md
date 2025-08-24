# Digital Ocean Deployment Guide 🚀

## ✅ Local Issues Fixed
- Fixed template literal syntax errors in dev-portal, licenses, and layout pages
- Cleared Next.js build cache
- Verified all pages working locally on http://localhost:3002

## 📋 Deployment Setup Complete

### Files Created:
1. **GitHub Actions Workflow** (`.github/workflows/deploy-to-do.yml`)
   - Automated deployment on push to main branch
   
2. **Droplet Setup Script** (`scripts/setup-droplet.sh`)
   - Complete setup for fresh Ubuntu droplet
   - Installs Node.js, PostgreSQL, nginx, PM2
   
3. **Quick Deploy Script** (`scripts/deploy.sh`)
   - Run after git pull for updates

## 🚀 How to Deploy to Digital Ocean

### Step 1: Prepare Your Droplet
1. Create a new Ubuntu droplet on Digital Ocean
2. SSH into your droplet: `ssh root@YOUR_DROPLET_IP`
3. Run the setup script:
```bash
wget https://raw.githubusercontent.com/YaelHo1991/transcription-app/main/scripts/setup-droplet.sh
chmod +x setup-droplet.sh
./setup-droplet.sh
```

### Step 2: Configure Environment Variables
Edit the backend environment file:
```bash
nano /opt/transcription-system/transcription-system/backend/.env
```
Update:
- Database password
- JWT secret
- API keys
- Email credentials

Edit the frontend environment file:
```bash
nano /opt/transcription-system/transcription-system/frontend/main-app/.env.local
```
Update:
- API URLs to your droplet IP/domain

### Step 3: Run Database Migrations
```bash
cd /opt/transcription-system/transcription-system/backend
npm run migrate
```

### Step 4: Set Up SSL (Optional but Recommended)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Step 5: Deploy Updates (After Initial Setup)
Simply push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Or manually on the droplet:
```bash
cd /opt/transcription-system
git pull origin main
./scripts/deploy.sh
```

## 🔍 Monitoring

Check service status:
```bash
pm2 status
```

View logs:
```bash
pm2 logs transcription-backend
pm2 logs transcription-frontend
```

Check nginx:
```bash
sudo systemctl status nginx
```

## 🎯 GitHub Secrets to Configure

Add these secrets in your GitHub repository settings:
- `DO_HOST`: Your droplet IP address
- `DO_USERNAME`: root (or your user)
- `DO_SSH_KEY`: Your SSH private key

## ✨ That's It!

Your application will now:
1. Work perfectly on localhost
2. Deploy automatically to Digital Ocean on git push
3. Be accessible at http://YOUR_DROPLET_IP

Need HTTPS? The SSL setup with Let's Encrypt will handle that!