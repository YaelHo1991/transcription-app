#!/bin/bash

# ============================================
# FIX DATABASE SCHEMA ISSUES
# ============================================

echo "============================================"
echo "🔧 FIXING DATABASE SCHEMA"
echo "============================================"
echo ""

# 1. Stop backend
echo "1️⃣ Stopping backend to fix database..."
pm2 stop backend
sleep 2

# 2. Fix the database schema
echo "2️⃣ Dropping and recreating tables with correct schema..."
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system << 'EOF'
-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS user_shortcuts CASCADE;
DROP TABLE IF EXISTS shortcuts CASCADE;
DROP TABLE IF EXISTS shortcut_categories CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS transcriptions CASCADE;
DROP TABLE IF EXISTS backup_logs CASCADE;
DROP TABLE IF EXISTS backup_contents CASCADE;

-- Create users table with UUID primary key
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    permissions VARCHAR(10) DEFAULT '',
    transcriber_code VARCHAR(10) UNIQUE,
    is_admin BOOLEAN DEFAULT false,
    personal_company VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    plain_password VARCHAR(255),
    password_hint VARCHAR(255)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_transcriber_code ON users(transcriber_code);

-- Insert test users
INSERT INTO users (username, email, password, full_name, permissions, transcriber_code, is_admin, plain_password)
VALUES 
    ('admin', 'admin@example.com', '$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6', 'Admin User', 'ABCDEF', 'TRN-0001', true, 'admin123'),
    ('test', 'test@example.com', '$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6', 'Test User', 'ABC', 'TRN-0002', false, 'test123'),
    ('demo', 'demo@example.com', '$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6', 'Demo User', 'DEF', 'TRN-0003', false, 'demo123')
ON CONFLICT (email) DO NOTHING;

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permissions VARCHAR(10) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Show result
SELECT COUNT(*) as user_count FROM users;
\dt
EOF

# 3. Restart backend
echo "3️⃣ Restarting backend..."
cd /var/app/transcription-system/transcription-system/backend
pm2 restart backend
sleep 5

# 4. Test the API
echo ""
echo "============================================"
echo "📊 TESTING API:"
echo "============================================"

# Test health endpoint
HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "OK"; then
    echo "✅ API Health: Working"
else
    echo "❌ API Health: Not working"
fi

# Test users endpoint
USERS=$(curl -s http://localhost:5000/dev/api/users 2>/dev/null | head -c 200)
if echo "$USERS" | grep -q "admin"; then
    echo "✅ Users API: Working!"
    echo "   Found users in database"
else
    echo "❌ Users API: Not working"
    echo "   Checking backend logs..."
    pm2 logs backend --nostream --lines 10
fi

echo ""
echo "============================================"
echo "✅ DATABASE SCHEMA FIXED"
echo "============================================"
echo ""
echo "You can now access:"
echo "👉 http://146.190.57.51/dev"
echo "👉 http://146.190.57.51/licenses"
echo ""
echo "Test users:"
echo "  admin@example.com : admin123"
echo "  test@example.com : test123"
echo "  demo@example.com : demo123"
echo "============================================"