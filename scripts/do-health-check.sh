#!/bin/bash

# ============================================
# DIGITAL OCEAN DROPLET HEALTH CHECK
# ============================================
# This script checks the current state WITHOUT making changes
# Run this on your DO droplet to get a complete picture
# ============================================

echo "============================================"
echo "🔍 DIGITAL OCEAN DROPLET HEALTH CHECK"
echo "============================================"
echo "Generated at: $(date)"
echo "Droplet IP: 146.190.57.51"
echo ""

# 1. System Information
echo "1️⃣ SYSTEM INFORMATION"
echo "----------------------------------------"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo "Memory: $(free -h | grep Mem | awk '{print "Total: "$2", Used: "$3", Free: "$4}')"
echo "Disk: $(df -h / | tail -1 | awk '{print "Total: "$2", Used: "$3", Free: "$4}')"
echo ""

# 2. Check which directories exist
echo "2️⃣ PROJECT DIRECTORIES"
echo "----------------------------------------"
echo "Checking /var/app/transcription-system:"
if [ -d "/var/app/transcription-system" ]; then
    echo "✅ EXISTS"
    echo "   Contents: $(ls -la /var/app/transcription-system 2>/dev/null | wc -l) items"
else
    echo "❌ NOT FOUND"
fi

echo "Checking /opt/transcription-system:"
if [ -d "/opt/transcription-system" ]; then
    echo "✅ EXISTS"
    echo "   Contents: $(ls -la /opt/transcription-system 2>/dev/null | wc -l) items"
else
    echo "❌ NOT FOUND"
fi

# Find actual location
PROJECT_DIR=""
if [ -d "/var/app/transcription-system/transcription-system" ]; then
    PROJECT_DIR="/var/app/transcription-system/transcription-system"
elif [ -d "/opt/transcription-system/transcription-system" ]; then
    PROJECT_DIR="/opt/transcription-system/transcription-system"
elif [ -d "/var/app/transcription-system" ]; then
    PROJECT_DIR="/var/app/transcription-system"
elif [ -d "/opt/transcription-system" ]; then
    PROJECT_DIR="/opt/transcription-system"
fi

if [ -n "$PROJECT_DIR" ]; then
    echo "📍 Using project directory: $PROJECT_DIR"
else
    echo "⚠️  No project directory found!"
fi
echo ""

