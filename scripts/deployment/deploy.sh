#!/bin/bash

# Deployment Script for Digital Ocean Droplet
# Usage: ./deploy.sh

echo "🚀 Starting deployment to Digital Ocean..."

# Configuration
DROPLET_IP="YOUR_DROPLET_IP"
DROPLET_USER="root"
APP_PATH="/var/app/transcription-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Building frontend...${NC}"
cd transcription-system/frontend/main-app
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Building backend...${NC}"
cd ../../backend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

cd ../../..

echo -e "${YELLOW}📤 Uploading files to droplet...${NC}"
# Upload built files
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'user_data' \
           --exclude '.env.development' \
           --exclude '.env.local' \
           ./transcription-system/ ${DROPLET_USER}@${DROPLET_IP}:${APP_PATH}/

echo -e "${YELLOW}🔧 Installing dependencies on droplet...${NC}"
ssh ${DROPLET_USER}@${DROPLET_IP} << 'ENDSSH'
cd /var/app/transcription-system/backend
npm ci --production

cd ../frontend/main-app
npm ci --production

# Restart services with PM2
pm2 reload ecosystem.config.js --env production
pm2 save
ENDSSH

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "Your app should be available at: http://${DROPLET_IP}:3002"
echo -e "API endpoint: http://${DROPLET_IP}:5000"