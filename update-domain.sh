#!/bin/bash

# Domain Configuration Update Script for app.yilbh.co.il
# This script updates the server to use the new domain instead of DuckDNS

echo "========================================="
echo "Domain Update Script for app.yilbh.co.il"
echo "========================================="

# Variables
NEW_DOMAIN="app.yilbh.co.il"
OLD_DOMAIN="yalitranscription.duckdns.org"
EMAIL="ayelhb@gmail.com"  # For Let's Encrypt

echo ""
echo "Step 1: Backing up current nginx configuration..."
sudo cp /etc/nginx/sites-available/transcription /etc/nginx/sites-available/transcription.backup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "Step 2: Creating new nginx configuration..."
cat > /tmp/transcription-nginx.conf << 'EOF'
server {
    listen 80;
    server_name app.yilbh.co.il yalitranscription.duckdns.org;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name app.yilbh.co.il yalitranscription.duckdns.org;

    # SSL will be configured by certbot
    
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
echo "Step 3: Installing new nginx configuration..."
sudo cp /tmp/transcription-nginx.conf /etc/nginx/sites-available/transcription

echo ""
echo "Step 4: Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid!"
    
    echo ""
    echo "Step 5: Obtaining SSL certificate for app.yilbh.co.il..."
    sudo certbot certonly --nginx -d app.yilbh.co.il --non-interactive --agree-tos --email $EMAIL
    
    if [ $? -eq 0 ]; then
        echo "SSL certificate obtained successfully!"
        
        echo ""
        echo "Step 6: Updating nginx configuration with SSL certificates..."
        sudo certbot install --nginx -d app.yilbh.co.il --redirect --non-interactive
        
        echo ""
        echo "Step 7: Reloading nginx..."
        sudo nginx -s reload
        
        echo ""
        echo "Step 8: Updating frontend environment variables..."
        cd /home/transcription/transcription-system/frontend/main-app
        
        # Update .env.production
        if [ -f .env.production ]; then
            sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://app.yilbh.co.il/api|g" .env.production
        else
            echo "NEXT_PUBLIC_API_URL=https://app.yilbh.co.il/api" > .env.production
        fi
        
        # Update .env.local if exists
        if [ -f .env.local ]; then
            sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://app.yilbh.co.il/api|g" .env.local
        fi
        
        echo ""
        echo "Step 9: Rebuilding frontend with new domain..."
        npm run build
        
        echo ""
        echo "Step 10: Restarting services with PM2..."
        pm2 restart all
        
        echo ""
        echo "========================================="
        echo "✅ Domain update completed successfully!"
        echo "========================================="
        echo ""
        echo "Your transcription system is now available at:"
        echo "  https://app.yilbh.co.il"
        echo ""
        echo "The old domain (yalitranscription.duckdns.org) will redirect to the new domain."
        echo ""
        echo "Please test the new domain and verify everything works correctly."
        
    else
        echo "❌ Failed to obtain SSL certificate. Please check your DNS settings."
        echo "Make sure app.yilbh.co.il points to this server's IP (146.190.57.51)"
        exit 1
    fi
else
    echo "❌ Nginx configuration test failed! Restoring backup..."
    sudo cp /etc/nginx/sites-available/transcription.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/sites-available/transcription
    exit 1
fi