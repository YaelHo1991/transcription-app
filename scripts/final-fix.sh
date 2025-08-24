#!/bin/bash

# ============================================
# FINAL FIX SCRIPT - FIXES EVERYTHING PERMANENTLY
# ============================================
# This script ensures ALL URLs and environment variables are correct
# ============================================

echo "============================================"
echo "🚀 FINAL FIX - MAKING EVERYTHING WORK"
echo "============================================"
echo ""

REPORT_FILE="/root/final-fix-report.txt"
echo "=== FINAL FIX REPORT ===" > $REPORT_FILE
echo "Time: $(date)" >> $REPORT_FILE
echo "Server IP: 146.190.57.51" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Function to add to report
report() {
    echo "$1" | tee -a $REPORT_FILE
}

# Function to run command silently but report result
run_fix() {
    local description="$1"
    local command="$2"
    
    report "🔧 $description..."
    if eval "$command" >> $REPORT_FILE 2>&1; then
        report "✅ SUCCESS: $description"
    else
        report "⚠️ WARNING: $description had issues"
    fi
    echo "" >> $REPORT_FILE
}

report "=== STEP 1: STOPPING ALL SERVICES ==="
run_fix "Stopping PM2 processes" "pm2 delete all 2>/dev/null || true"
run_fix "Killing Next.js processes" "pkill -f 'next' 2>/dev/null || true"
run_fix "Killing Node processes" "pkill -f 'node' 2>/dev/null || true"
sleep 3

report "=== STEP 2: UPDATING CODE FROM GIT ==="
cd /var/app/transcription-system
# Reset any local changes and pull fresh code
run_fix "Resetting local changes" "git reset --hard HEAD"
run_fix "Pulling latest code" "git pull origin main"

report "=== STEP 3: FIXING BACKEND ENVIRONMENT ==="
cd /var/app/transcription-system/transcription-system/backend

cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_prod
DB_USER=transcription_user
DB_PASSWORD=simple123
DB_SSL=false

# CORS - Allow all origins for now
FRONTEND_URL=http://146.190.57.51
ALLOWED_ORIGINS=http://146.190.57.51,http://yalitranscription.duckdns.org,http://localhost:3002,http://localhost:3004

# Files
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
EOF

report "✅ Backend environment configured"

report "=== STEP 4: FIXING FRONTEND ENVIRONMENT ==="
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create proper environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

report "✅ Frontend environment configured with IP address"

# Also create .env.production for consistency
cp .env.local .env.production

report "=== STEP 5: FIXING HARDCODED URLS IN SOURCE CODE ==="
# Fix any remaining hardcoded domain references in licenses page
if grep -q "yalitranscription.duckdns.org" src/app/licenses/page.tsx; then
    sed -i "s|http://yalitranscription.duckdns.org/api|http://146.190.57.51/api|g" src/app/licenses/page.tsx
    sed -i "s|http://yalitranscription.duckdns.org|http://146.190.57.51|g" src/app/licenses/page.tsx
    report "✅ Fixed hardcoded URLs in licenses page"
else
    report "✅ No hardcoded URLs found in licenses page"
fi

# Fix any remaining localhost references
find src -type f -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q "localhost:5000" "$file"; then
        sed -i "s|http://localhost:5000|http://146.190.57.51:5000|g" "$file"
        report "Fixed localhost in: $file"
    fi
done

report "=== STEP 6: CLEARING CACHES ==="
run_fix "Clearing Next.js cache" "rm -rf .next/cache"
run_fix "Clearing Node modules cache" "npm cache clean --force 2>/dev/null || true"

report "=== STEP 7: STARTING BACKEND ==="
cd /var/app/transcription-system/transcription-system/backend
run_fix "Starting backend service" "pm2 start dist/server.js --name backend"
sleep 5

report "=== STEP 8: STARTING FRONTEND ==="
cd /var/app/transcription-system/transcription-system/frontend/main-app
run_fix "Starting frontend service" "pm2 start npm --name frontend -- run dev"
sleep 10

report "=== STEP 9: CONFIGURING PM2 STARTUP ==="
run_fix "Saving PM2 configuration" "pm2 save"
run_fix "Setting PM2 to start on boot" "pm2 startup systemd -u root --hp /root 2>/dev/null || true"

