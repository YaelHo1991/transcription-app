#!/bin/bash

# ============================================
# FIX DATABASE AUTHENTICATION
# ============================================

echo "============================================"
echo "🔧 FIXING DATABASE AUTHENTICATION"
echo "============================================"
echo ""

# Fix PostgreSQL authentication
echo "1️⃣ Resetting database user password..."
sudo -u postgres psql << 'EOF'
-- Connect to the database
\c transcription_system

-- Update user password
ALTER USER transcription_user WITH PASSWORD 'transcription_pass';

-- Grant all privileges again
GRANT ALL PRIVILEGES ON DATABASE transcription_system TO transcription_user;
GRANT ALL ON SCHEMA public TO transcription_user;
ALTER USER transcription_user CREATEDB;

-- Show users to confirm
\du transcription_user
EOF

# Test connection
echo ""
echo "2️⃣ Testing database connection..."
PGPASSWORD=transcription_pass psql -h localhost -p 5432 -U transcription_user -d transcription_system -c "SELECT 'Database connection successful!' as status;" 2>&1

# If still failing, try updating pg_hba.conf
if [ $? -ne 0 ]; then
    echo ""
    echo "3️⃣ Updating PostgreSQL authentication method..."
    
    # Backup original pg_hba.conf
    sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup
    
    # Update authentication method for local connections
    sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf
    sudo sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' /etc/postgresql/*/main/pg_hba.conf
    sudo sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 md5/' /etc/postgresql/*/main/pg_hba.conf
    
    # Restart PostgreSQL
    sudo systemctl restart postgresql
    sleep 3
    
    # Test again
    echo "4️⃣ Testing connection after fix..."
    PGPASSWORD=transcription_pass psql -h localhost -p 5432 -U transcription_user -d transcription_system -c "SELECT 'Database connection successful!' as status;"
fi

# Create users table if it doesn't exist
echo ""
echo "5️⃣ Creating users table..."
PGPASSWORD=transcription_pass psql -h localhost -p 5432 -U transcription_user -d transcription_system << 'EOF'
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

-- Insert test user if not exists
INSERT INTO users (name, email, password, permissions, transcriber_code)
VALUES 
    ('Admin User', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'ABCDEF', 'TRN-0001'),
    ('Test User', 'test@example.com', '$2b$10$YourHashedPasswordHere', 'ABC', 'TRN-0002')
ON CONFLICT (email) DO NOTHING;

-- Show user count
SELECT COUNT(*) as user_count FROM users;
EOF

echo ""
echo "============================================"
echo "✅ DATABASE AUTHENTICATION FIX COMPLETE"
echo "============================================"
echo ""
echo "Now restart the backend:"
echo "pm2 restart backend"
echo "============================================"