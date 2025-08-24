#!/bin/bash

# ============================================
# FORCE PRODUCTION MODE FOR BACKEND
# ============================================

echo "============================================"
echo "🔧 FORCING PRODUCTION MODE"
echo "============================================"
echo ""

# 1. Stop backend
echo "1️⃣ Stopping backend..."
pm2 stop backend
pm2 delete backend
sleep 2

# 2. Go to backend directory
cd /var/app/transcription-system/transcription-system/backend

# 3. Remove ALL environment files except production
echo "2️⃣ Cleaning environment files..."
rm -f .env.development
rm -f .env.local
rm -f .env.test

# 4. Create ONLY production environment
echo "3️⃣ Creating production environment..."
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

# 5. Also update the server.ts to not load .env.development
echo "4️⃣ Fixing server.ts to use production..."
sed -i "s/\.env\.development/\.env/g" dist/server.js 2>/dev/null || true

# 6. Test database connection directly
echo "5️⃣ Testing database connection..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'transcription_system',
  user: 'transcription_user',
  password: 'transcription_pass'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ Database connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connection successful!');
    console.log('   Current time from DB:', res.rows[0].now);
    process.exit(0);
  }
  pool.end();
});
"

# 7. Start backend with explicit environment
echo "6️⃣ Starting backend in production mode..."
NODE_ENV=production pm2 start dist/server.js --name backend --env production

sleep 5

# 8. Check if it's working
echo ""
echo "============================================"
echo "📊 FINAL CHECK:"
echo "============================================"

# Check API health
API_RESPONSE=$(curl -s http://localhost:5000/api/health 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "OK"; then
    echo "✅ Backend API: Working!"
    echo "   Response: $API_RESPONSE"
else
    echo "❌ Backend API: Not responding"
    echo "   Checking logs..."
    pm2 logs backend --nostream --lines 15
fi

echo ""

# Check users endpoint
USERS_RESPONSE=$(curl -s http://localhost:5000/dev/api/users 2>/dev/null | head -c 100)
if echo "$USERS_RESPONSE" | grep -q "id"; then
    echo "✅ Database: Connected and working!"
    echo "✅ Users API: Working!"
else
    echo "❌ Users API: Not working"
    echo "   Response: $USERS_RESPONSE"
fi

echo ""
echo "PM2 Status:"
pm2 list

echo ""
echo "============================================"
echo "✅ PRODUCTION MODE FORCED"
echo "============================================"
echo ""
echo "Try now:"
echo "👉 http://146.190.57.51/dev"
echo "👉 http://146.190.57.51/licenses"
echo "============================================"