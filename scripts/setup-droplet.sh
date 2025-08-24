#!/bin/bash

# Digital Ocean Droplet Setup Script
# Run this script on a fresh Ubuntu droplet to set up the transcription system

set -e

echo "🚀 Starting Digital Ocean Droplet Setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install nginx
echo "📦 Installing nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install git
echo "📦 Installing git..."
sudo apt install -y git

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/transcription-system
sudo chown $USER:$USER /opt/transcription-system

# Clone repository
echo "📥 Cloning repository..."
cd /opt
git clone https://github.com/YaelHo1991/transcription-app.git transcription-system
cd transcription-system

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE transcription_prod;
CREATE USER transcription_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
EOF

# Setup backend
echo "⚙️ Setting up backend..."
cd transcription-system/backend
npm install
npm run build

# Copy production environment file
echo "📋 Setting up environment variables..."
cp .env.production .env
echo "⚠️ IMPORTANT: Edit /opt/transcription-system/transcription-system/backend/.env with your production values!"

# Setup frontend
echo "⚙️ Setting up frontend..."
cd ../frontend/main-app
npm install
npm run build

# Copy production environment file
cp .env.production .env.local
echo "⚠️ IMPORTANT: Edit /opt/transcription-system/transcription-system/frontend/main-app/.env.local with your production values!"

# Setup PM2 for backend
echo "🔧 Setting up PM2 for backend..."
cd /opt/transcription-system/transcription-system/backend
pm2 start npm --name "transcription-backend" -- start
pm2 save
pm2 startup

# Setup PM2 for frontend
echo "🔧 Setting up PM2 for frontend..."
cd /opt/transcription-system/transcription-system/frontend/main-app
pm2 start npm --name "transcription-frontend" -- start
pm2 save

# Setup nginx configuration
echo "🔧 Setting up nginx..."
sudo tee /etc/nginx/sites-available/transcription <<EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Upload size limit
    client_max_body_size 5000M;
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create directories for uploads and temp files
echo "📁 Creating upload directories..."
sudo mkdir -p /opt/transcription-system/uploads
sudo mkdir -p /opt/transcription-system/temp
sudo mkdir -p /opt/transcription-system/waveform-cache
sudo mkdir -p /opt/transcription-system/logs
sudo mkdir -p /opt/transcription-system/backups
sudo chown -R $USER:$USER /opt/transcription-system/

# Setup firewall
echo "🔒 Setting up firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Setup complete!"
echo ""
echo "⚠️ IMPORTANT NEXT STEPS:"
echo "1. Edit backend environment file: /opt/transcription-system/transcription-system/backend/.env"
echo "2. Edit frontend environment file: /opt/transcription-system/transcription-system/frontend/main-app/.env.local"
echo "3. Update the database password in PostgreSQL and .env files"
echo "4. Set up SSL with Let's Encrypt: sudo certbot --nginx -d yourdomain.com"
echo "5. Run database migrations: cd /opt/transcription-system/transcription-system/backend && npm run migrate"
echo ""
echo "To check service status:"
echo "  pm2 status"
echo "  sudo systemctl status nginx"
echo ""
echo "To view logs:"
echo "  pm2 logs transcription-backend"
echo "  pm2 logs transcription-frontend"