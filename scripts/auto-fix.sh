#!/bin/bash

# ============================================
# AUTO-FIX SCRIPT - FIXES COMMON PROBLEMS
# ============================================
# This script automatically fixes the most common issues
# ============================================

echo "============================================"
echo "🔧 AUTO-FIX SCRIPT STARTING"
echo "============================================"
echo ""

REPORT_FILE="/root/autofix-report.txt"
echo "=== AUTO-FIX REPORT ===" > $REPORT_FILE
echo "Time: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Function to add to report
report() {
    echo "$1" | tee -a $REPORT_FILE
}

# Function to fix and report
fix_issue() {
    local description="$1"
    local fix_command="$2"
    
    report "🔧 Fixing: $description"
    if eval "$fix_command" >> $REPORT_FILE 2>&1; then
        report "✅ Fixed: $description"
    else
        report "⚠️ Could not fix: $description"
    fi
    echo "" >> $REPORT_FILE
}

report "=== DETECTING ISSUES ==="

# Issue 1: Port 3002 in use
if lsof -i :3002 | grep -q LISTEN; then
    report "❌ Issue found: Port 3002 is in use"
    fix_issue "Killing processes on port 3002" "pkill -f 'next' && sleep 2"
fi

# Issue 2: Frontend not running
if ! pm2 list | grep -q "frontend.*online"; then
    report "❌ Issue found: Frontend not running"
    cd /var/app/transcription-system/transcription-system/frontend/main-app
    fix_issue "Starting frontend" "pm2 start npm --name frontend -- run dev"
fi

# Issue 3: Backend not running
if ! pm2 list | grep -q "backend.*online"; then
    report "❌ Issue found: Backend not running"
    cd /var/app/transcription-system/transcription-system/backend
    fix_issue "Starting backend" "pm2 start dist/server.js --name backend"
fi

# Issue 4: Frontend restarting loop
FRONTEND_RESTARTS=$(pm2 describe frontend 2>/dev/null | grep restart | awk '{print $4}' || echo "0")
if [ "$FRONTEND_RESTARTS" -gt "10" ]; then
    report "❌ Issue found: Frontend restart loop (restarted $FRONTEND_RESTARTS times)"
    fix_issue "Resetting frontend" "pm2 delete frontend && pkill -f 'next' && sleep 2 && cd /var/app/transcription-system/transcription-system/frontend/main-app && pm2 start npm --name frontend -- run dev"
fi

# Issue 5: Missing environment variables
ENV_FILE="/var/app/transcription-system/transcription-system/frontend/main-app/.env.local"
if [ ! -f "$ENV_FILE" ] || ! grep -q "NEXT_PUBLIC_API_BASE_URL" "$ENV_FILE"; then
    report "❌ Issue found: Missing or incorrect environment variables"
    cd /var/app/transcription-system/transcription-system/frontend/main-app
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF
    report "✅ Fixed: Environment variables created"
    fix_issue "Restarting frontend with new environment" "pm2 restart frontend --update-env"
fi

# Issue 6: Nginx not configured correctly
if ! curl -s http://146.190.57.51/api/health | grep -q "success" && curl -s http://localhost:5000/api/health | grep -q "success"; then
    report "❌ Issue found: Nginx not forwarding to backend"
    fix_issue "Reloading Nginx" "nginx -t && systemctl reload nginx"
fi

# Issue 7: Git out of sync
cd /var/app/transcription-system
LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
REMOTE_HASH=$(git ls-remote origin main | awk '{print $1}')
if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    report "❌ Issue found: Code out of sync with Git"
    fix_issue "Pulling latest code" "git pull origin main"
    fix_issue "Restarting services" "pm2 restart all"
fi

sleep 5

# Final check
report "=== FINAL STATUS CHECK ==="
echo "" >> $REPORT_FILE

# Check if everything is working now
ALL_GOOD=true

if ! pm2 list | grep -q "backend.*online"; then
    report "❌ Backend still not running"
    ALL_GOOD=false
else
    report "✅ Backend is running"
fi

if ! pm2 list | grep -q "frontend.*online"; then
    report "❌ Frontend still not running"
    ALL_GOOD=false
else
    report "✅ Frontend is running"
fi

if ! curl -s http://localhost:5000/api/health | grep -q "success"; then
    report "❌ Backend API still not responding"
    ALL_GOOD=false
else
    report "✅ Backend API is responding"
fi

if ! curl -s http://146.190.57.51 > /dev/null 2>&1; then
    report "❌ Site still not accessible"
    ALL_GOOD=false
else
    report "✅ Site is accessible"
fi

echo "" >> $REPORT_FILE

if [ "$ALL_GOOD" = true ]; then
    report "=== ✅ ALL ISSUES FIXED! ==="
    report "Your site should now be working at:"
    report "http://146.190.57.51/"
else
    report "=== ⚠️ SOME ISSUES REMAIN ==="
    report "Please copy this report to Claude for further assistance"
fi

echo "" >> $REPORT_FILE
echo "=== END OF AUTO-FIX REPORT ===" >> $REPORT_FILE

# Display report
echo ""
echo "============================================"
echo "📋 COPY THIS REPORT TO CLAUDE:"
echo "============================================"
echo ""
cat $REPORT_FILE
echo ""
echo "============================================"
echo "✅ Auto-fix complete! Copy everything above"
echo "============================================"