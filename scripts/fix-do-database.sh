#!/bin/bash

echo "Fixing Digital Ocean Database..."

ssh root@146.190.57.51 << 'EOF'
cd /var/app/transcription-system/transcription-system/backend

# Add missing columns if they don't exist
PGPASSWORD=transcription_pass psql -h localhost -U transcription_user -d transcription_system << SQL
-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_company VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_company VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS transcriber_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Show table structure
\d users
SQL

echo "Database fixed!"

# Restart backend
pm2 restart backend
pm2 logs backend --lines 10

EOF

echo "Fix complete!"