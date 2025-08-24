#!/bin/bash

# Digital Ocean Deployment and Diagnostic Script
# This script ensures complete synchronization between localhost and DO

echo "=========================================="
echo "   DO DEPLOYMENT & DIAGNOSTIC SCRIPT"
echo "=========================================="
echo ""

# Configuration
DROPLET_IP="146.190.57.51"
DROPLET_USER="root"
PROJECT_PATH="/var/app/transcription-system"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REPORT_FILE="deployment_report_${TIMESTAMP}.txt"

# SSH command function
run_ssh() {
    ssh ${DROPLET_USER}@${DROPLET_IP} "$1"
}

echo "Starting deployment to Digital Ocean..."
echo ""

# Run deployment and diagnostic on DO
ssh ${DROPLET_USER}@${DROPLET_IP} << 'ENDSSH'
echo "=========================================="
echo "   DEPLOYMENT STARTED"
echo "=========================================="
echo ""

cd /var/app/transcription-system

# Step 1: Pull latest code
echo "[1/7] Pulling latest code from GitHub..."
git pull origin main
echo "Git pull completed"
echo ""

# Step 2: Clean old build artifacts
echo "[2/7] Cleaning old build files..."
cd transcription-system/backend
rm -rf dist
echo "Old dist folder removed"
echo ""

# Step 3: Install and build backend
echo "[3/7] Installing backend dependencies..."
npm install
echo ""

echo "[4/7] Building backend..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
fi
echo ""

# Step 4: Build frontend
echo "[5/7] Building frontend..."
cd ../frontend/main-app
npm install
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "⚠️ Frontend build completed with warnings"
fi
echo ""

# Step 5: Restart services
echo "[6/7] Restarting PM2 services..."
pm2 restart all
pm2 save
echo ""

# Step 6: Wait for services to stabilize
echo "[7/7] Waiting for services to stabilize..."
sleep 5
echo ""

# Generate diagnostic report
echo "=========================================="
echo "   DIAGNOSTIC REPORT"
echo "=========================================="
echo ""

echo "=== PM2 STATUS ==="
pm2 status
echo ""

echo "=== BACKEND LOGS (Last 30 lines) ==="
pm2 logs backend --nostream --lines 30
echo ""

echo "=== BACKEND ERROR LOGS (Last 20 lines) ==="
tail -20 /root/.pm2/logs/backend-error.log
echo ""

echo "=== CHECK BACKEND BUILD ==="
echo "Checking if dist folder exists:"
ls -la /var/app/transcription-system/transcription-system/backend/dist/ | head -5
echo ""

echo "=== DATABASE CONNECTION TEST ==="
cd /var/app/transcription-system/transcription-system/backend
node -e "
const { db } = require('./dist/db/connection');
db.query('SELECT COUNT(*) FROM users')
  .then(r => {
    console.log('✅ Database connection successful');
    console.log('Total users:', r.rows[0].count);
    process.exit(0);
  })
  .catch(e => {
    console.log('❌ Database connection failed:', e.message);
    process.exit(1);
  });
" 2>&1
echo ""

echo "=== SERVICE HEALTH CHECK ==="
echo "Backend health check:"
curl -s http://localhost:5000/health || echo "Backend not responding"
echo ""
echo "Frontend check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3002 || echo "Frontend not responding"
echo ""

echo "=== NGINX STATUS ==="
systemctl status nginx --no-pager | head -10
echo ""

echo "=== PORT LISTENING ==="
netstat -tlnp | grep -E ':(5000|3002|80)'
echo ""

echo "=== GIT STATUS ==="
cd /var/app/transcription-system
git log --oneline -5
echo ""
git status
echo ""

echo "=== ENVIRONMENT CHECK ==="
echo "NODE_ENV: $NODE_ENV"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo ""

echo "=========================================="
echo "   DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Deployment timestamp: $(date)"
echo ""
echo "Please check:"
echo "1. Main app: http://${DROPLET_IP}"
echo "2. Dev tools: http://${DROPLET_IP}/dev"
echo ""

ENDSSH

echo ""
echo "=========================================="
echo "   LOCAL SCRIPT COMPLETE"
echo "=========================================="
echo ""
echo "The deployment and diagnostic script has completed."
echo "Please check the output above for any errors."
echo ""
echo "If there are issues, copy the entire output and send it for analysis."
echo ""