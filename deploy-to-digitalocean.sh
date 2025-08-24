#!/bin/bash

# ========================================
# Deployment Script for DigitalOcean
# ========================================
# This script deploys your transcription system to DigitalOcean
# Run this script on your DigitalOcean droplet after pulling the latest changes

echo "🚀 Starting deployment to DigitalOcean..."
echo "=========================================="

# Exit on any error
set -e

# Configuration
DROPLET_IP="146.190.57.51"
FRONTEND_DIR="/root/transcription-app/transcription-system/frontend/main-app"
BACKEND_DIR="/root/transcription-app/transcription-system/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Step 1: Pulling latest changes from Git${NC}"
cd /root/transcription-app
git pull origin main

echo -e "${YELLOW}📦 Step 2: Installing backend dependencies${NC}"
cd $BACKEND_DIR
npm install

echo -e "${YELLOW}📦 Step 3: Installing frontend dependencies${NC}"
cd $FRONTEND_DIR
npm install

echo -e "${YELLOW}🔧 Step 4: Setting up environment variables${NC}"
# Frontend .env.production
cat > $FRONTEND_DIR/.env.production << EOF
NEXT_PUBLIC_API_BASE_URL=http://${DROPLET_IP}:5000
NEXT_PUBLIC_API_URL=http://${DROPLET_IP}:5000/api
NEXT_PUBLIC_APP_URL=http://${DROPLET_IP}:3002
NODE_ENV=production
EOF

# Backend .env
cat > $BACKEND_DIR/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://transcription_user:transcription_pass@localhost:5432/transcription_system
JWT_SECRET=your-secret-key-here-change-in-production
CORS_ORIGIN=http://${DROPLET_IP}:3002
EOF

echo -e "${YELLOW}🏗️ Step 5: Building frontend for production${NC}"
cd $FRONTEND_DIR
npm run build

echo -e "${YELLOW}🔄 Step 6: Restarting services with PM2${NC}"
# Stop all existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start backend
cd $BACKEND_DIR
pm2 start npm --name "backend" -- start

# Start frontend
cd $FRONTEND_DIR
pm2 start npm --name "frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}📊 Step 7: Checking service status${NC}"
pm2 status

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Your application is now available at:"
echo -e "${GREEN}Frontend: http://${DROPLET_IP}:3002${NC}"
echo -e "${GREEN}Backend API: http://${DROPLET_IP}:5000${NC}"
echo ""
echo "To check logs:"
echo "  pm2 logs frontend"
echo "  pm2 logs backend"
echo ""
echo "To monitor:"
echo "  pm2 monit"