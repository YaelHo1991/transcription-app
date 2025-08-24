#!/bin/bash

echo "======================================"
echo "🔧 FIXING API URLS AND NAVIGATION"
echo "======================================"
echo ""

# Fix Frontend Environment
echo "Setting up frontend environment..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create .env.local for development mode (which is currently running)
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://yalitranscription.duckdns.org:5000/api
NEXT_PUBLIC_API_BASE_URL=http://yalitranscription.duckdns.org:5000
NEXT_PUBLIC_SITE_URL=http://yalitranscription.duckdns.org
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

# Fix Backend CORS
echo "Setting up backend environment..."
cd /var/app/transcription-system/transcription-system/backend

# Create .env file for backend
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
FRONTEND_URL=http://yalitranscription.duckdns.org
ALLOWED_ORIGINS=http://yalitranscription.duckdns.org,http://146.190.57.51,http://localhost:3002
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
SESSION_TIMEOUT=24h
REFRESH_TOKEN_EXPIRY=7d
EOF

# Update Nginx to expose backend port directly
echo "Updating Nginx configuration..."
cat > /etc/nginx/sites-available/transcription << 'NGINX'
server {
    listen 80;
    server_name yalitranscription.duckdns.org 146.190.57.51;

    client_max_body_size 5000M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API - proxy to port 5000
    location /api {
        proxy_pass http://127.0.0.1:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'http://yalitranscription.duckdns.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
NGINX

nginx -t && systemctl reload nginx

# Open backend port in firewall
echo "Opening backend port..."
ufw allow 5000

# Restart everything
echo ""
echo "Restarting services..."
pm2 restart backend
pkill -f "next" 2>/dev/null || true
cd /var/app/transcription-system/transcription-system/frontend/main-app
nohup npm run dev > /var/log/frontend.log 2>&1 &

echo "Waiting for services..."
sleep 15

# Check status
echo ""
echo "======================================"
echo "📋 STATUS CHECK"
echo "======================================"
netstat -tulpn | grep -E "3002|5000"

echo ""
echo "======================================"
echo "✅ FIX COMPLETE!"
echo "======================================"
echo ""
echo "Your app should now work properly at:"
echo "  http://yalitranscription.duckdns.org"
echo ""
echo "API is accessible at:"
echo "  http://yalitranscription.duckdns.org/api"
echo ""
echo "Test it by:"
echo "1. Going to http://yalitranscription.duckdns.org"
echo "2. Creating a new user"
echo "3. Navigating to different pages"
echo ""