#!/bin/bash

# Digital Ocean Deployment Sync Script
# This script syncs your local development to Digital Ocean droplet

echo "🚀 Starting Digital Ocean Synchronization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="146.190.57.51"
DROPLET_USER="root"
PROJECT_PATH="/root/transcription-system"

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# 1. Build TypeScript backend
echo -e "${YELLOW}Building TypeScript backend...${NC}"
cd ../transcription-system/backend
npm run build
check_status "Backend build"

# 2. Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
cd ../..
git add -A
git commit -m "Sync to Digital Ocean - $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
check_status "Git push"

# 3. SSH to droplet and pull changes
echo -e "${YELLOW}Connecting to Digital Ocean droplet...${NC}"
ssh ${DROPLET_USER}@${DROPLET_IP} << 'ENDSSH'
cd /root/transcription-system

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

# Backend setup
echo "Setting up backend..."
cd backend
npm install --production
npm run build

# Frontend setup
echo "Setting up frontend..."
cd ../frontend/main-app
npm install --production
npm run build

# Restart services with PM2
echo "Restarting services..."
pm2 restart transcription-backend
pm2 restart transcription-frontend
pm2 save

# Show status
pm2 status

echo "✅ Deployment complete!"
ENDSSH

check_status "Remote deployment"

echo -e "${GREEN}🎉 Synchronization complete!${NC}"
echo -e "Your app is now live at: http://${DROPLET_IP}"