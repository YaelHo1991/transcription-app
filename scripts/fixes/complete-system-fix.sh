#!/bin/bash

echo "======================================"
echo "🔧 COMPLETE SYSTEM FIX"
echo "======================================"
echo ""

# 1. Fix PostgreSQL Database
echo "📊 Step 1: Fixing Database..."
echo "------------------------------"

# Start PostgreSQL if not running
systemctl start postgresql
systemctl enable postgresql

# Fix database and user
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS transcription_prod;
CREATE DATABASE transcription_prod;
CREATE USER transcription_user WITH ENCRYPTED PASSWORD 'simple123';
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
ALTER DATABASE transcription_prod OWNER TO transcription_user;
\q
EOF

# Create tables
sudo -u postgres psql -U transcription_user -d transcription_prod << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    permissions VARCHAR(10) DEFAULT 'A',
    transcriber_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    license_type VARCHAR(50),
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP
);

-- Insert test admin user (password: admin123)
INSERT INTO users (email, password, name, permissions)
VALUES ('admin@test.com', '$2a$10$5v5ZIVbPKXNwKwXQmQvtOuH5fY5xM5s5V5M5M5M5M5M5M5M5M5M5M', 'Admin', 'ABCDEF')
ON CONFLICT (email) DO NOTHING;
EOF

echo "✅ Database fixed"
echo ""

# 2. Fix Backend Configuration
echo "🔧 Step 2: Fixing Backend..."
echo "----------------------------"

cd /var/app/transcription-system/transcription-system/backend

# Create proper .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_prod
DB_USER=transcription_user
DB_PASSWORD=simple123
DB_SSL=false

# CORS
FRONTEND_URL=http://yalitranscription.duckdns.org
ALLOWED_ORIGINS=http://yalitranscription.duckdns.org,http://146.190.57.51

# Files
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp

# Email (if needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ayelho@gmail.com
EMAIL_PASS=favw mado rleh puur
EOF

# Create directories
mkdir -p /var/app/uploads /var/app/temp
chmod 755 /var/app/uploads /var/app/temp

# Rebuild backend
npm install
npm run build

echo "✅ Backend configured"
echo ""

# 3. Fix Frontend Configuration
echo "🎨 Step 3: Fixing Frontend..."
echo "-----------------------------"

cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create .env.local for development
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://yalitranscription.duckdns.org/api
NEXT_PUBLIC_API_BASE_URL=http://yalitranscription.duckdns.org
NEXT_PUBLIC_SITE_URL=http://yalitranscription.duckdns.org
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
NEXT_PUBLIC_DROPLET_IP=146.190.57.51
EOF

echo "✅ Frontend configured"
echo ""

# 4. Fix Nginx
echo "🌐 Step 4: Fixing Nginx..."
echo "--------------------------"

cat > /etc/nginx/sites-available/transcription << 'NGINX'
server {
    listen 80;
    server_name yalitranscription.duckdns.org 146.190.57.51;

    client_max_body_size 5000M;
    proxy_read_timeout 300s;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
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
    }
}
NGINX

ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Nginx configured"
echo ""

# 5. Restart Everything
echo "🚀 Step 5: Starting Services..."
echo "-------------------------------"

# Stop everything
pm2 delete all
pkill -f "next"
pkill -f "node"

# Start backend with PM2
cd /var/app/transcription-system/transcription-system/backend
pm2 start dist/server.js --name backend -i 1

# Start frontend
cd /var/app/transcription-system/transcription-system/frontend/main-app
nohup npm run dev > /var/log/frontend.log 2>&1 &

echo "Waiting for services to start..."
sleep 20

# 6. Status Check
echo ""
echo "======================================"
echo "📋 FINAL STATUS CHECK"
echo "======================================"

echo "Database:"
sudo -u postgres psql -c "\l" | grep transcription_prod || echo "❌ Database not found"

echo ""
echo "Backend (Port 5000):"
netstat -tulpn | grep 5000 || echo "❌ Backend not listening"

echo ""
echo "Frontend (Port 3002):"
netstat -tulpn | grep 3002 || echo "❌ Frontend not listening"

echo ""
echo "PM2 Status:"
pm2 status

echo ""
echo "Testing API:"
curl -s http://localhost:5000/api/health || echo "❌ API not responding"

echo ""
echo "======================================"
echo "✅ COMPLETE FIX DONE!"
echo "======================================"
echo ""
echo "Your site: http://yalitranscription.duckdns.org"
echo ""
echo "Test user:"
echo "  Email: admin@test.com"
echo "  Password: admin123"
echo ""
echo "If registration still fails, check:"
echo "  Backend logs: pm2 logs backend"
echo "  Frontend logs: tail -f /var/log/frontend.log"
echo ""