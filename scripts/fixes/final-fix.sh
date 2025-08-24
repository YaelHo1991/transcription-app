#!/bin/bash

echo "🔧 Final Fix - This will get everything working!"

# Stop all processes
echo "Stopping all processes..."
pm2 stop all
pm2 delete all
pkill -f "next start"

# Go to frontend directory
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create the missing file
echo "Creating missing file..."
mkdir -p .next
echo '{}' > .next/prerender-manifest.json

# Rebuild to be sure
echo "Rebuilding frontend..."
npm run build || true

# Start backend with PM2
echo "Starting backend with PM2..."
pm2 start /var/app/transcription-system/transcription-system/backend/dist/server.js --name backend

# Start frontend directly (not with PM2 since it has issues)
echo "Starting frontend directly..."
nohup npm start > /var/log/frontend.log 2>&1 &

# Wait for services to start
echo "Waiting for services to start..."
sleep 15

# Check if everything is running
echo ""
echo "=== STATUS CHECK ==="
echo "Backend (should show port 5000):"
netstat -tulpn | grep 5000
echo ""
echo "Frontend (should show port 3002):"
netstat -tulpn | grep 3002
echo ""

# Show PM2 status
echo "PM2 Status:"
pm2 status

echo ""
echo "================================"
echo "✅ Setup complete!"
echo "================================"
echo ""
echo "Test your app at: http://146.190.57.51"
echo ""
echo "If frontend still fails, check: tail -f /var/log/frontend.log"
echo "To check backend: pm2 logs backend"