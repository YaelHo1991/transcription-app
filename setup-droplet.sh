#!/bin/bash

# Digital Ocean Droplet Initial Setup Script
# Run this ONCE on a fresh Ubuntu droplet
# Usage: ssh root@YOUR_DROPLET_IP 'bash -s' < setup-droplet.sh

echo "🔧 Setting up Digital Ocean Droplet for Transcription System..."

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE transcription_system;
CREATE USER transcription_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
EOF

# Install Nginx (optional, for reverse proxy)
apt-get install -y nginx

# Create application directory
mkdir -p /var/app/transcription-system
mkdir -p /var/app/storage
mkdir -p /var/log/pm2

# Set up Nginx configuration (optional)
cat > /etc/nginx/sites-available/transcription << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Media files
    location /media {
        alias /var/app/storage/media;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Set up firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3002
ufw allow 5000
ufw --force enable

# Set up PM2 to start on boot
pm2 startup systemd

echo "✅ Droplet setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/app/transcription-system"
echo "2. Create .env.production file with your configuration"
echo "3. Run: npm install in both backend and frontend directories"
echo "4. Run: pm2 start ecosystem.config.js --env production"
echo "5. Your app will be available at http://YOUR_DROPLET_IP"