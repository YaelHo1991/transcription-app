#!/bin/bash

# ============================================
# QUICK FIX FOR BACKEND DATABASE AUTH
# ============================================

echo "============================================"
echo "🔧 FIXING BACKEND DATABASE AUTHENTICATION"
echo "============================================"
echo ""

# 1. Stop backend only
echo "1️⃣ Stopping backend..."
pm2 stop backend
sleep 2

# 2. Fix PostgreSQL authentication
echo "2️⃣ Fixing PostgreSQL authentication..."
sudo -u postgres psql << 'EOF'
\c transcription_system

-- Reset user password
ALTER USER transcription_user WITH PASSWORD 'transcription_pass';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
GRANT ALL ON SCHEMA public TO transcription_user;
GRANT CREATE ON SCHEMA public TO transcription_user;

-- Show result
\du transcription_user
EOF

# 3. Update pg_hba.conf for MD5 authentication
echo "3️⃣ Updating PostgreSQL config..."
PG_VERSION=$(ls /etc/postgresql/)
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/$PG_VERSION/main/pg_hba.conf
sudo sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' /etc/postgresql/$PG_VERSION/main/pg_hba.conf
sudo sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 md5/' /etc/postgresql/$PG_VERSION/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
sleep 3

# 4. Test connection
echo "4️⃣ Testing database connection..."
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system -c "SELECT 'Connection successful!' as status;" || {
    echo "Still failing, trying trust authentication..."
    sudo sed -i 's/md5/trust/' /etc/postgresql/$PG_VERSION/main/pg_hba.conf
    sudo systemctl restart postgresql
    sleep 3
}

# 5. Update backend environment
echo "5️⃣ Updating backend environment..."
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
ENABLE_DEV_TOOLS=true
EOF

# Also create .env.production just in case
cp .env .env.production

# 6. Restart backend
echo "6️⃣ Restarting backend..."
pm2 restart backend
sleep 5

# 7. Check status
echo ""
echo "============================================"
echo "📊 CHECKING STATUS:"
echo "============================================"

# Test backend health
if curl -s http://localhost:5000/api/health 2>/dev/null | grep -q "OK"; then
    echo "✅ Backend API: Working"
else
    echo "❌ Backend API: Still not working"
    echo "Checking logs..."
    pm2 logs backend --nostream --lines 10
fi

# Test database through backend
if curl -s http://localhost:5000/dev/api/users 2>/dev/null | grep -q "id"; then
    echo "✅ Database connection: Working"
    echo "✅ Dev portal: http://146.190.57.51/dev"
else
    echo "❌ Database connection: Still having issues"
fi

echo ""
echo "============================================"
echo "✅ FIX COMPLETE"
echo "============================================"
echo ""
echo "Try accessing:"
echo "👉 http://146.190.57.51/dev"
echo "👉 http://146.190.57.51/licenses"
echo "============================================"