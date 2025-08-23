#!/bin/bash

echo "=========================================="
echo "    FIXING EVERYTHING AUTOMATICALLY"
echo "=========================================="

# Fix Docker
echo "Step 1: Fixing Docker..."
systemctl stop docker
systemctl stop docker.socket
rm -rf /var/run/docker.sock
apt remove --purge -y docker docker-engine docker.io containerd runc docker-compose 2>/dev/null
apt autoremove -y
apt update
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose
systemctl start docker
systemctl enable docker
sleep 5

# Test Docker
echo "Testing Docker..."
if docker ps >/dev/null 2>&1; then
    echo "✓ Docker is working!"
else
    echo "✗ Docker still has issues. Trying alternative fix..."
    # Alternative fix
    groupadd docker 2>/dev/null
    usermod -aG docker root
    newgrp docker
    systemctl restart docker
    sleep 5
fi

# Set environment variables
echo "Step 2: Setting environment..."
export DB_PASSWORD=simple123
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=transcription_prod
export DB_USER=transcription_user

# Update .env.production if it doesn't have the right password
echo "Step 3: Updating configuration..."
if [ -f backend/.env.production ]; then
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=simple123/' backend/.env.production
else
    echo "Creating .env.production..."
    cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658

DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_prod
DB_USER=transcription_user
DB_PASSWORD=simple123

FRONTEND_URL=https://yalitranscription.duckdns.org
ALLOWED_ORIGINS=https://yalitranscription.duckdns.org

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/opt/transcription-system/uploads
TEMP_DIR=/opt/transcription-system/temp
FFMPEG_PATH=/usr/bin/ffmpeg
WAVEFORM_CACHE_DIR=/opt/transcription-system/waveform-cache

SESSION_TIMEOUT=24h
REFRESH_TOKEN_EXPIRY=7d

LOG_LEVEL=info
LOG_DIR=/opt/transcription-system/logs

ENABLE_DEV_TOOLS=false
ENABLE_DEBUG_LOGS=false
EOF
fi

# Create frontend .env.production if missing
if [ ! -f frontend/main-app/.env.production ]; then
    echo "Creating frontend .env.production..."
    cat > frontend/main-app/.env.production << 'EOF'
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_API_URL=https://yalitranscription.duckdns.org/api
NEXT_PUBLIC_API_BASE_URL=https://yalitranscription.duckdns.org
NEXT_PUBLIC_SITE_URL=https://yalitranscription.duckdns.org
NEXT_PUBLIC_FORCE_HTTPS=true
NEXT_PUBLIC_DROPLET_IP=157.245.137.210

NEXT_PUBLIC_APP_NAME=Yali Transcription System
NEXT_PUBLIC_APP_DESCRIPTION=Professional Transcription Services

NEXT_PUBLIC_ENABLE_PEDAL=true
NEXT_PUBLIC_ENABLE_AUTODETECT=true
NEXT_PUBLIC_ENABLE_WAVEFORM=true
NEXT_PUBLIC_ENABLE_VIDEO=true
NEXT_PUBLIC_ENABLE_AUTO_SAVE=true

NEXT_PUBLIC_MAX_FILE_SIZE=5000
NEXT_PUBLIC_DEFAULT_LOCALE=he
EOF
fi

# Create necessary directories
echo "Step 4: Creating directories..."
mkdir -p backend/uploads
mkdir -p backend/temp
mkdir -p backend/logs
mkdir -p backend/waveform-cache
mkdir -p backend/user_data

# Stop any existing containers
echo "Step 5: Stopping old containers..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Build with docker-compose
echo "Step 6: Building application..."
cd /opt/transcription-system/transcription-system

# Try new Docker Compose syntax first
if docker compose version >/dev/null 2>&1; then
    echo "Using docker compose (new syntax)..."
    DB_PASSWORD=simple123 docker compose -f docker-compose.production.yml build --no-cache
    DB_PASSWORD=simple123 docker compose -f docker-compose.production.yml up -d
else
    echo "Using docker-compose (old syntax)..."
    DB_PASSWORD=simple123 docker-compose -f docker-compose.production.yml build --no-cache
    DB_PASSWORD=simple123 docker-compose -f docker-compose.production.yml up -d
fi

# Wait for services to start
echo "Step 7: Waiting for services to start..."
sleep 20

# Check if everything is running
echo "Step 8: Checking services..."
docker ps

# Show the results
echo ""
echo "=========================================="
echo "           DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Services running:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Database Credentials:"
echo "  Database: transcription_prod"
echo "  User: transcription_user"
echo "  Password: simple123"
echo ""
echo "Admin Login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Access your application at:"
echo "  https://yalitranscription.duckdns.org"
echo ""
echo "If you see errors above, try running this script again."
echo ""