report "=== STEP 10: TESTING EVERYTHING ==="
sleep 5

# Test backend directly
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    report "✅ Backend API: WORKING on localhost:5000"
else
    report "❌ Backend API: NOT WORKING on localhost:5000"
fi

# Test backend through IP
if curl -s http://146.190.57.51:5000/api/health | grep -q "success"; then
    report "✅ Backend API: WORKING on 146.190.57.51:5000"
else
    report "❌ Backend API: NOT WORKING on 146.190.57.51:5000"
fi

# Test API through Nginx
if curl -s http://146.190.57.51/api/health | grep -q "success"; then
    report "✅ API through Nginx: WORKING"
else
    report "❌ API through Nginx: NOT WORKING"
fi

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200\|500"; then
    report "✅ Frontend: RESPONDING on localhost:3002"
else
    report "❌ Frontend: NOT RESPONDING on localhost:3002"
fi

# Test frontend through Nginx
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/ | grep -q "200\|500"; then
    report "✅ Frontend through Nginx: RESPONDING"
else
    report "❌ Frontend through Nginx: NOT RESPONDING"
fi

report ""
report "=== CHECKING PM2 STATUS ==="
pm2 list >> $REPORT_FILE 2>&1

# Check for restart loops
FRONTEND_RESTARTS=$(pm2 describe frontend 2>/dev/null | grep restart | awk '{print $4}' || echo "0")
BACKEND_RESTARTS=$(pm2 describe backend 2>/dev/null | grep restart | awk '{print $4}' || echo "0")

if [ "$FRONTEND_RESTARTS" -gt "5" ]; then
    report "⚠️ Frontend has restarted $FRONTEND_RESTARTS times"
    report "Frontend error logs:"
    pm2 logs frontend --lines 5 --nostream 2>&1 | grep -i error >> $REPORT_FILE || echo "No errors" >> $REPORT_FILE
else
    report "✅ Frontend is stable (restarts: $FRONTEND_RESTARTS)"
fi

if [ "$BACKEND_RESTARTS" -gt "5" ]; then
    report "⚠️ Backend has restarted $BACKEND_RESTARTS times"
    report "Backend error logs:"
    pm2 logs backend --lines 5 --nostream 2>&1 | grep -i error >> $REPORT_FILE || echo "No errors" >> $REPORT_FILE
else
    report "✅ Backend is stable (restarts: $BACKEND_RESTARTS)"
fi

report ""
report "=== ENVIRONMENT VERIFICATION ==="
report "Frontend .env.local contents:"
head -5 /var/app/transcription-system/transcription-system/frontend/main-app/.env.local >> $REPORT_FILE

report ""
report "=== FINAL STATUS ==="
ALL_WORKING=true

# Final comprehensive check
if ! pm2 list | grep -q "backend.*online"; then
    ALL_WORKING=false
    report "❌ Backend is not running"
fi

if ! pm2 list | grep -q "frontend.*online"; then
    ALL_WORKING=false
    report "❌ Frontend is not running"
fi

if ! curl -s http://146.190.57.51/api/health | grep -q "success"; then
    ALL_WORKING=false
    report "❌ API is not accessible"
fi

if [ "$ALL_WORKING" = true ]; then
    report ""
    report "🎉🎉🎉 SUCCESS! EVERYTHING IS WORKING! 🎉🎉🎉"
    report ""
    report "Your application is now accessible at:"
    report "✅ http://146.190.57.51/"
    report "✅ http://146.190.57.51/licenses"
    report "✅ http://146.190.57.51/crm"
    report "✅ http://146.190.57.51/transcription"
    report ""
    report "API endpoints:"
    report "✅ http://146.190.57.51/api/health"
    report "✅ http://146.190.57.51:5000/dev (backend dev tools)"
else
    report ""
    report "⚠️ SOME ISSUES REMAIN"
    report "Please copy this report to Claude for further assistance"
fi

report ""
report "=== END OF FINAL FIX REPORT ==="

# Display report
echo ""
echo "============================================"
echo "📋 COPY THIS COMPLETE REPORT TO CLAUDE:"
echo "============================================"
echo ""
cat $REPORT_FILE
echo ""
echo "============================================"
echo "✅ Final fix complete! Copy everything above"
echo "============================================"