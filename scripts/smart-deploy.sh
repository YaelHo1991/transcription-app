#!/bin/bash

# ============================================
# SMART DEPLOYMENT SCRIPT WITH AUTOMATIC REPORTING
# ============================================
# This script does EVERYTHING automatically and generates
# a report you can copy/paste to Claude
# ============================================

echo "============================================"
echo "🚀 SMART DEPLOYMENT STARTING"
echo "============================================"
echo ""

# Create report file
REPORT_FILE="/root/deployment-report.txt"
echo "=== DEPLOYMENT REPORT ===" > $REPORT_FILE
echo "Time: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Function to add to report
report() {
    echo "$1" | tee -a $REPORT_FILE
}

# Function to run command and report result
run_command() {
    local cmd="$1"
    local description="$2"
    
    report "🔄 $description..."
    
    if eval "$cmd" >> $REPORT_FILE 2>&1; then
        report "✅ $description - SUCCESS"
    else
        report "❌ $description - FAILED"
    fi
    echo "" >> $REPORT_FILE
}

# STEP 1: Stop everything
report "=== STEP 1: CLEANING UP ==="
run_command "pm2 delete all 2>/dev/null || true" "Stopping PM2 processes"
run_command "pkill -f 'next' 2>/dev/null || true" "Killing Next.js processes"
run_command "pkill -f 'node' 2>/dev/null || true" "Killing Node processes"
sleep 2

# STEP 2: Update code from Git
report "=== STEP 2: UPDATING CODE ==="
cd /var/app/transcription-system
run_command "git pull origin main" "Pulling latest code from Git"

# STEP 3: Fix environment variables
report "=== STEP 3: SETTING UP ENVIRONMENT ==="
cd /var/app/transcription-system/transcription-system/frontend/main-app

cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

report "✅ Environment variables configured"

# STEP 4: Fix any syntax errors in login page
report "=== STEP 4: FIXING KNOWN ISSUES ==="
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Fix the template literal syntax error
sed -i "s/style={{ background: isCRM ? \\\`linear-gradient(135deg, \\\${themeColor}, \\\${themeColor}dd)\\\` : 'linear-gradient(135deg, #4a3428, #6b4423)' }}/style={{ background: isCRM ? \\\`linear-gradient(135deg, \\\${themeColor}, \\\${themeColor}dd)\\\` : 'linear-gradient(135deg, #4a3428, #6b4423)' }}/g" src/app/login/page.tsx 2>/dev/null || true

report "✅ Fixed known syntax issues"

# STEP 5: Start backend
report "=== STEP 5: STARTING BACKEND ==="
cd /var/app/transcription-system/transcription-system/backend
run_command "pm2 start dist/server.js --name backend" "Starting backend service"
sleep 5

# STEP 6: Start frontend
report "=== STEP 6: STARTING FRONTEND ==="
cd /var/app/transcription-system/transcription-system/frontend/main-app
run_command "pm2 start npm --name frontend -- run dev" "Starting frontend service"
sleep 10

# STEP 7: Test services
report "=== STEP 7: TESTING SERVICES ==="
echo "" >> $REPORT_FILE

# Test backend
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    report "✅ Backend API: WORKING"
else
    report "❌ Backend API: NOT RESPONDING"
fi

# Test frontend
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    report "✅ Frontend: WORKING"
else
    report "❌ Frontend: NOT RESPONDING"
fi

# Test through Nginx
if curl -s http://146.190.57.51/api/health | grep -q "success"; then
    report "✅ API through Nginx: WORKING"
else
    report "❌ API through Nginx: NOT WORKING"
fi

# STEP 8: Check for errors
report "=== STEP 8: ERROR CHECK ==="
echo "" >> $REPORT_FILE

# Check PM2 status
report "PM2 Process Status:"
pm2 list >> $REPORT_FILE 2>&1

# Check for restart loops
FRONTEND_RESTARTS=$(pm2 describe frontend 2>/dev/null | grep restart | awk '{print $4}' || echo "0")
BACKEND_RESTARTS=$(pm2 describe backend 2>/dev/null | grep restart | awk '{print $4}' || echo "0")

if [ "$FRONTEND_RESTARTS" -gt "5" ]; then
    report "⚠️ Frontend has restarted $FRONTEND_RESTARTS times - checking logs..."
    pm2 logs frontend --lines 10 --nostream >> $REPORT_FILE 2>&1
fi

if [ "$BACKEND_RESTARTS" -gt "5" ]; then
    report "⚠️ Backend has restarted $BACKEND_RESTARTS times - checking logs..."
    pm2 logs backend --lines 10 --nostream >> $REPORT_FILE 2>&1
fi

# FINAL REPORT
echo "" >> $REPORT_FILE
report "=== DEPLOYMENT COMPLETE ==="
report "Report saved to: $REPORT_FILE"
echo ""
echo "============================================"
echo "📋 COPY THE REPORT BELOW TO CLAUDE:"
echo "============================================"
echo ""
cat $REPORT_FILE
echo ""
echo "============================================"
echo "✅ Script completed! Copy everything above"
echo "============================================"