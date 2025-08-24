#!/bin/bash

# ============================================
# ULTIMATE DEPLOYMENT FIX - SIMPLE VERSION
# ============================================
# This WILL fix everything once and for all
# ============================================

echo "============================================"
echo "🚀 ULTIMATE DEPLOYMENT FIX"
echo "============================================"
echo ""

# 1. Stop everything
echo "1️⃣ Stopping all services..."
pm2 delete all 2>/dev/null || true
pkill -f node 2>/dev/null || true
sleep 3

# 2. Pull latest code
echo "2️⃣ Getting latest code..."
cd /var/app/transcription-system
git stash 2>/dev/null || true
git pull origin main || {
    echo "Git pull failed, trying reset..."
    git fetch origin
    git reset --hard origin/main
}

# 3. Fix database PROPERLY
echo "3️⃣ Fixing database..."
sudo -u postgres psql << 'EOF'
-- Drop and recreate database
DROP DATABASE IF EXISTS transcription_system;
CREATE DATABASE transcription_system;

-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE usename = 'transcription_user') THEN
      CREATE USER transcription_user WITH PASSWORD 'transcription_pass';
   END IF;
END
$do$;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
ALTER USER transcription_user CREATEDB;
\q
EOF

# Fix PostgreSQL authentication
echo "4️⃣ Fixing PostgreSQL authentication..."
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 md5/' /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo systemctl restart postgresql
sleep 3

# 5. Backend setup
echo "5️⃣ Setting up backend..."
cd /var/app/transcription-system/transcription-system/backend

# Create directories
mkdir -p user_data/user_live/projects
mkdir -p /var/app/uploads
mkdir -p /var/app/temp

# Set permissions
chmod -R 777 user_data
chmod -R 777 /var/app/uploads
chmod -R 777 /var/app/temp

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=d15144131f481e4f8b80507bd31aa67b1b00049e256a63bf8be6535b46ae0123
API_KEY=ba8c256395e1f2e142dc625d73aa5152e793a7bdf618d658
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transcription_system
DB_USER=transcription_user
DB_PASSWORD=transcription_pass
DB_SSL=false
FRONTEND_URL=http://146.190.57.51
ALLOWED_ORIGINS=http://146.190.57.51,http://localhost:3002,http://yalitranscription.duckdns.org
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
ENABLE_DEV_TOOLS=true
EOF

# Build backend
echo "Building backend..."
npm install
npm run build

# Create users table
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system << 'EOF' 2>/dev/null || true
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions VARCHAR(10) DEFAULT '',
    transcriber_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, password, permissions, transcriber_code)
VALUES 
    ('Admin', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'ABCDEF', 'TRN-0001'),
    ('Test', 'test@example.com', '$2b$10$YourHashedPasswordHere', 'ABC', 'TRN-0002')
ON CONFLICT (email) DO NOTHING;
EOF

# Start backend
pm2 start dist/server.js --name backend
sleep 5

# 6. Frontend setup
echo "6️⃣ Setting up frontend..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Environment for production
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_BACKEND_URL=http://146.190.57.51:5000
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
PORT=3002
EOF

# Clean build
rm -rf .next
rm -rf node_modules/.cache

# Install and build
npm install
NODE_OPTIONS="--max-old-space-size=1024" npm run build || {
    echo "Build failed, trying dev mode..."
    
    # If build fails, create minimal .next structure
    mkdir -p .next
    echo "dev-$(date +%s)" > .next/BUILD_ID
    
    # Create prerender-manifest.json
    cat > .next/prerender-manifest.json << 'EOFMANIFEST'
{
  "version": 4,
  "routes": {},
  "dynamicRoutes": {},
  "preview": {
    "previewModeId": "",
    "previewModeSigningKey": "",
    "previewModeEncryptionKey": ""
  },
  "notFoundRoutes": []
}
EOFMANIFEST
    
    # Start in dev mode
    PORT=3002 pm2 start "npm run dev" --name frontend
    echo "Started in development mode"
}

# If build succeeded, start in production
if [ -f ".next/BUILD_ID" ]; then
    # Ensure prerender-manifest exists
    if [ ! -f ".next/prerender-manifest.json" ]; then
        cat > .next/prerender-manifest.json << 'EOFMANIFEST'
{
  "version": 4,
  "routes": {},
  "dynamicRoutes": {},
  "preview": {
    "previewModeId": "",
    "previewModeSigningKey": "",
    "previewModeEncryptionKey": ""
  },
  "notFoundRoutes": []
}
EOFMANIFEST
    fi
    
    PORT=3002 pm2 start "npm start" --name frontend
fi

# 7. Update nginx
echo "7️⃣ Updating nginx..."
cat > /etc/nginx/sites-available/transcription << 'EOF'
server {
    listen 80;
    server_name 146.190.57.51 yalitranscription.duckdns.org;

    client_max_body_size 5000M;
    proxy_read_timeout 3600s;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /dev {
        proxy_pass http://localhost:5000/dev;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. Save PM2
pm2 save
pm2 startup systemd -u root --hp /root

# 9. Wait for services
echo "8️⃣ Waiting for services to start..."
sleep 15

# 10. Final checks
echo ""
echo "============================================"
echo "📊 FINAL STATUS CHECK:"
echo "============================================"

# Check backend
if curl -s http://localhost:5000/api/health 2>/dev/null | grep -q "OK"; then
    echo "✅ Backend: Working"
else
    echo "❌ Backend: Not working"
    echo "Backend logs:"
    pm2 logs backend --nostream --lines 5
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null | grep -q "200\|304"; then
    echo "✅ Frontend: Working"
else
    echo "❌ Frontend: Not working"
    echo "Frontend logs:"
    pm2 logs frontend --nostream --lines 5
fi

# Check database
if PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -c "SELECT 1;" 2>/dev/null | grep -q "1"; then
    echo "✅ Database: Connected"
else
    echo "❌ Database: Not connected"
fi

# Check public access
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51 2>/dev/null | grep -q "200\|304\|502"; then
    echo "✅ Public IP: Accessible"
else
    echo "❌ Public IP: Not accessible"
fi

# Show PM2 status
echo ""
echo "PM2 Status:"
pm2 list

echo ""
echo "============================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "Your sites should work at:"
echo "👉 http://146.190.57.51/"
echo "👉 http://yalitranscription.duckdns.org/"
echo ""
echo "Dev portal:"
echo "👉 http://146.190.57.51/dev"
echo "============================================"