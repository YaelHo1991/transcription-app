#!/bin/bash

# =====================================================
# SUPER SIMPLE DEPLOYMENT SCRIPT FOR TRANSCRIPTION APP
# Just run this ONE script on your new droplet!
# =====================================================

set -e  # Exit on any error

echo "======================================"
echo "🚀 TRANSCRIPTION APP DEPLOYMENT"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update System
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Step 2: Install Node.js 18
echo -e "${YELLOW}Step 2: Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
echo -e "${GREEN}✓ Node.js installed: $(node -v)${NC}"

# Step 3: Install PM2
echo -e "${YELLOW}Step 3: Installing PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 installed${NC}"

# Step 4: Install PostgreSQL
echo -e "${YELLOW}Step 4: Installing PostgreSQL...${NC}"
apt-get install -y postgresql postgresql-contrib

# Step 5: Setup Database
echo -e "${YELLOW}Step 5: Setting up database...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE transcription_prod;
CREATE USER transcription_user WITH ENCRYPTED PASSWORD 'simple123';
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
ALTER DATABASE transcription_prod OWNER TO transcription_user;
\q
EOF
echo -e "${GREEN}✓ Database created${NC}"

# Step 6: Install FFmpeg (for audio processing)
echo -e "${YELLOW}Step 6: Installing FFmpeg...${NC}"
apt-get install -y ffmpeg
echo -e "${GREEN}✓ FFmpeg installed${NC}"

# Step 7: Install Nginx
echo -e "${YELLOW}Step 7: Installing Nginx...${NC}"
apt-get install -y nginx

# Step 8: Configure Nginx
echo -e "${YELLOW}Step 8: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/transcription <<'NGINX_CONFIG'
server {
    listen 80;
    server_name 146.190.57.51 yalitranscription.duckdns.org;

    client_max_body_size 5000M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    # Frontend
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

    # Backend API
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
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONFIG

# Enable the site
ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# Step 9: Setup Firewall
echo -e "${YELLOW}Step 9: Setting up firewall...${NC}"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"

# Step 10: Create app directory
echo -e "${YELLOW}Step 10: Setting up app directories...${NC}"
mkdir -p /var/app/transcription-system
mkdir -p /var/log/pm2
mkdir -p /var/app/uploads
mkdir -p /var/app/temp
chmod 755 /var/app/uploads
chmod 755 /var/app/temp
echo -e "${GREEN}✓ Directories created${NC}"

# Step 11: Setup PM2 startup
echo -e "${YELLOW}Step 11: Configuring PM2 startup...${NC}"
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✓ PM2 startup configured${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/app/transcription-system/"
echo "2. Run: cd /var/app/transcription-system"
echo "3. Run: ./start-app.sh"
echo ""
echo "Your app will be available at:"
echo "  http://146.190.57.51"
echo "  http://yalitranscription.duckdns.org (after DNS update)"
echo ""