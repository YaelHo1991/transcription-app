#!/bin/bash

echo "======================================"
echo "🔧 FIXING NGINX API FORWARDING"
echo "======================================"
echo ""

# Create correct Nginx configuration
cat > /etc/nginx/sites-available/transcription << 'NGINX'
server {
    listen 80;
    server_name yalitranscription.duckdns.org 146.190.57.51;

    client_max_body_size 5000M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    # Backend API - MUST BE FIRST
    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend - Everything else
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Test and reload Nginx
echo "Testing Nginx configuration..."
nginx -t

echo ""
echo "Reloading Nginx..."
systemctl reload nginx

# Test the API through domain
echo ""
echo "Testing API access:"
echo "-------------------"
echo -n "Direct backend (localhost:5000): "
curl -s http://localhost:5000/api/health | grep -o "success" && echo "✅ Working" || echo "❌ Not working"

echo -n "Through Nginx (domain/api): "
timeout 5 curl -s http://yalitranscription.duckdns.org/api/health | grep -o "success" && echo "✅ Working" || echo "❌ Not working"

echo -n "Through IP (146.190.57.51/api): "
timeout 5 curl -s http://146.190.57.51/api/health | grep -o "success" && echo "✅ Working" || echo "❌ Not working"

echo ""
echo "======================================"
echo "✅ NGINX FIXED!"
echo "======================================"
echo ""
echo "Now try registering/purchasing at:"
echo "http://yalitranscription.duckdns.org/licenses"
echo ""
echo "The API should now be accessible!"