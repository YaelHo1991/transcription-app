#!/bin/bash

# ============================================
# QUICK FIX FOR FRONTEND PRERENDER ISSUE
# ============================================

echo "============================================"
echo "🔧 QUICK FIX FOR FRONTEND"
echo "============================================"
echo ""

# 1. Stop frontend only
echo "1️⃣ Stopping frontend..."
pm2 delete frontend 2>/dev/null || true
sleep 2

# 2. Go to frontend directory
cd /var/app/transcription-system/transcription-system/frontend/main-app

# 3. Create the missing prerender-manifest.json
echo "2️⃣ Creating missing prerender-manifest.json..."
cat > .next/prerender-manifest.json << 'EOF'
{
  "version": 4,
  "routes": {},
  "dynamicRoutes": {},
  "preview": {
    "previewModeId": "",
    "previewModeSigningKey": "",
    "previewModeEncryptionKey": ""
  },
  "notFoundRoutes": []
}
EOF

# 4. Also create BUILD_ID if missing
if [ ! -f ".next/BUILD_ID" ]; then
    echo "production-$(date +%s)" > .next/BUILD_ID
fi

# 5. Make sure all required directories exist
mkdir -p .next/server/pages
mkdir -p .next/static

# 6. Set correct permissions
chmod -R 755 .next

# 7. Start frontend with explicit port
echo "3️⃣ Starting frontend on port 3002..."
PORT=3002 pm2 start npm --name frontend -- start

# 8. Wait for startup
echo "4️⃣ Waiting for frontend to start..."
sleep 10

# 9. Check status
echo "5️⃣ Checking status..."
pm2 list

# 10. Test frontend
echo ""
echo "6️⃣ Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
echo "Frontend status code: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is working!"
else
    echo "❌ Frontend still not responding"
    echo ""
    echo "Checking logs:"
    pm2 logs frontend --nostream --lines 20
fi

# 11. Test public access
echo ""
echo "7️⃣ Testing public access..."
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51)
echo "Public access status: $PUBLIC_STATUS"

if [ "$PUBLIC_STATUS" = "200" ]; then
    echo "✅ Site is accessible!"
    echo ""
    echo "============================================"
    echo "🎉 SUCCESS! Your site is now live at:"
    echo "👉 http://146.190.57.51/"
    echo "============================================"
else
    echo "⚠️ Site not accessible yet (Status: $PUBLIC_STATUS)"
    echo "Restarting nginx..."
    systemctl restart nginx
    sleep 3
    
    # Test again
    PUBLIC_STATUS2=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51)
    if [ "$PUBLIC_STATUS2" = "200" ]; then
        echo "✅ Site is now accessible after nginx restart!"
    else
        echo "❌ Still not working. Check nginx configuration."
    fi
fi

# Save PM2
pm2 save

echo ""
echo "============================================"
echo "✅ QUICK FIX COMPLETE"
echo "============================================"