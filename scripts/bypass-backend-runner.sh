#!/bin/bash

# ============================================
# BYPASS BACKEND RUNNER - NUCLEAR OPTION
# ============================================
# This bypasses PM2 and all the environment issues
# ============================================

echo "============================================"
echo "🚀 NUCLEAR OPTION - BYPASS RUNNER"
echo "============================================"
echo ""

# 1. Kill EVERYTHING
echo "1️⃣ Killing all Node processes..."
pm2 delete all 2>/dev/null || true
pkill -f node 2>/dev/null || true
sleep 3

# 2. Go to backend directory
cd /var/app/transcription-system/transcription-system/backend

# 3. Create a custom server runner that ignores .env.development
echo "2️⃣ Creating custom backend runner..."
cat > run-production.js << 'EOF'
// Force production mode
process.env.NODE_ENV = 'production';

// Load ONLY the production environment
require('dotenv').config({ path: '.env' });

// Override any development settings
process.env.PORT = process.env.PORT || 5000;
process.env.ENABLE_DEV_TOOLS = 'true';

console.log('🚀 Starting backend in FORCED production mode...');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_USER:', process.env.DB_USER);

// Start the server
require('./dist/server.js');
EOF

# 4. Create production environment file
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

# 5. Remove ALL other environment files
echo "4️⃣ Removing all other environment files..."
rm -f .env.development
rm -f .env.development.local
rm -f .env.local
rm -f .env.test

# 6. Start backend with our custom runner
echo "5️⃣ Starting backend with custom runner..."
pm2 start run-production.js --name backend --max-memory-restart 200M

# 7. Start frontend if not running
echo "6️⃣ Ensuring frontend is running..."
pm2 list | grep -q "frontend.*online" || {
    cd /var/app/transcription-system/transcription-system/frontend/main-app
    PORT=3002 pm2 start "npm start" --name frontend 2>/dev/null || PORT=3002 pm2 start "npm run dev" --name frontend
}

# 8. Save PM2 configuration
pm2 save

# 9. Wait for services to start
echo "7️⃣ Waiting for services to stabilize..."
sleep 10

# 10. Final test
echo ""
echo "============================================"
echo "📊 FINAL STATUS CHECK:"
echo "============================================"

# Test backend directly
echo "Testing backend on port 5000..."
nc -zv localhost 5000 2>&1 | grep -q "succeeded" && echo "✅ Port 5000: Open" || echo "❌ Port 5000: Closed"

# Test API
API_TEST=$(curl -s -m 5 http://localhost:5000/api/health 2>/dev/null)
if [ ! -z "$API_TEST" ]; then
    echo "✅ API: Responding"
    echo "   Response: $API_TEST"
else
    echo "❌ API: Not responding"
    echo "   Checking process..."
    ps aux | grep -E "node.*backend|run-production" | grep -v grep
fi

# Test dev portal
DEV_TEST=$(curl -s -m 5 http://localhost:5000/dev 2>/dev/null | head -c 50)
if [ ! -z "$DEV_TEST" ]; then
    echo "✅ Dev Portal: Available"
else
    echo "❌ Dev Portal: Not available"
fi

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 list

# Show logs
echo ""
echo "Backend logs (last 10 lines):"
pm2 logs backend --nostream --lines 10

echo ""
echo "============================================"
echo "🎯 BYPASS RUNNER DEPLOYED"
echo "============================================"
echo ""
echo "This custom runner FORCES production mode."
echo ""
echo "Try accessing:"
echo "👉 http://146.190.57.51/"
echo "👉 http://146.190.57.51/dev"
echo "👉 http://146.190.57.51/licenses"
echo ""
echo "To check logs: pm2 logs backend"
echo "============================================"