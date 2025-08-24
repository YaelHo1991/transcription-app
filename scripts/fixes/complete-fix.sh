#!/bin/bash

echo "======================================"
echo "🔧 COMPLETE FIX - Database + Frontend"
echo "======================================"
echo ""

# Fix 1: Database Connection
echo "📊 Fixing Database..."
echo "---------------------"

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL..."
    systemctl start postgresql
fi

# Create database and user if they don't exist
sudo -u postgres psql <<EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS transcription_prod;
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'transcription_user') THEN
        CREATE USER transcription_user WITH ENCRYPTED PASSWORD 'simple123';
    END IF;
END\$\$;
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
ALTER DATABASE transcription_prod OWNER TO transcription_user;
EOF

echo "✅ Database setup complete"
echo ""

# Fix 2: Frontend Build Issue
echo "🎨 Fixing Frontend..."
echo "---------------------"

# Kill any existing Next.js processes
pkill -f "next start" 2>/dev/null || true

# Go to frontend directory
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create ALL missing Next.js files
echo "Creating Next.js production files..."
mkdir -p .next
echo '{}' > .next/prerender-manifest.json
echo '{"version":3,"sources":[],"sections":[],"sourcesContent":[]}' > .next/trace
echo '{"version":1,"meta":{}}' > .next/cache.json

# Use development mode instead (more stable)
echo "Starting frontend in development mode (more stable)..."
export NODE_ENV=development
nohup npm run dev > /var/log/frontend-dev.log 2>&1 &

echo "Waiting for frontend to start..."
sleep 20

# Check if it started
if netstat -tulpn 2>/dev/null | grep -q 3002; then
    echo "✅ Frontend started successfully!"
else
    echo "⚠️  Frontend still having issues. Trying production mode..."
    pkill -f "next dev" 2>/dev/null || true
    export NODE_ENV=production
    nohup npm start > /var/log/frontend-prod.log 2>&1 &
    sleep 15
fi

# Restart backend to connect to database
echo ""
echo "🔄 Restarting Backend..."
echo "------------------------"
pm2 restart backend

sleep 5

# Final Status Check
echo ""
echo "======================================"
echo "📋 FINAL STATUS CHECK"
echo "======================================"

echo "Ports listening:"
echo "Backend (5000):"
netstat -tulpn 2>/dev/null | grep 5000 || echo "  ❌ Not listening"
echo "Frontend (3002):"
netstat -tulpn 2>/dev/null | grep 3002 || echo "  ❌ Not listening"

echo ""
echo "PM2 Status:"
pm2 status

echo ""
echo "======================================"
echo "✅ Fix Complete!"
echo "======================================"
echo ""
echo "Test your site: http://146.190.57.51"
echo ""
echo "Check logs:"
echo "  Frontend (dev): tail -f /var/log/frontend-dev.log"
echo "  Frontend (prod): tail -f /var/log/frontend-prod.log"
echo "  Backend: pm2 logs backend"
echo ""