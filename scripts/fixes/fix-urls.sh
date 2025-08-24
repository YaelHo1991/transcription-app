#!/bin/bash

echo "======================================"
echo "🔗 FIXING URLs AND NAVIGATION"
echo "======================================"
echo ""

# Copy the new environment file to droplet
echo "Updating environment configuration..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Update the .env.production file
cat > .env.production << 'EOF'
# Frontend Production Configuration
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_API_URL=http://yalitranscription.duckdns.org/api
NEXT_PUBLIC_API_BASE_URL=http://yalitranscription.duckdns.org
NEXT_PUBLIC_SITE_URL=http://yalitranscription.duckdns.org
NEXT_PUBLIC_FORCE_HTTPS=false
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
NEXT_PUBLIC_APP_NAME=Yali Transcription System
NEXT_PUBLIC_APP_DESCRIPTION=Professional Transcription Services
NEXT_PUBLIC_ENABLE_PEDAL=true
NEXT_PUBLIC_ENABLE_AUTODETECT=true
NEXT_PUBLIC_ENABLE_WAVEFORM=true
NEXT_PUBLIC_ENABLE_VIDEO=true
NEXT_PUBLIC_ENABLE_AUTO_SAVE=true
NEXT_PUBLIC_MAX_FILE_SIZE=5000
NEXT_PUBLIC_WAVEFORM_CLIENT_MAX_SIZE=50
NEXT_PUBLIC_WAVEFORM_CHUNKED_MAX_SIZE=200
NEXT_PUBLIC_VIRTUAL_SCROLL_WINDOW=40
NEXT_PUBLIC_AUTO_SAVE_INTERVAL=30000
NEXT_PUBLIC_DEFAULT_LOCALE=he
NEXT_PUBLIC_SUPPORTED_LOCALES=he,en
NEXT_TELEMETRY_DISABLED=1
EOF

# Also update backend to match
cd /var/app/transcription-system/transcription-system/backend
sed -i 's|FRONTEND_URL=https://yalitranscription.duckdns.org|FRONTEND_URL=http://yalitranscription.duckdns.org|g' .env.production
sed -i 's|ALLOWED_ORIGINS=https://yalitranscription.duckdns.org|ALLOWED_ORIGINS=http://yalitranscription.duckdns.org,http://146.190.57.51|g' .env.production

# Restart frontend
echo ""
echo "Restarting frontend with new configuration..."
pkill -f "next" 2>/dev/null || true
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Start in development mode with proper host binding
export NODE_ENV=development
export HOST=0.0.0.0
nohup npm run dev > /var/log/frontend.log 2>&1 &

echo "Waiting for frontend to start..."
sleep 15

# Restart backend
echo "Restarting backend..."
pm2 restart backend

echo ""
echo "======================================"
echo "✅ URL FIX COMPLETE!"
echo "======================================"
echo ""
echo "IMPORTANT: Update your DuckDNS!"
echo "1. Go to: https://www.duckdns.org/"
echo "2. Login to your account"
echo "3. Find 'yalitranscription'"
echo "4. Update the IP to: 146.190.57.51"
echo "5. Click 'update ip'"
echo ""
echo "After updating DuckDNS, your site will work at:"
echo "  http://yalitranscription.duckdns.org"
echo ""
echo "All navigation links will now use the correct domain!"
echo ""