#!/bin/bash

# ============================================
# FIX DEPLOYMENT SCRIPT
# ============================================

echo "============================================"
echo "🔧 FIXING DEPLOYMENT ISSUES"
echo "============================================"
echo ""

# 1. Stop everything
echo "1️⃣ Stopping all services..."
pm2 delete all 2>/dev/null || true
sleep 2

# 2. Fix database first
echo "2️⃣ Fixing database authentication..."
cd /var/app/transcription-system/transcription-system/backend

# Create correct .env file with proper database credentials
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=transcription_pass
DB_SSL=false
FRONTEND_URL=http://146.190.57.51
ALLOWED_ORIGINS=http://146.190.57.51,http://localhost:3002,http://localhost:3004
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
EOF

echo "✅ Backend environment configured"

# 3. Build backend
echo "3️⃣ Building backend..."
npm run build
echo "✅ Backend built"

# 4. Start backend
pm2 start dist/server.js --name backend
echo "✅ Backend started"
sleep 5

# 5. Now fix frontend
echo "4️⃣ Fixing frontend build..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Clean old build
echo "   Cleaning old build..."
rm -rf .next
rm -rf node_modules/.cache

# Create production environment
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_BACKEND_URL=http://146.190.57.51:5000
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=146.190.57.51
PORT=3002
EOF

# Install dependencies fresh
echo "5️⃣ Installing dependencies..."
npm install

# Build for production
echo "6️⃣ Building frontend (this will take 2-3 minutes)..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Check if build succeeded
if [ -f ".next/BUILD_ID" ]; then
    echo "✅ Build successful!"
    
    # Start in production mode
    echo "7️⃣ Starting frontend in production mode..."
    pm2 start "npm run start" --name frontend
    echo "✅ Frontend started"
else
    echo "❌ Build failed, trying development mode..."
    pm2 start "npm run dev" --name frontend
    echo "⚠️ Frontend started in development mode"
fi

# 8. Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

# 9. Wait for services
echo "8️⃣ Waiting for services to stabilize..."
sleep 15

# 10. Test services
echo "9️⃣ Testing services..."
echo ""
echo "============================================"
echo "📊 SERVICE STATUS:"
echo "============================================"

# Check backend
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    echo "✅ Backend API: Working"
else
    echo "❌ Backend API: Not responding"
    echo "   Checking backend logs..."
    pm2 logs backend --nostream --lines 10
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend: Working"
else
    echo "❌ Frontend: Not responding (Status: $FRONTEND_STATUS)"
    echo "   Checking frontend logs..."
    pm2 logs frontend --nostream --lines 10
fi

# Check through Nginx
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51)
if [ "$PUBLIC_STATUS" = "200" ]; then
    echo "✅ Public access: Working"
else
    echo "⚠️ Public access: Status $PUBLIC_STATUS"
fi

# Show PM2 status
echo ""
echo "PM2 Process Status:"
pm2 list

echo ""
echo "============================================"
echo "✅ DEPLOYMENT FIX COMPLETE!"
echo "============================================"
echo ""
echo "Your app should now be available at:"
echo "👉 http://146.190.57.51/"
echo ""
echo "If there are still issues, run:"
echo "  ./diagnose-deployment.sh"
echo "And send the output to Claude."
echo "============================================"