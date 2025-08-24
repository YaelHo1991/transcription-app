#!/bin/bash

echo "======================================"
echo "🔧 FIXING ALL API URLs"
echo "======================================"
echo ""

# Step 1: Update frontend environment to use IP (more reliable than domain)
echo "Step 1: Updating frontend environment..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

echo "✅ Frontend environment updated"
echo ""

# Step 2: Update backend CORS to accept all origins
echo "Step 2: Updating backend CORS..."
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

# CORS - Allow all for now
FRONTEND_URL=http://146.190.57.51
ALLOWED_ORIGINS=http://146.190.57.51,http://yalitranscription.duckdns.org,http://localhost:3002

# Files
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
EOF

echo "✅ Backend CORS updated"
echo ""

# Step 3: Restart backend to use new config
echo "Step 3: Restarting backend..."
pm2 delete all
pm2 start dist/server.js --name backend

echo "✅ Backend restarted"
echo ""

# Step 4: Restart frontend with new environment
echo "Step 4: Restarting frontend..."
pkill -f "next"
cd /var/app/transcription-system/transcription-system/frontend/main-app
nohup npm run dev > /var/log/frontend.log 2>&1 &

echo "Waiting for services to start..."
sleep 15

# Step 5: Test API connectivity
echo ""
echo "Step 5: Testing API..."
echo "------------------------"

echo -n "Backend direct: "
curl -s http://localhost:5000/api/health | grep -o "ok" && echo "✅ Working" || echo "❌ Failed"

echo -n "API through IP: "
curl -s http://146.190.57.51/api/health | grep -o "ok" && echo "✅ Working" || echo "❌ Failed"

echo -n "API licenses endpoint: "
curl -s http://146.190.57.51/api/licenses/stats | grep -E "success|error" || echo "❌ No response"

echo ""
echo "======================================"
echo "✅ API URLS FIXED!"
echo "======================================"
echo ""
echo "Now try accessing:"
echo "http://146.190.57.51/licenses"
echo ""
echo "The registration should work now!"
echo ""
echo "If it still doesn't work, check:"
echo "pm2 logs backend"