#!/bin/bash

echo "======================================"
echo "🔍 FULL SYSTEM DIAGNOSTIC"
echo "======================================"
echo "Time: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. SYSTEM INFO
echo "======================================"
echo "1️⃣ SYSTEM INFO"
echo "======================================"
echo "Droplet IP: $(curl -s ifconfig.me)"
echo "Memory: $(free -m | grep Mem | awk '{print "Used: "$3"MB / Total: "$2"MB"}')"
echo "Disk: $(df -h / | tail -1 | awk '{print "Used: "$3" / Total: "$2" ("$5" used)"}')"
echo ""

# 2. SERVICE STATUS
echo "======================================"
echo "2️⃣ SERVICE STATUS"
echo "======================================"
echo "PostgreSQL:"
systemctl is-active postgresql && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}"

echo ""
echo "Nginx:"
systemctl is-active nginx && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}"

echo ""
echo "PM2 Processes:"
pm2 list

echo ""

# 3. PORT STATUS
echo "======================================"
echo "3️⃣ PORT STATUS"
echo "======================================"
echo "Checking ports..."
echo ""
echo "Port 5000 (Backend):"
netstat -tulpn 2>/dev/null | grep :5000 && echo -e "${GREEN}✅ Listening${NC}" || echo -e "${RED}❌ Not listening${NC}"

echo ""
echo "Port 3002 (Frontend):"
netstat -tulpn 2>/dev/null | grep :3002 && echo -e "${GREEN}✅ Listening${NC}" || echo -e "${RED}❌ Not listening${NC}"

echo ""
echo "Port 80 (HTTP):"
netstat -tulpn 2>/dev/null | grep :80 && echo -e "${GREEN}✅ Listening${NC}" || echo -e "${RED}❌ Not listening${NC}"

echo ""

# 4. API TESTS
echo "======================================"
echo "4️⃣ API CONNECTIVITY TESTS"
echo "======================================"

echo "Test 1: Backend on localhost:5000"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Working (200 OK)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo "Test 2: API through IP (146.190.57.51)"
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Working (200 OK)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo "Test 3: API through domain (yalitranscription.duckdns.org)"
if timeout 5 curl -s -o /dev/null -w "%{http_code}" http://yalitranscription.duckdns.org/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Working (200 OK)${NC}"
else
    echo -e "${RED}❌ Failed or timeout${NC}"
fi

echo ""
echo "Test 4: Frontend through IP"
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51/ | grep -q "200"; then
    echo -e "${GREEN}✅ Working (200 OK)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo "Test 5: Frontend through domain"
if timeout 5 curl -s -o /dev/null -w "%{http_code}" http://yalitranscription.duckdns.org/ | grep -q "200"; then
    echo -e "${GREEN}✅ Working (200 OK)${NC}"
else
    echo -e "${RED}❌ Failed or timeout${NC}"
fi

echo ""

# 5. DATABASE CHECK
echo "======================================"
echo "5️⃣ DATABASE STATUS"
echo "======================================"
echo "Testing database connection..."
PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod -c "SELECT COUNT(*) FROM users;" 2>&1 | head -3
echo ""

# 6. CONFIGURATION FILES
echo "======================================"
echo "6️⃣ CONFIGURATION STATUS"
echo "======================================"

echo "Frontend .env.local:"
if [ -f /var/app/transcription-system/transcription-system/frontend/main-app/.env.local ]; then
    echo -e "${GREEN}✅ Exists${NC}"
    echo "API URL configured as:"
    grep "NEXT_PUBLIC_API_URL" /var/app/transcription-system/transcription-system/frontend/main-app/.env.local
else
    echo -e "${RED}❌ Not found${NC}"
fi

echo ""
echo "Backend .env:"
if [ -f /var/app/transcription-system/transcription-system/backend/.env ]; then
    echo -e "${GREEN}✅ Exists${NC}"
    echo "Database configured as:"
    grep "DB_" /var/app/transcription-system/transcription-system/backend/.env | grep -v PASSWORD
else
    echo -e "${RED}❌ Not found${NC}"
fi

echo ""

# 7. NGINX CONFIG
echo "======================================"
echo "7️⃣ NGINX CONFIGURATION"
echo "======================================"
echo "Sites enabled:"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "Nginx test:"
nginx -t 2>&1

echo ""

# 8. ERROR LOGS (Last 10 lines)
echo "======================================"
echo "8️⃣ RECENT ERROR LOGS"
echo "======================================"

echo "Backend errors (PM2):"
pm2 logs backend --nostream --lines 5 2>&1 | grep -i error || echo "No recent errors"

echo ""
echo "Frontend errors:"
if [ -f /var/log/frontend.log ]; then
    tail -5 /var/log/frontend.log | grep -i error || echo "No recent errors"
else
    echo "Log file not found"
fi

echo ""
echo "Nginx errors:"
tail -5 /var/log/nginx/error.log 2>/dev/null | grep -i error || echo "No recent errors"

echo ""

# 9. DNS CHECK
echo "======================================"
echo "9️⃣ DNS RESOLUTION"
echo "======================================"
echo "Checking yalitranscription.duckdns.org:"
nslookup yalitranscription.duckdns.org | grep -A1 "Answer" || echo "DNS lookup failed"

echo ""

# 10. PROCESS CHECK
echo "======================================"
echo "🔟 RUNNING PROCESSES"
echo "======================================"
echo "Node processes:"
ps aux | grep node | grep -v grep | head -3

echo ""
echo "Next.js processes:"
ps aux | grep next | grep -v grep | head -3

echo ""

# SUMMARY
echo "======================================"
echo "📊 DIAGNOSIS SUMMARY"
echo "======================================"

ISSUES=""

# Check each critical component
if ! systemctl is-active --quiet postgresql; then
    ISSUES="${ISSUES}\n❌ PostgreSQL is not running"
fi

if ! netstat -tulpn 2>/dev/null | grep -q :5000; then
    ISSUES="${ISSUES}\n❌ Backend not listening on port 5000"
fi

if ! netstat -tulpn 2>/dev/null | grep -q :3002; then
    ISSUES="${ISSUES}\n❌ Frontend not listening on port 3002"
fi

if ! curl -s http://localhost:5000/api/health | grep -q "ok"; then
    ISSUES="${ISSUES}\n❌ Backend API not responding"
fi

if [ -z "$ISSUES" ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
else
    echo -e "${RED}Issues found:${NC}"
    echo -e "$ISSUES"
fi

echo ""
echo "======================================"
echo "💡 RECOMMENDATIONS"
echo "======================================"

if ! netstat -tulpn 2>/dev/null | grep -q :5000; then
    echo "1. Start backend: pm2 start /var/app/transcription-system/transcription-system/backend/dist/server.js --name backend"
fi

if ! netstat -tulpn 2>/dev/null | grep -q :3002; then
    echo "2. Start frontend: cd /var/app/transcription-system/transcription-system/frontend/main-app && nohup npm run dev > /var/log/frontend.log 2>&1 &"
fi

if ! timeout 2 curl -s http://yalitranscription.duckdns.org > /dev/null; then
    echo "3. Domain not accessible - check DuckDNS configuration"
fi

echo ""
echo "======================================"
echo "✅ DIAGNOSTIC COMPLETE"
echo "======================================"
echo ""
echo "Save this output and share it for troubleshooting!"