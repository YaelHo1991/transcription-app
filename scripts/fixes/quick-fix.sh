#!/bin/bash

echo "🔧 Quick Fix - Getting your app running!"

# Stop everything first
pm2 stop all
pm2 delete all

# Start backend with PM2 (it works)
echo "Starting backend..."
pm2 start /var/app/transcription-system/transcription-system/backend/dist/server.js --name backend -i 1

# Run frontend directly (simpler)
echo "Starting frontend..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Kill any existing Next.js process
pkill -f "next start" || true

# Start frontend in background
nohup npm start > /var/log/frontend.log 2>&1 &

# Wait for it to start
sleep 10

# Check if everything is running
echo ""
echo "Checking services..."
echo "Backend:"
netstat -tulpn | grep 5000
echo "Frontend:"
netstat -tulpn | grep 3002

echo ""
echo "✅ Done! Try accessing http://146.190.57.51"
echo ""
echo "To check frontend logs: tail -f /var/log/frontend.log"
echo "To check backend: pm2 logs backend"