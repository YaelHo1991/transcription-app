#!/bin/bash

echo "================================================"
echo "Fast Backend Deployment to Production"
echo "================================================"

# Configuration
REMOTE_HOST="root@146.190.57.51"
REMOTE_PATH="/var/app/transcription-system"
LOCAL_PATH="transcription-system"

echo ""
echo "Step 1: Building backend locally..."
echo "-------------------------------------------"
cd "$LOCAL_PATH/backend"

# Build TypeScript
echo "Building TypeScript code..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed. Please check the errors above."
    exit 1
fi

echo "✅ Backend build successful!"

echo ""
echo "Step 2: Syncing backend to Digital Ocean..."
echo "-------------------------------------------"

# Go back to project root
cd ../..

# Sync only the backend folder
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude 'user_data' \
    "$LOCAL_PATH/backend/" "$REMOTE_HOST:$REMOTE_PATH/transcription-system/backend/"

echo ""
echo "Step 3: Setting up and starting backend on production..."
echo "-------------------------------------------"

ssh "$REMOTE_HOST" << 'REMOTE_SCRIPT'
set -e

echo "Connected to production server..."

# Navigate to backend directory
cd /var/app/transcription-system/transcription-system/backend

# Create production environment file
cat > .env << 'ENV'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=simple123
DB_SSL=false
FRONTEND_URL=http://yalitranscription.duckdns.org
ALLOWED_ORIGINS=http://yalitranscription.duckdns.org,http://localhost:3002,http://146.190.57.51:3002
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
ENV

echo "✅ Environment configured for production"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install --production
fi

# Stop existing backend process
echo "Stopping existing backend process..."
pm2 stop backend 2>/dev/null || true
pm2 delete backend 2>/dev/null || true

# Start backend with PM2 in production mode
echo "Starting backend with PM2..."
pm2 start dist/server.js --name backend

# Save PM2 configuration
pm2 save

# Wait for startup
sleep 5

# Check if backend is running
echo ""
echo "Checking backend status..."
pm2 status backend

# Test if backend is responding
echo ""
echo "Testing backend API response..."
curl -s -o /dev/null -w "Backend API Response: %{http_code}\n" http://localhost:5000/api/health || echo "Backend may still be starting up..."

echo ""
echo "✅ Backend deployment complete!"

REMOTE_SCRIPT

echo ""
echo "================================================"
echo "Backend Deployment Summary"
echo "================================================"
echo "✓ Backend built locally"
echo "✓ Code synced to production server"
echo "✓ Backend running with PM2"
echo ""
echo "Backend API: http://yalitranscription.duckdns.org:5000"
echo ""
echo "To check status:"
echo "  ssh $REMOTE_HOST 'pm2 status'"
echo ""
echo "To view backend logs:"
echo "  ssh $REMOTE_HOST 'pm2 logs backend --lines 50'"
echo "================================================"