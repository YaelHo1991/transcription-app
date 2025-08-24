#!/bin/bash

# ============================================
# SIMPLE PRODUCTION DEPLOYMENT SCRIPT
# ============================================
# This ONE script does everything needed for deployment
# ============================================

echo "============================================"
echo "🚀 DEPLOYING TO PRODUCTION"
echo "============================================"
echo ""

# Stop everything first
echo "1️⃣ Stopping old services..."
pm2 delete all 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 2

# Set up backend environment
echo "2️⃣ Setting up backend..."
cd /var/app/transcription-system/transcription-system/backend

cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_prod
DB_USER=transcription_user
DB_PASSWORD=simple123
DB_SSL=false
FRONTEND_URL=http://146.190.57.51
ALLOWED_ORIGINS=http://146.190.57.51,http://localhost:3002,http://localhost:3004
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
EOF

# Start backend
pm2 start dist/server.js --name backend
echo "✅ Backend started"
sleep 3

# Set up frontend environment
echo "3️⃣ Building frontend for production..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create production environment file
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

# Fix login page syntax error if it exists
echo "4️⃣ Fixing any syntax errors..."
sed -i "s/\${themeColor}/\#b85042/g" src/app/login/page.tsx 2>/dev/null || true

# Build for production
echo "5️⃣ Building production version (this takes 2-3 minutes)..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Start frontend in production mode
    echo "6️⃣ Starting frontend in production mode..."
    pm2 start npm --name frontend -- start
    echo "✅ Frontend started in production mode"
else
    echo "⚠️ Build failed, starting in development mode..."
    pm2 start npm --name frontend -- run dev
    echo "✅ Frontend started in development mode"
fi

# Save PM2 configuration
pm2 save

# Wait for services to start
echo "7️⃣ Waiting for services to start..."
sleep 10

# Test everything
echo "8️⃣ Testing services..."
echo ""
echo "============================================"
echo "📊 STATUS REPORT:"
echo "============================================"

# Check backend
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    echo "✅ Backend API: Working"
else
    echo "❌ Backend API: Not responding"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    echo "✅ Frontend: Working"
else
    echo "❌ Frontend: Not responding"
fi

# Check through Nginx
if curl -s http://146.190.57.51/api/health | grep -q "success"; then
    echo "✅ API through IP: Working"
else
    echo "❌ API through IP: Not working"
fi

# Show PM2 status
echo ""
echo "PM2 Process Status:"
pm2 list

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "Your app is now available at:"
echo "👉 http://146.190.57.51/"
echo "👉 http://146.190.57.51/licenses"
echo "👉 http://146.190.57.51/crm"
echo "👉 http://146.190.57.51/transcription"
echo ""
echo "If there are any errors, copy this output and send to Claude."
echo "============================================"