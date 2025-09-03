#!/bin/bash

echo "================================================"
echo "Digital Ocean Frontend Deployment Script"
echo "================================================"

# Configuration
REMOTE_HOST="root@146.190.57.51"
REMOTE_PATH="/var/app/transcription-system"
LOCAL_PATH="transcription-system"

echo ""
echo "Step 1: Building frontend locally first..."
echo "-------------------------------------------"
cd "$LOCAL_PATH/frontend/main-app"

# Clean previous build
rm -rf .next

# Build with production settings
echo "Building Next.js application..."
NEXT_PUBLIC_API_URL="http://yalitranscription.duckdns.org:5000" npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed locally. Fixing common issues..."
    
    # Try to fix common build issues
    npm install --legacy-peer-deps
    
    # Retry build
    NEXT_PUBLIC_API_URL="http://yalitranscription.duckdns.org:5000" npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build still failing. Please check the errors above."
        exit 1
    fi
fi

echo "✅ Local build successful!"

echo ""
echo "Step 2: Syncing to Digital Ocean..."
echo "-------------------------------------------"

# Go back to project root
cd ../../..

# Sync entire project
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude 'dist' \
    --exclude '.next' \
    "$LOCAL_PATH/" "$REMOTE_HOST:$REMOTE_PATH/"

echo ""
echo "Step 3: Deploying on Digital Ocean..."
echo "-------------------------------------------"

ssh "$REMOTE_HOST" << 'REMOTE_SCRIPT'
set -e

echo "Connected to Digital Ocean droplet..."

# Navigate to frontend directory
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create production environment file
cat > .env.production << 'ENV'
NEXT_PUBLIC_API_URL=http://yalitranscription.duckdns.org:5000
NODE_ENV=production
ENV

echo "✅ Environment configured"

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps --production=false

# Build the application
echo "Building Next.js application on server..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed on server. Checking for issues..."
    
    # Check if .next directory exists
    if [ ! -d ".next" ]; then
        echo "❌ .next directory not created"
    fi
    
    # Try alternative build approach
    echo "Trying alternative build..."
    npx next build
fi

# Check if build was successful
if [ -f ".next/BUILD_ID" ]; then
    echo "✅ Build successful! BUILD_ID: $(cat .next/BUILD_ID)"
else
    echo "⚠️ Build may have issues - BUILD_ID not found"
fi

# Stop existing frontend process
echo "Stopping existing frontend process..."
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true

# Start frontend with PM2
echo "Starting frontend with PM2..."
pm2 start npm --name "frontend" -- start

# Wait for startup
sleep 5

# Check if frontend is running
pm2 status frontend

# Check logs for errors
echo ""
echo "Recent frontend logs:"
pm2 logs frontend --lines 20 --nostream

# Test if frontend is responding
echo ""
echo "Testing frontend response..."
curl -I http://localhost:3002 2>/dev/null | head -n 1

# Restart nginx to ensure proper routing
echo "Restarting nginx..."
systemctl restart nginx

echo ""
echo "✅ Frontend deployment complete!"

REMOTE_SCRIPT

echo ""
echo "================================================"
echo "Deployment Summary"
echo "================================================"
echo "Frontend: http://yalitranscription.duckdns.org"
echo "Backend API: http://yalitranscription.duckdns.org/api"
echo "Dev Portal: http://yalitranscription.duckdns.org/dev"
echo ""
echo "To check status:"
echo "  ssh $REMOTE_HOST 'pm2 status'"
echo ""
echo "To view logs:"
echo "  ssh $REMOTE_HOST 'pm2 logs frontend --lines 50'"
echo "================================================"