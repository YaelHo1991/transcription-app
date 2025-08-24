#!/bin/bash

# ============================================
# COMPLETE BACKEND REBUILD
# ============================================

echo "============================================"
echo "🔨 COMPLETE BACKEND REBUILD"
echo "============================================"
echo ""

# 1. Stop and delete backend completely
echo "1️⃣ Stopping and removing backend..."
pm2 stop backend 2>/dev/null || true
pm2 delete backend 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 3

# 2. Go to backend directory
cd /var/app/transcription-system/transcription-system/backend

# 3. Clean everything
echo "2️⃣ Cleaning all build artifacts..."
rm -rf dist
rm -rf node_modules/.cache
rm -f .env.development
rm -f .env.local
rm -f .env.test
rm -f .env.development.local

# 4. Create ONLY production environment
echo "3️⃣ Creating clean production environment..."
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

# 5. Fix the source code to not load .env.development
echo "4️⃣ Fixing source code..."
if [ -f "src/server.ts" ]; then
    # Remove any reference to .env.development
    sed -i "s/\.env\.development/\.env/g" src/server.ts
    sed -i "/path:.*\.env\.development/d" src/server.ts
fi

# 6. Rebuild backend
echo "5️⃣ Rebuilding backend..."
npm run build

# 7. Verify the build doesn't reference .env.development
echo "6️⃣ Verifying build..."
if grep -q "\.env\.development" dist/server.js; then
    echo "   Found .env.development reference, removing..."
    sed -i "s/\.env\.development/\.env/g" dist/server.js
fi

# 8. Create a simple test script
echo "7️⃣ Testing database connection directly..."
cat > test-db.js << 'EOF'
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
    console.error('❌ Database test failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database test successful!');
    console.log('   Users in database:', res.rows[0].count);
    process.exit(0);
  }
  pool.end();
});
EOF

node test-db.js

# 9. Start backend with explicit production environment
echo "8️⃣ Starting backend in production mode..."
NODE_ENV=production PORT=5000 pm2 start dist/server.js --name backend --node-args="--max-old-space-size=256"

# Wait for startup
sleep 8

# 10. Test everything
echo ""
echo "============================================"
echo "📊 FINAL TEST:"
echo "============================================"

# Check if backend is running
if pm2 list | grep -q "backend.*online"; then
    echo "✅ Backend process: Running"
else
    echo "❌ Backend process: Not running"
fi

# Test health endpoint
echo ""
echo "Testing API health..."
HEALTH=$(curl -s -m 5 http://localhost:5000/api/health 2>/dev/null)
if [ ! -z "$HEALTH" ]; then
    echo "✅ API Response received"
    echo "   Response: $HEALTH"
else
    echo "❌ No API response"
fi

# Test dev endpoint
echo ""
echo "Testing dev portal..."
DEV_RESPONSE=$(curl -s -m 5 http://localhost:5000/dev 2>/dev/null | head -c 100)
if echo "$DEV_RESPONSE" | grep -q "Development"; then
    echo "✅ Dev portal: Working"
else
    echo "❌ Dev portal: Not working"
fi

# Show last logs
echo ""
echo "Last backend logs:"
pm2 logs backend --nostream --lines 5

echo ""
echo "============================================"
echo "✅ REBUILD COMPLETE"
echo "============================================"
echo ""
echo "Try accessing:"
echo "👉 http://146.190.57.51/dev"
echo "👉 http://146.190.57.51/licenses"
echo ""
echo "If still not working, check logs with:"
echo "pm2 logs backend"
echo "============================================"