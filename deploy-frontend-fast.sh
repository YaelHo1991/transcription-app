#!/bin/bash

echo "================================================"
echo "Fast Frontend Deployment (Production Optimized)"
echo "================================================"

# Configuration
REMOTE_HOST="root@146.190.57.51"
REMOTE_PATH="/var/app/transcription-system"
LOCAL_PATH="transcription-system"

echo ""
echo "Step 1: Building frontend locally with production optimizations..."
echo "-------------------------------------------"
cd "$LOCAL_PATH/frontend/main-app"

# Clean previous build
rm -rf .next

# Build with production settings and optimizations
echo "Building Next.js application with production mode..."
NODE_ENV=production NEXT_PUBLIC_API_URL="http://yalitranscription.duckdns.org:5000" npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Local build successful!"

echo ""
echo "Step 2: Syncing optimized build to Digital Ocean..."
echo "-------------------------------------------"

# Go back to project root
cd ../../..

# Sync entire project including the built .next folder
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude 'dist' \
    "$LOCAL_PATH/" "$REMOTE_HOST:$REMOTE_PATH/"

echo ""
echo "Step 3: Restarting frontend on Digital Ocean..."
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

echo "✅ Environment configured for production"

# Stop existing frontend process
echo "Stopping existing frontend process..."
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true

# Start frontend with PM2 in production mode
echo "Starting frontend with PM2 in production mode..."
NODE_ENV=production pm2 start npm --name "frontend" -- start

# Save PM2 configuration
pm2 save

# Wait for startup
sleep 5

# Check if frontend is running
echo ""
echo "Checking frontend status..."
pm2 status frontend

# Test if frontend is responding
echo ""
echo "Testing frontend response..."
curl -s -o /dev/null -w "Response: %{http_code}\n" http://localhost:3002 || echo "Frontend may still be starting up..."

# Restart nginx to ensure proper routing
echo "Restarting nginx..."
systemctl restart nginx

echo ""
echo "✅ Frontend deployment complete!"

REMOTE_SCRIPT

echo ""
echo "================================================"
echo "Fast Deployment Summary"
echo "================================================"
echo "✓ Production build created locally"
echo "✓ Optimized bundle synced to server"
echo "✓ Frontend running in production mode"
echo ""
echo "Frontend: http://yalitranscription.duckdns.org"
echo "Backend API: http://yalitranscription.duckdns.org/api"
echo ""
echo "To check status:"
echo "  ssh $REMOTE_HOST 'pm2 status'"
echo ""
echo "To view logs:"
echo "  ssh $REMOTE_HOST 'pm2 logs frontend --lines 50'"
echo "================================================"