#!/bin/bash

echo "======================================" 
echo "🔄 RESTARTING SERVICES"
echo "======================================" 
echo ""

# Check what's running in PM2
echo "Current PM2 processes:"
pm2 list
echo ""

# Kill any existing frontend processes
echo "Stopping any existing frontend processes..."
pkill -f "next" || true
pm2 delete all 2>/dev/null || true
echo ""

# Start backend with PM2
echo "Starting backend..."
cd /var/app/transcription-system/transcription-system/backend
pm2 start dist/server.js --name backend
echo "✅ Backend started"
echo ""

# Start frontend in development mode
echo "Starting frontend..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Copy production environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

# Start with PM2 in dev mode
pm2 start npm --name frontend -- run dev
echo "✅ Frontend started"
echo ""

# Save PM2 configuration
pm2 save
echo ""

# Show status
echo "======================================" 
echo "📊 SERVICE STATUS"
echo "======================================" 
pm2 list
echo ""

# Test endpoints
echo "======================================" 
echo "🧪 TESTING ENDPOINTS"
echo "======================================" 
echo -n "Backend health: "
curl -s http://localhost:5000/api/health | grep -o "success" && echo " ✅" || echo " ❌"

echo -n "Frontend: "
sleep 5
curl -s http://localhost:3002 > /dev/null && echo "✅ Running on port 3002" || echo "❌ Not responding"

echo ""
echo "======================================" 
echo "✅ SERVICES RESTARTED!"
echo "======================================" 
echo ""
echo "Your app should now be accessible at:"
echo "http://146.190.57.51/"
echo ""
echo "To check logs:"
echo "pm2 logs frontend"
echo "pm2 logs backend"