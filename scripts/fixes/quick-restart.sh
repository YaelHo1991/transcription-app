#!/bin/bash

echo "======================================" 
echo "🚀 QUICK RESTART SCRIPT"
echo "======================================" 
echo ""

# Show current PM2 processes
echo "Current PM2 processes:"
pm2 list
echo ""

# Try to restart or start frontend
echo "Starting frontend service..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Check if frontend is in PM2
if pm2 describe frontend > /dev/null 2>&1; then
    echo "Frontend found in PM2, restarting..."
    pm2 restart frontend --update-env
else
    echo "Frontend not in PM2, starting fresh..."
    pm2 start npm --name frontend -- run dev
fi

echo ""
echo "✅ Frontend restarted/started"
echo ""

# Check backend
if pm2 describe backend > /dev/null 2>&1; then
    echo "Backend is running"
else
    echo "Starting backend..."
    cd /var/app/transcription-system/transcription-system/backend
    pm2 start dist/server.js --name backend
fi

echo ""
echo "======================================" 
echo "📊 FINAL STATUS"
echo "======================================" 
pm2 list
echo ""
echo "Your app is at: http://146.190.57.51/"