#!/bin/bash

# ============================================
# FIX BACKEND AND DATABASE CONNECTION
# ============================================

echo "============================================"
echo "🔧 FIXING BACKEND AND DATABASE"
echo "============================================"
echo ""

# 1. First, let's check what databases exist
echo "1️⃣ Checking existing databases..."
sudo -u postgres psql -c "\l" | grep transcription

# 2. Stop backend
echo "2️⃣ Stopping backend..."
pm2 delete backend 2>/dev/null || true
sleep 2

# 3. Fix PostgreSQL authentication
echo "3️⃣ Fixing PostgreSQL authentication..."
sudo -u postgres psql << 'EOF'
-- Check if database exists, if not create it
SELECT 'CREATE DATABASE transcription_system' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'transcription_system')\gexec

-- Connect to the database
\c transcription_system

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
GRANT ALL ON SCHEMA public TO transcription_user;

-- Ensure user can create tables
ALTER USER transcription_user CREATEDB;

-- Show users
\du
EOF

# 4. Run migrations to create tables
echo "4️⃣ Creating database tables..."
cd /var/app/transcription-system/transcription-system/backend

# Create migrations if they don't exist
if [ ! -d "migrations" ]; then
    mkdir -p migrations
fi

# Create users table migration
cat > migrations/001_create_users_table.sql << 'EOF'
-- Create users table if not exists
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

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on transcriber_code
CREATE INDEX IF NOT EXISTS idx_users_transcriber_code ON users(transcriber_code);

-- Insert default admin user if not exists
INSERT INTO users (name, email, password, permissions)
SELECT 'Admin', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'ABCDEF'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com'
);
EOF

# Run the migration
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -f migrations/001_create_users_table.sql

# 5. Fix backend environment
echo "5️⃣ Setting up backend environment..."
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
ALLOWED_ORIGINS=http://146.190.57.51,http://localhost:3002,http://localhost:3004,http://yalitranscription.duckdns.org
MAX_FILE_SIZE=5000MB
UPLOAD_DIR=/var/app/uploads
TEMP_DIR=/var/app/temp
EOF

# 6. Rebuild backend
echo "6️⃣ Building backend..."
npm run build

# 7. Start backend
echo "7️⃣ Starting backend..."
pm2 start dist/server.js --name backend
sleep 5

# 8. Test database connection
echo "8️⃣ Testing database connection..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'transcription_system',
  user: 'transcription_user',
  password: 'transcription_pass'
});
pool.query('SELECT COUNT(*) FROM users', (err, res) => {
  if (err) {
    console.log('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected! Users in database:', res.rows[0].count);
  }
  pool.end();
});
"

# 9. Test API endpoints
echo ""
echo "9️⃣ Testing API endpoints..."
echo "Health check:"
curl -s http://localhost:5000/api/health | head -20

echo ""
echo "Dev users endpoint:"
curl -s http://localhost:5000/api/dev/users | head -20

# 10. Fix nginx configuration for DuckDNS
echo ""
echo "🔟 Updating nginx for DuckDNS domain..."
cat > /etc/nginx/sites-available/transcription << 'EOF'
server {
    listen 80;
    server_name 146.190.57.51 yalitranscription.duckdns.org;

    client_max_body_size 5000M;
    client_body_timeout 3600s;
    proxy_read_timeout 3600s;
    proxy_connect_timeout 3600s;
    proxy_send_timeout 3600s;

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
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Dev endpoints
    location /dev {
        proxy_pass http://localhost:5000/dev;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Reload nginx
nginx -t && systemctl reload nginx

# 11. Save PM2 and show status
pm2 save
pm2 list

echo ""
echo "============================================"
echo "📊 FINAL STATUS CHECK"
echo "============================================"

# Backend check
if curl -s http://localhost:5000/api/health | grep -q "success"; then
    echo "✅ Backend API: Working"
else
    echo "❌ Backend API: Not working"
fi

# Database check
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -c "SELECT COUNT(*) FROM users;" 2>/dev/null && echo "✅ Database: Connected" || echo "❌ Database: Not connected"

# Frontend check
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 | grep -q "200"; then
    echo "✅ Frontend: Working"
else
    echo "❌ Frontend: Not working"
fi

echo ""
echo "============================================"
echo "✅ BACKEND AND DATABASE FIX COMPLETE!"
echo "============================================"
echo ""
echo "Your sites should now work at:"
echo "👉 http://146.190.57.51/"
echo "👉 http://yalitranscription.duckdns.org/"
echo ""
echo "Dev portal:"
echo "👉 http://146.190.57.51:5000/dev"
echo "============================================"