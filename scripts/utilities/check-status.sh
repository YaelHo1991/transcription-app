#!/bin/bash

echo "======================================"
echo "🔍 SYSTEM STATUS CHECK"
echo "======================================"
echo ""

# Check what's listening on ports
echo "📡 PORT STATUS:"
echo "---------------"
echo "Port 5000 (Backend):"
netstat -tulpn 2>/dev/null | grep 5000 || echo "  ❌ NOT LISTENING"
echo ""
echo "Port 3002 (Frontend):"
netstat -tulpn 2>/dev/null | grep 3002 || echo "  ❌ NOT LISTENING"
echo ""

# Check PM2 status
echo "📊 PM2 STATUS:"
echo "---------------"
pm2 status
echo ""

# Check if Next.js process is running
echo "🔄 NEXT.JS PROCESSES:"
echo "----------------------"
ps aux | grep "next start" | grep -v grep || echo "  ❌ No Next.js process found"
echo ""

# Check frontend log for errors
echo "❌ FRONTEND ERRORS (last 20 lines):"
echo "------------------------------------"
if [ -f /var/log/frontend.log ]; then
    tail -20 /var/log/frontend.log | grep -E "Error|error|ERROR|failed|Failed|FAILED|errno|ENOENT|EACCES|EADDRINUSE" || echo "  No obvious errors in log"
else
    echo "  Frontend log file not found"
fi
echo ""

# Check backend logs
echo "📝 BACKEND STATUS:"
echo "------------------"
pm2 logs backend --nostream --lines 5 | grep -E "Error|error|ERROR|failed|Failed|FAILED" || echo "  Backend running OK"
echo ""

# Check disk space
echo "💾 DISK SPACE:"
echo "--------------"
df -h / | tail -1
echo ""

# Check memory
echo "🧠 MEMORY USAGE:"
echo "----------------"
free -m | head -2
echo ""

# Summary
echo "======================================"
echo "📋 SUMMARY:"
echo "======================================"

if netstat -tulpn 2>/dev/null | grep -q 5000; then
    echo "✅ Backend: RUNNING on port 5000"
else
    echo "❌ Backend: NOT RUNNING"
fi

if netstat -tulpn 2>/dev/null | grep -q 3002; then
    echo "✅ Frontend: RUNNING on port 3002"
else
    echo "❌ Frontend: NOT RUNNING"
    echo ""
    echo "🔧 TO FIX FRONTEND:"
    echo "1. Check the error above"
    echo "2. Try: cd /var/app/transcription-system/transcription-system/frontend/main-app"
    echo "3. Then: npm start"
    echo "4. See what error appears"
fi

echo ""
echo "🌐 Your site: http://146.190.57.51"
echo ""