#!/bin/bash

echo "=========================================="
echo "    DEBUGGING SERVICES"
echo "=========================================="

echo "1. Checking PM2 services..."
pm2 status

echo ""
echo "2. Checking if ports are listening..."
netstat -tulpn | grep -E ':(5000|3002)'

echo ""
echo "3. Testing backend directly..."
curl -I http://localhost:5000/api/health || echo "Backend not responding"

echo ""
echo "4. Testing frontend directly..."
curl -I http://localhost:3002 || echo "Frontend not responding"

echo ""
echo "5. Checking PM2 logs for errors..."
echo "=== Backend logs ==="
pm2 logs backend --lines 10 --nostream

echo ""
echo "=== Frontend logs ==="
pm2 logs frontend --lines 10 --nostream

echo ""
echo "6. Checking Nginx error log..."
tail -20 /var/log/nginx/error.log

echo ""
echo "7. Restarting services..."
pm2 restart all

echo ""
echo "8. Starting services with direct commands..."
cd /opt/transcription-system/transcription-system/backend
pm2 delete backend 2>/dev/null
pm2 start "node dist/server.js" --name backend

cd /opt/transcription-system/transcription-system/frontend/main-app
pm2 delete frontend 2>/dev/null
pm2 start "npx next start -p 3002" --name frontend

echo ""
echo "9. Waiting for services to start..."
sleep 10

echo ""
echo "10. Final status check..."
pm2 status

echo ""
echo "11. Testing again..."
curl -I http://localhost:5000/api/health
curl -I http://localhost:3002

echo ""
echo "If services are still not working, try this manual start:"
echo "  cd /opt/transcription-system/transcription-system/backend"
echo "  PORT=5000 node dist/server.js"
echo ""
echo "  cd /opt/transcription-system/transcription-system/frontend/main-app"  
echo "  PORT=3002 npx next start"
echo ""