# 3. Git Repository Status
echo "3️⃣ GIT REPOSITORY STATUS"
echo "----------------------------------------"
if [ -n "$PROJECT_DIR" ] && [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    echo "Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "Last commit: $(git log -1 --oneline 2>/dev/null || echo 'unknown')"
    echo "Remote: $(git remote -v | head -1 2>/dev/null || echo 'no remote')"
    echo "Status: $(git status -s | wc -l) modified files"
else
    echo "❌ No git repository found"
fi
echo ""

# 4. Node.js & NPM Versions
echo "4️⃣ NODE.JS & NPM"
echo "----------------------------------------"
echo "Node: $(node -v 2>/dev/null || echo 'NOT INSTALLED')"
echo "NPM: $(npm -v 2>/dev/null || echo 'NOT INSTALLED')"
echo "PM2: $(pm2 -v 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

# 5. PM2 Process Status
echo "5️⃣ PM2 PROCESSES"
echo "----------------------------------------"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    echo "PM2 Process Details:"
    pm2 jlist 2>/dev/null | python3 -m json.tool 2>/dev/null | grep -E '"name"|"status"|"pm_uptime"|"restart_time"' | head -20 || echo "Could not parse PM2 details"
else
    echo "❌ PM2 not installed"
fi
echo ""

# 6. Port Status
echo "6️⃣ PORT STATUS"
echo "----------------------------------------"
echo "Port 80 (HTTP):"
sudo netstat -tlnp | grep :80 || echo "❌ Not listening"
echo ""
echo "Port 443 (HTTPS):"
sudo netstat -tlnp | grep :443 || echo "❌ Not listening"
echo ""
echo "Port 3002 (Frontend):"
sudo netstat -tlnp | grep :3002 || echo "❌ Not listening"
echo ""
echo "Port 5000 (Backend):"
sudo netstat -tlnp | grep :5000 || echo "❌ Not listening"
echo ""
echo "Port 5432 (PostgreSQL):"
sudo netstat -tlnp | grep :5432 || echo "❌ Not listening"
echo ""

# 7. Database Status
echo "7️⃣ DATABASE STATUS"
echo "----------------------------------------"
echo "PostgreSQL service:"
sudo systemctl is-active postgresql || echo "❌ Not running"
echo ""
echo "Testing database connections:"
echo "  - With transcription_user:"
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -c "SELECT 'Connected' as status;" 2>&1 | head -3
echo "  - With transcription_user to transcription_prod:"
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_prod -c "SELECT 'Connected' as status;" 2>&1 | head -3
echo "  - Listing databases:"
sudo -u postgres psql -c "\l" 2>/dev/null | grep transcription || echo "No transcription databases found"
echo ""

# 8. Nginx Status
echo "8️⃣ NGINX STATUS"
echo "----------------------------------------"
echo "Service: $(sudo systemctl is-active nginx || echo 'Not running')"
echo "Config test: $(sudo nginx -t 2>&1 | tail -1)"
echo "Sites enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites"
echo ""

# 9. Check Build Directories
echo "9️⃣ BUILD DIRECTORIES"
echo "----------------------------------------"
if [ -n "$PROJECT_DIR" ]; then
    echo "Backend build (dist):"
    if [ -d "$PROJECT_DIR/backend/dist" ]; then
        echo "✅ EXISTS - $(ls -la $PROJECT_DIR/backend/dist | wc -l) files"
    else
        echo "❌ NOT FOUND"
    fi
    
    echo "Frontend build (.next):"
    if [ -d "$PROJECT_DIR/frontend/main-app/.next" ]; then
        echo "✅ EXISTS - $(du -sh $PROJECT_DIR/frontend/main-app/.next 2>/dev/null | cut -f1)"
    else
        echo "❌ NOT FOUND"
    fi
else
    echo "⚠️  Cannot check - no project directory"
fi
echo ""

# 10. Environment Files
echo "🔟 ENVIRONMENT FILES"
echo "----------------------------------------"
if [ -n "$PROJECT_DIR" ]; then
    echo "Backend .env:"
    if [ -f "$PROJECT_DIR/backend/.env" ]; then
        echo "✅ EXISTS"
        echo "   NODE_ENV: $(grep NODE_ENV $PROJECT_DIR/backend/.env | cut -d= -f2)"
        echo "   PORT: $(grep '^PORT=' $PROJECT_DIR/backend/.env | cut -d= -f2)"
        echo "   DB_NAME: $(grep DB_NAME $PROJECT_DIR/backend/.env | cut -d= -f2)"
    else
        echo "❌ NOT FOUND"
    fi
    
    echo "Frontend .env.local:"
    if [ -f "$PROJECT_DIR/frontend/main-app/.env.local" ]; then
        echo "✅ EXISTS"
        echo "   API_URL: $(grep NEXT_PUBLIC_API_URL $PROJECT_DIR/frontend/main-app/.env.local | head -1 | cut -d= -f2)"
    else
        echo "❌ NOT FOUND"
    fi
else
    echo "⚠️  Cannot check - no project directory"
fi
echo ""

# 11. Recent Logs (PM2)
echo "1️⃣1️⃣ RECENT PM2 LOGS (Last 10 lines)"
echo "----------------------------------------"
if command -v pm2 &> /dev/null; then
    echo "=== Backend Logs ==="
    pm2 logs backend --nostream --lines 10 2>/dev/null || echo "No backend logs"
    echo ""
    echo "=== Frontend Logs ==="
    pm2 logs frontend --nostream --lines 10 2>/dev/null || echo "No frontend logs"
else
    echo "PM2 not available"
fi
echo ""

# 12. Nginx Error Logs
echo "1️⃣2️⃣ NGINX ERROR LOGS (Last 10 lines)"
echo "----------------------------------------"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error logs"
echo ""

# 13. HTTP Response Tests
echo "1️⃣3️⃣ HTTP RESPONSE TESTS"
echo "----------------------------------------"
echo "Testing localhost:5000/api/health (Backend):"
curl -s -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://localhost:5000/api/health 2>/dev/null || echo "❌ Failed"
echo ""
echo "Testing localhost:3002 (Frontend):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://localhost:3002 2>/dev/null || echo "❌ Failed"
echo ""
echo "Testing public IP (through Nginx):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://146.190.57.51 2>/dev/null || echo "❌ Failed"
echo ""

# 14. Process Check
echo "1️⃣4️⃣ RUNNING PROCESSES"
echo "----------------------------------------"
echo "Node processes:"
ps aux | grep node | grep -v grep | wc -l
ps aux | grep node | grep -v grep | head -5
echo ""

# 15. FINAL SUMMARY
echo "============================================"
echo "📊 HEALTH CHECK SUMMARY"
echo "============================================"

# Determine status
STATUS_SUMMARY=""

# Check services
if sudo systemctl is-active postgresql &>/dev/null; then
    STATUS_SUMMARY="$STATUS_SUMMARY\n✅ PostgreSQL: Running"
else
    STATUS_SUMMARY="$STATUS_SUMMARY\n❌ PostgreSQL: Not running"
fi

if sudo systemctl is-active nginx &>/dev/null; then
    STATUS_SUMMARY="$STATUS_SUMMARY\n✅ Nginx: Running"
else
    STATUS_SUMMARY="$STATUS_SUMMARY\n❌ Nginx: Not running"
fi

if pm2 list 2>/dev/null | grep -q "online"; then
    STATUS_SUMMARY="$STATUS_SUMMARY\n✅ PM2: Has online processes"
else
    STATUS_SUMMARY="$STATUS_SUMMARY\n❌ PM2: No online processes"
fi

if curl -s http://localhost:5000/api/health 2>/dev/null | grep -q "OK\|ok\|success"; then
    STATUS_SUMMARY="$STATUS_SUMMARY\n✅ Backend API: Responding"
else
    STATUS_SUMMARY="$STATUS_SUMMARY\n❌ Backend API: Not responding"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null | grep -q "200"; then
    STATUS_SUMMARY="$STATUS_SUMMARY\n✅ Frontend: Responding"
else
    STATUS_SUMMARY="$STATUS_SUMMARY\n❌ Frontend: Not responding"
fi

echo -e "$STATUS_SUMMARY"
echo ""
echo "Project Directory: ${PROJECT_DIR:-NOT FOUND}"
echo "Public Access: http://146.190.57.51"
echo ""
echo "============================================"
echo "📋 Copy this entire output for analysis"
echo "============================================"