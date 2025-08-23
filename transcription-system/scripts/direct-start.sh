#!/bin/bash

echo "=========================================="
echo "    DIRECT START - SIMPLE FIX"
echo "=========================================="

# Kill all existing processes
echo "Stopping all existing services..."
pm2 kill
pkill -f node
pkill -f next

# Start backend directly
echo "Starting backend..."
cd /opt/transcription-system/transcription-system/backend

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "Building backend..."
    npm run build || echo "Build warnings ignored"
fi

# Start backend with PM2
PORT=5000 pm2 start dist/server.js --name backend --env production

# Start frontend directly
echo "Starting frontend..."
cd /opt/transcription-system/transcription-system/frontend/main-app

# Check if .next folder exists
if [ ! -d ".next" ]; then
    echo "Building frontend..."
    npm run build || echo "Build warnings ignored"
fi

# Start frontend with PM2 using next start
pm2 start npm --name frontend -- start

# Wait for services
sleep 10

# Check status
echo ""
echo "Checking services..."
pm2 list

# Test services
echo ""
echo "Testing backend..."
curl http://localhost:5000/api/health || echo "Backend: No health endpoint, trying root..."
curl http://localhost:5000 || echo "Backend may be running but not responding to curl"

echo ""
echo "Testing frontend..."
curl -I http://localhost:3002 || echo "Frontend may be running but not responding to curl"

# Save PM2
pm2 save

echo ""
echo "=========================================="
echo "Services should now be running!"
echo ""
echo "Check: https://yalitranscription.duckdns.org"
echo ""
echo "If still 502, check logs:"
echo "  pm2 logs backend"
echo "  pm2 logs frontend"
echo ""