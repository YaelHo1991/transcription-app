#!/bin/bash

# ============================================
# DEPLOYMENT DIAGNOSTIC SCRIPT
# ============================================
# This script collects all error information
# ============================================

echo "============================================"
echo "🔍 DEPLOYMENT DIAGNOSTIC REPORT"
echo "============================================"
echo "Generated at: $(date)"
echo ""

# 1. PM2 Process Status
echo "1️⃣ PM2 PROCESS STATUS"
echo "----------------------------------------"
pm2 list
echo ""

# 2. Frontend Logs (last 50 lines)
echo "2️⃣ FRONTEND LOGS (Last 50 lines)"
echo "----------------------------------------"
pm2 logs frontend --nostream --lines 50
echo ""

# 3. Backend Logs (last 30 lines)
echo "3️⃣ BACKEND LOGS (Last 30 lines)"
echo "----------------------------------------"
pm2 logs backend --nostream --lines 30
echo ""

# 4. Frontend Process Details
echo "4️⃣ FRONTEND PROCESS DETAILS"
echo "----------------------------------------"
pm2 describe frontend
echo ""

# 5. Check Port Usage
echo "5️⃣ PORT USAGE CHECK"
echo "----------------------------------------"
echo "Port 3002 (Frontend):"
netstat -tlnp | grep :3002 || echo "Port 3002 not in use"
echo ""
echo "Port 5000 (Backend):"
netstat -tlnp | grep :5000 || echo "Port 5000 not in use"
echo ""

# 6. Check if Next.js built successfully
echo "6️⃣ BUILD OUTPUT CHECK"
echo "----------------------------------------"
cd /var/app/transcription-system/transcription-system/frontend/main-app
if [ -d ".next" ]; then
    echo "✅ .next directory exists"
    echo "Build directory size: $(du -sh .next | cut -f1)"
else
    echo "❌ .next directory NOT found"
fi
echo ""

# 7. Check package.json scripts
echo "7️⃣ PACKAGE.JSON SCRIPTS"
echo "----------------------------------------"
cd /var/app/transcription-system/transcription-system/frontend/main-app
echo "Available scripts:"
cat package.json | grep -A 10 '"scripts"'
echo ""

# 8. Check environment files
echo "8️⃣ ENVIRONMENT FILES"
echo "----------------------------------------"
cd /var/app/transcription-system/transcription-system/frontend/main-app
echo "Frontend env files:"
ls -la .env* 2>/dev/null || echo "No .env files found"
echo ""
echo "Backend env file:"
cd /var/app/transcription-system/transcription-system/backend
ls -la .env 2>/dev/null || echo "No .env file found"
echo ""

# 9. Test API endpoints
echo "9️⃣ API ENDPOINT TESTS"
echo "----------------------------------------"
echo "Backend health check:"
curl -s http://localhost:5000/api/health || echo "Failed"
echo ""
echo "Frontend check (localhost:3002):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3002 || echo "Failed"
echo ""
echo "Through Nginx (public IP):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://146.190.57.51 || echo "Failed"
echo ""

# 10. Nginx Error Logs
echo "🔟 NGINX ERROR LOGS (Last 20 lines)"
echo "----------------------------------------"
tail -20 /var/log/nginx/error.log
echo ""

# 11. System Resources
echo "1️⃣1️⃣ SYSTEM RESOURCES"
echo "----------------------------------------"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /
echo ""

# 12. Node & NPM versions
echo "1️⃣2️⃣ NODE & NPM VERSIONS"
echo "----------------------------------------"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo ""

# 13. Recent PM2 errors
echo "1️⃣3️⃣ PM2 ERROR LOG"
echo "----------------------------------------"
pm2 logs --err --nostream --lines 30
echo ""

# 14. Check if processes are actually running
echo "1️⃣4️⃣ PROCESS CHECK"
echo "----------------------------------------"
echo "Node processes:"
ps aux | grep node | grep -v grep || echo "No node processes found"
echo ""

# 15. Final Summary
echo "============================================"
echo "📊 DIAGNOSTIC SUMMARY"
echo "============================================"

# Check each service
BACKEND_OK=false
FRONTEND_OK=false
NGINX_OK=false

if curl -s http://localhost:5000/api/health | grep -q "success"; then
    BACKEND_OK=true
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    FRONTEND_OK=true
fi

if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51 | grep -q "200\|502"; then
    NGINX_OK=true
fi

echo "Service Status:"
[[ "$BACKEND_OK" == "true" ]] && echo "✅ Backend: Running" || echo "❌ Backend: Not working"
[[ "$FRONTEND_OK" == "true" ]] && echo "✅ Frontend: Running" || echo "❌ Frontend: Not working"
[[ "$NGINX_OK" == "true" ]] && echo "✅ Nginx: Running" || echo "❌ Nginx: Not working"

echo ""
echo "============================================"
echo "🔚 END OF DIAGNOSTIC REPORT"
echo "============================================"
echo ""
echo "📋 Copy this entire output and send to Claude for analysis"
echo ""