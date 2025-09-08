#!/bin/bash

# Domain Configuration Update Script for app.yilbh.co.il
# Fixed version - handles SSL properly

echo "========================================="
echo "Domain Update Script for app.yilbh.co.il"
echo "========================================="

# Variables
NEW_DOMAIN="app.yilbh.co.il"
OLD_DOMAIN="yalitranscription.duckdns.org"
EMAIL="ayelhb@gmail.com"

echo ""
echo "Step 1: Backing up current nginx configuration..."
if [ -f /etc/nginx/sites-available/transcription ]; then
    sudo cp /etc/nginx/sites-available/transcription /etc/nginx/sites-available/transcription.backup-$(date +%Y%m%d-%H%M%S)
fi

echo ""
echo "Step 2: Creating initial HTTP-only nginx configuration..."
cat > /tmp/transcription-nginx.conf << 'EOF'
server {
    listen 80;
    server_name app.yilbh.co.il yalitranscription.duckdns.org;
    
    client_max_body_size 500M;
    
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

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

echo ""
echo "Step 3: Installing nginx configuration..."
sudo cp /tmp/transcription-nginx.conf /etc/nginx/sites-available/transcription

echo ""
echo "Step 4: Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid!"
    
    echo ""
    echo "Step 5: Reloading nginx with HTTP configuration..."
    sudo nginx -s reload
    
    echo ""
    echo "Step 6: Waiting for DNS to propagate..."
    echo "Checking if app.yilbh.co.il resolves to this server..."
    
    # Try to resolve the domain
    RESOLVED_IP=$(dig +short app.yilbh.co.il @8.8.8.8 | tail -n1)
    SERVER_IP="146.190.57.51"
    
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "✅ DNS has propagated! Domain resolves to $RESOLVED_IP"
        
        echo ""
        echo "Step 7: Obtaining SSL certificate..."
        sudo certbot --nginx -d app.yilbh.co.il -d yalitranscription.duckdns.org --non-interactive --agree-tos --email $EMAIL --redirect
        
        if [ $? -eq 0 ]; then
            echo "✅ SSL certificate obtained and installed!"
        else
            echo "⚠️ SSL certificate installation failed, but site is available via HTTP"
        fi
    else
        echo "⚠️ DNS hasn't propagated yet. Domain resolves to: $RESOLVED_IP (expected: $SERVER_IP)"
        echo "The site will work via HTTP for now. Run this command later to add SSL:"
        echo "sudo certbot --nginx -d app.yilbh.co.il -d yalitranscription.duckdns.org --non-interactive --agree-tos --email $EMAIL --redirect"
    fi
    
    echo ""
    echo "Step 8: Updating frontend environment variables..."
    cd /home/transcription/transcription-system/frontend/main-app
    
    # Update .env.production
    if [ -f .env.production ]; then
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://app.yilbh.co.il/api|g" .env.production
    else
        echo "NEXT_PUBLIC_API_URL=https://app.yilbh.co.il/api" > .env.production
    fi
    
    # Also support the old domain
    echo "NEXT_PUBLIC_API_URL_ALT=https://yalitranscription.duckdns.org/api" >> .env.production
    
    echo ""
    echo "Step 9: Rebuilding frontend..."
    npm run build
    
    echo ""
    echo "Step 10: Restarting services..."
    pm2 restart all
    
    echo ""
    echo "========================================="
    echo "✅ Domain configuration updated!"
    echo "========================================="
    echo ""
    echo "Your transcription system is available at:"
    echo "  http://app.yilbh.co.il (HTTPS will be added when DNS propagates)"
    echo "  http://yalitranscription.duckdns.org (still works)"
    echo ""
    
else
    echo "❌ Nginx configuration test failed!"
    if [ -f /etc/nginx/sites-available/transcription.backup-$(date +%Y%m%d-%H%M%S) ]; then
        sudo cp /etc/nginx/sites-available/transcription.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/transcription
    fi
    exit 1
fi