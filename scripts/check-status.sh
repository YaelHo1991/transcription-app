#!/bin/bash

# ============================================
# STATUS CHECK SCRIPT - GENERATES REPORT FOR CLAUDE
# ============================================
# Run this to get a complete status report
# ============================================

echo "============================================"
echo "🔍 SYSTEM STATUS CHECK"
echo "============================================"
echo ""

REPORT_FILE="/root/status-report.txt"
echo "=== STATUS REPORT ===" > $REPORT_FILE
echo "Time: $(date)" >> $REPORT_FILE
echo "Server IP: 146.190.57.51" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Function to add to report
report() {
    echo "$1" | tee -a $REPORT_FILE
}

# Check services
report "=== SERVICE STATUS ==="
report "PM2 Processes:"
pm2 list >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

# Check ports
report "=== PORT STATUS ==="
if netstat -tuln | grep -q ":5000"; then
    report "✅ Port 5000 (Backend): LISTENING"
else
    report "❌ Port 5000 (Backend): NOT LISTENING"
fi

if netstat -tuln | grep -q ":3002"; then
    report "✅ Port 3002 (Frontend): LISTENING"
else
    report "❌ Port 3002 (Frontend): NOT LISTENING"
fi
echo "" >> $REPORT_FILE

# Check API endpoints
report "=== API STATUS ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
    report "✅ Backend API: WORKING (200 OK)"
else
    report "❌ Backend API: NOT WORKING"
fi

if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/api/health | grep -q "200"; then
    report "✅ API through Nginx: WORKING (200 OK)"
else
    report "❌ API through Nginx: NOT WORKING"
fi

if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/ | grep -q "200\|500"; then
    report "✅ Frontend through Nginx: RESPONDING"
else
    report "❌ Frontend through Nginx: NOT RESPONDING"
fi
echo "" >> $REPORT_FILE

# Check for errors
report "=== RECENT ERRORS ==="
report "Frontend errors (last 5 lines):"
pm2 logs frontend --lines 5 --nostream 2>&1 | grep -i error >> $REPORT_FILE || echo "No recent errors" >> $REPORT_FILE
echo "" >> $REPORT_FILE

report "Backend errors (last 5 lines):"
pm2 logs backend --lines 5 --nostream 2>&1 | grep -i error >> $REPORT_FILE || echo "No recent errors" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check Git status
report "=== GIT STATUS ==="
cd /var/app/transcription-system
git log --oneline -3 >> $REPORT_FILE 2>&1
echo "" >> $REPORT_FILE

# Memory and disk
report "=== SYSTEM RESOURCES ==="
report "Memory usage:"
free -m | head -2 >> $REPORT_FILE
echo "" >> $REPORT_FILE
report "Disk usage:"
df -h / | tail -1 >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Environment check
report "=== ENVIRONMENT CHECK ==="
if [ -f /var/app/transcription-system/transcription-system/frontend/main-app/.env.local ]; then
    report "✅ Frontend .env.local exists"
    grep "NEXT_PUBLIC_API" /var/app/transcription-system/transcription-system/frontend/main-app/.env.local >> $REPORT_FILE
else
    report "❌ Frontend .env.local missing"
fi
echo "" >> $REPORT_FILE

# Final status
report "=== SUMMARY ==="
ISSUES=""

# Check for critical issues
pm2 list | grep -q "stopped" && ISSUES="${ISSUES}❌ Some PM2 processes are stopped\n"
pm2 list | grep -E "↺ +[0-9]{2,}" && ISSUES="${ISSUES}❌ Some processes are restarting frequently\n"
! curl -s http://localhost:5000/api/health | grep -q "success" && ISSUES="${ISSUES}❌ Backend API not responding\n"
! curl -s http://146.190.57.51 > /dev/null 2>&1 && ISSUES="${ISSUES}❌ Site not accessible from IP\n"

if [ -z "$ISSUES" ]; then
    report "✅ ALL SYSTEMS OPERATIONAL"
else
    report "⚠️ ISSUES FOUND:"
    echo -e "$ISSUES" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "=== END OF REPORT ===" >> $REPORT_FILE

# Display report
echo ""
echo "============================================"
echo "📋 COPY THIS ENTIRE REPORT TO CLAUDE:"
echo "============================================"
echo ""
cat $REPORT_FILE
echo ""
echo "============================================"
echo "✅ Report complete! Copy everything above"
echo "============================================"