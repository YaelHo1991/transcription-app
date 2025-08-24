#!/bin/bash

echo "Fixing Nginx configuration..."

# Create correct Nginx config
cat > /etc/nginx/sites-available/transcription << 'EOF'
server {
    listen 80;
    server_name 146.190.57.51 yalitranscription.duckdns.org;

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

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploads
    location /uploads {
        proxy_pass http://127.0.0.1:5000/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/transcription

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Nginx fixed! Your site should work now."
echo "Try accessing: http://146.190.57.51"