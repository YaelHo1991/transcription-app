#!/bin/bash

echo "================================================"
echo "Digital Ocean Frontend Deployment (Dev Mode)"
echo "================================================"

# Deploy and run frontend in development mode to bypass build issues
ssh root@146.190.57.51 << 'REMOTE_SCRIPT'
set -e

echo "Deploying frontend in development mode..."

cd /var/app/transcription-system/transcription-system

# Pull latest code
echo "Pulling latest code..."
git pull

# Navigate to frontend
cd frontend/main-app

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Stop existing frontend
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true

# Create environment file for production URL
cat > .env.production.local << 'ENV'
NEXT_PUBLIC_API_URL=http://yalitranscription.duckdns.org
NODE_ENV=production
ENV

# Start frontend in development mode (which works)
echo "Starting frontend in dev mode with PM2..."
pm2 start npm --name "frontend" -- run dev

# Wait for startup
sleep 10

# Check status
pm2 status frontend

echo ""
echo "✅ Frontend deployed in development mode!"
echo "This is a temporary solution while we fix the production build issues."
echo ""
echo "Access the site at:"
echo "  - Main: http://yalitranscription.duckdns.org"
echo "  - Login: http://yalitranscription.duckdns.org/login"
echo "  - Dev Portal: http://yalitranscription.duckdns.org/dev"
echo "  - Licenses: http://yalitranscription.duckdns.org/licenses"

REMOTE_SCRIPT

echo "================================================"
echo "Deployment Complete!"
echo "================================================"