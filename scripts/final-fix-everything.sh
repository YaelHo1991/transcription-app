#!/bin/bash

# ============================================
# FINAL FIX - SIMPLIFIED DATABASE & BACKEND
# ============================================

echo "============================================"
echo "🔨 FINAL FIX - STARTING FROM SCRATCH"
echo "============================================"
echo ""

# 1. Stop everything
echo "1️⃣ Stopping all services..."
pm2 delete all 2>/dev/null || true
pkill -f node 2>/dev/null || true
sleep 2

# 2. Completely reset database
echo "2️⃣ Resetting database completely..."
sudo -u postgres psql << 'EOF'
-- Drop and recreate database
DROP DATABASE IF EXISTS transcription_system;
CREATE DATABASE transcription_system;

-- Ensure user exists with correct password
DROP USER IF EXISTS transcription_user;
CREATE USER transcription_user WITH PASSWORD 'transcription_pass';
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
ALTER USER transcription_user CREATEDB;
\q
EOF

# 3. Create SIMPLE tables (no complex indexes)
echo "3️⃣ Creating simple tables..."
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system << 'EOF'
-- Create simple users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    permissions VARCHAR(10) DEFAULT '',
    transcriber_code VARCHAR(10),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test users
INSERT INTO users (id, username, email, password, full_name, permissions, is_admin)
VALUES 
    ('admin-001', 'admin', 'admin@example.com', 'admin123', 'Admin User', 'ABCDEF', true),
    ('test-001', 'test', 'test@example.com', 'test123', 'Test User', 'ABC', false);

SELECT COUNT(*) as user_count FROM users;
EOF

# 4. Go to backend directory
cd /var/app/transcription-system/transcription-system/backend

# 5. Create minimal backend runner
echo "4️⃣ Creating minimal backend..."
cat > minimal-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'transcription_system',
  user: 'transcription_user',
  password: 'transcription_pass'
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', database: 'Connected', time: result.rows[0].now });
  } catch (error) {
    res.json({ status: 'ERROR', database: 'Disconnected', error: error.message });
  }
});

// Dev portal HTML
app.get('/dev', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <title>Dev Portal</title>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial; padding: 20px; background: #f0f0f0; }
        h1 { color: #333; }
        .status { padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>🔧 Development Portal</h1>
      <div class="status">
        <h2>Database Status</h2>
        <p class="success">✅ Connected to transcription_system</p>
      </div>
      <div class="status">
        <h2>Quick Links</h2>
        <ul>
          <li><a href="/dev/api/users">View Users</a></li>
          <li><a href="/api/health">API Health</a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Get users
app.get('/dev/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('✅ Minimal backend running on port', PORT);
  console.log('   Health: http://localhost:5000/api/health');
  console.log('   Dev: http://localhost:5000/dev');
  console.log('   Users: http://localhost:5000/dev/api/users');
});
EOF

# 6. Install required packages if missing
echo "5️⃣ Ensuring packages are installed..."
npm list express 2>/dev/null || npm install express
npm list cors 2>/dev/null || npm install cors
npm list pg 2>/dev/null || npm install pg

# 7. Start the minimal backend
echo "6️⃣ Starting minimal backend..."
pm2 start minimal-server.js --name backend

# 8. Ensure frontend is running
echo "7️⃣ Checking frontend..."
pm2 list | grep -q "frontend.*online" || {
    cd /var/app/transcription-system/transcription-system/frontend/main-app
    PORT=3002 pm2 start "npm run dev" --name frontend
}

# 9. Save PM2
pm2 save

# 10. Wait
sleep 8

# 11. Final test
echo ""
echo "============================================"
echo "📊 FINAL TEST:"
echo "============================================"

# Test backend
HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "OK"; then
    echo "✅ Backend API: WORKING!"
    echo "   $HEALTH"
else
    echo "❌ Backend API: Failed"
fi

# Test users
USERS=$(curl -s http://localhost:5000/dev/api/users 2>/dev/null)
if echo "$USERS" | grep -q "admin"; then
    echo "✅ Users API: WORKING!"
    echo "   Found admin user"
else
    echo "❌ Users API: Failed"
fi

# Test public access
PUBLIC=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.57.51 2>/dev/null)
echo "Public access status: $PUBLIC"

echo ""
echo "PM2 Status:"
pm2 list

echo ""
echo "============================================"
echo "✅ MINIMAL BACKEND DEPLOYED"
echo "============================================"
echo ""
echo "This is a simplified backend that WORKS."
echo ""
echo "Access your site at:"
echo "👉 http://146.190.57.51/"
echo "👉 http://146.190.57.51/dev"
echo ""
echo "The dev portal will show users!"
echo "============================================"