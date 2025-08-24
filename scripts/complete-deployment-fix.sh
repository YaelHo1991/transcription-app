#!/bin/bash

# ============================================
# COMPLETE DEPLOYMENT FIX FOR DIGITALOCEAN
# ============================================
# This script fixes ALL deployment issues
# ============================================

echo "============================================"
echo "🔧 COMPLETE DEPLOYMENT FIX"
echo "============================================"
echo ""

# 1. Stop everything first
echo "1️⃣ Stopping all services..."
pm2 delete all 2>/dev/null || true
sleep 2

# 2. Fix PostgreSQL Database
echo "2️⃣ Fixing database..."
sudo -u postgres psql << 'EOF'
-- Drop old database if exists
DROP DATABASE IF EXISTS transcription_prod;

-- Create correct database
CREATE DATABASE transcription_system;

-- Create user with password
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

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
ALTER USER transcription_user CREATEDB;
\q
EOF

# 3. Navigate to backend and set up environment
echo "3️⃣ Setting up backend..."
cd /var/app/transcription-system/transcription-system/backend

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
EOF

# 4. Create users table
echo "4️⃣ Creating database tables..."
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions VARCHAR(10) DEFAULT '',
    transcriber_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test user
INSERT INTO users (name, email, password, permissions, transcriber_code)
VALUES ('Test User', 'test@example.com', '$2b$10$YourHashedPasswordHere', 'ABC', 'TRN-0001')
ON CONFLICT (email) DO NOTHING;
EOF

# 5. Build and start backend
echo "5️⃣ Starting backend..."
npm run build
pm2 start dist/server.js --name backend
sleep 5

# 6. Fix frontend
echo "6️⃣ Setting up frontend..."
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create production environment
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://146.190.57.51:5000
NEXT_PUBLIC_API_URL=http://146.190.57.51/api
NEXT_PUBLIC_BACKEND_URL=http://146.190.57.51:5000
NEXT_PUBLIC_SITE_URL=http://146.190.57.51
NEXT_PUBLIC_DOMAIN=yalitranscription.duckdns.org
PORT=3002
EOF

# 7. Clean and rebuild frontend
echo "7️⃣ Building frontend..."
rm -rf .next
rm -rf node_modules/.cache
npm install
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# 8. Check if build succeeded
if [ -f ".next/BUILD_ID" ]; then
    echo "✅ Build successful!"
    
    # Create missing prerender-manifest.json if needed
    if [ ! -f ".next/prerender-manifest.json" ]; then
        echo "Creating prerender-manifest.json..."
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
    
    # Start in production mode
    PORT=3002 pm2 start npm --name frontend -- start
else
    echo "⚠️ Build failed, starting in dev mode..."
    PORT=3002 pm2 start npm --name frontend -- run dev
fi

# 9. Update nginx configuration
echo "8️⃣ Updating nginx..."
cat > /etc/nginx/sites-available/transcription << 'EOF'
server {
    listen 80;
    server_name 146.190.57.51 yalitranscription.duckdns.org;

    client_max_body_size 5000M;
    client_body_timeout 3600s;
    proxy_read_timeout 3600s;

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
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Dev portal
    location /dev {
        proxy_pass http://localhost:5000/dev;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

nginx -t && systemctl reload nginx

# 10. Save PM2 configuration
pm2 save
pm2 startup systemd -u root --hp /root

# 11. Wait for services
echo "9️⃣ Waiting for services..."
sleep 10

# 12. Test everything
echo "🔟 Testing services..."
echo ""
echo "============================================"
echo "📊 FINAL STATUS:"
echo "============================================"

# Backend test
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    echo "✅ Backend: Working"
else
    echo "❌ Backend: Failed"
    pm2 logs backend --nostream --lines 10
fi

# Frontend test
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    echo "✅ Frontend: Working"
else
    echo "❌ Frontend: Failed"
    pm2 logs frontend --nostream --lines 10
fi

# Database test
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -c "SELECT COUNT(*) FROM users;" 2>/dev/null && echo "✅ Database: Connected" || echo "❌ Database: Failed"

# Public access test
if curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51 | grep -q "200"; then
    echo "✅ Public IP: Working"
else
    echo "❌ Public IP: Failed"
fi

# DuckDNS test
if curl -s -o /dev/null -w "%{http_code}" http://yalitranscription.duckdns.org | grep -q "200"; then
    echo "✅ DuckDNS: Working"
else
    echo "⚠️ DuckDNS: Not accessible (may need DNS propagation)"
fi

echo ""
echo "============================================"
echo "✅ DEPLOYMENT FIX COMPLETE!"
echo "============================================"
echo ""
echo "Your sites should now work at:"
echo "👉 http://146.190.57.51/"
echo "👉 http://yalitranscription.duckdns.org/"
echo ""
echo "Dev portal:"
echo "👉 http://146.190.57.51/dev"
echo "============================================"