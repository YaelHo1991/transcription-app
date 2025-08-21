#!/bin/bash

# Simple PostgreSQL Fix Script
echo "Fixing PostgreSQL authentication..."

# Find PostgreSQL version
PG_VERSION=$(ls /etc/postgresql/ | head -1)
echo "Found PostgreSQL version: $PG_VERSION"

# Update pg_hba.conf to trust local connections
PG_CONFIG="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
echo "Updating $PG_CONFIG..."

# Backup original
cp $PG_CONFIG $PG_CONFIG.backup

# Replace md5 with trust for local connections
sed -i 's/local   all             all                                     md5/local   all             all                                     trust/' $PG_CONFIG
sed -i 's/host    all             all             127.0.0.1\/32            md5/host    all             all             127.0.0.1\/32            trust/' $PG_CONFIG
sed -i 's/host    all             all             ::1\/128                 md5/host    all             all             ::1\/128                 trust/' $PG_CONFIG

# Restart PostgreSQL
echo "Restarting PostgreSQL..."
systemctl restart postgresql

# Wait a moment
sleep 2

# Now setup the database
echo "Setting up database..."
sudo -u postgres psql << 'SQLCOMMANDS'
DROP DATABASE IF EXISTS transcription_prod;
DROP USER IF EXISTS transcription_user;
CREATE USER transcription_user WITH PASSWORD 'simple123';
CREATE DATABASE transcription_prod OWNER transcription_user;
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
\c transcription_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions VARCHAR(10),
    full_name VARCHAR(255),
    transcriber_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create admin user
INSERT INTO users (username, email, password, permissions, full_name, is_active)
VALUES (
    'admin',
    'admin@yalitranscription.com',
    crypt('admin123', gen_salt('bf')),
    'ABCDEF',
    'System Administrator',
    true
);

GRANT ALL ON SCHEMA public TO transcription_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transcription_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transcription_user;
SQLCOMMANDS

echo ""
echo "=========================================="
echo "PostgreSQL Fixed and Database Created!"
echo "=========================================="
echo ""
echo "Database: transcription_prod"
echo "User: transcription_user"
echo "Password: simple123"
echo ""
echo "Admin Login:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Now update backend/.env.production with:"
echo "DB_PASSWORD=simple123"
echo ""