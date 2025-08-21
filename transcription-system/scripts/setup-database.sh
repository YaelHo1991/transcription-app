#!/bin/bash

# ============================================
# PostgreSQL Database Setup Script
# For DigitalOcean Droplet
# ============================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${1:-transcription_prod}"
DB_USER="${2:-transcription_user}"
DB_PASSWORD="${3}"
DB_HOST="${4:-localhost}"
DB_PORT="${5:-5432}"
PROJECT_DIR="/opt/transcription-system"
LOG_FILE="/var/log/database-setup.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a $LOG_FILE
}

print_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a $LOG_FILE
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a $LOG_FILE
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1" | tee -a $LOG_FILE
}

# Generate secure password if not provided
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Validate inputs
if [ -z "$DB_PASSWORD" ]; then
    print_warning "No password provided. Generating secure password..."
    DB_PASSWORD=$(generate_password)
    print_info "Generated password: $DB_PASSWORD"
    print_warning "SAVE THIS PASSWORD! You'll need it for .env.production"
fi

# Start setup
echo "============================================" | tee -a $LOG_FILE
echo "PostgreSQL Database Setup" | tee -a $LOG_FILE
echo "Time: $(date)" | tee -a $LOG_FILE
echo "Database: $DB_NAME" | tee -a $LOG_FILE
echo "User: $DB_USER" | tee -a $LOG_FILE
echo "============================================" | tee -a $LOG_FILE

# Step 1: Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib postgresql-client
    
    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    print_status "PostgreSQL installed successfully"
else
    print_info "PostgreSQL is already installed"
fi

# Step 2: Configure PostgreSQL
print_status "Configuring PostgreSQL..."

# Get PostgreSQL version
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1 | cut -d. -f1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

# Backup original configs
cp $PG_CONFIG_DIR/postgresql.conf $PG_CONFIG_DIR/postgresql.conf.backup
cp $PG_CONFIG_DIR/pg_hba.conf $PG_CONFIG_DIR/pg_hba.conf.backup

# Configure PostgreSQL for production
cat >> $PG_CONFIG_DIR/postgresql.conf << EOF

# Transcription System Production Settings
# Added on $(date)

# Connection settings
listen_addresses = 'localhost'
max_connections = 200
superuser_reserved_connections = 3

# Memory settings (adjust based on your droplet RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%m [%p] %q%u@%d '
log_timezone = 'UTC'

# Performance
effective_io_concurrency = 200
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4

# Enable SSL (optional but recommended)
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
EOF

# Configure authentication
if ! grep -q "$DB_USER" $PG_CONFIG_DIR/pg_hba.conf; then
    # Add authentication for our database user
    sed -i "/# Database administrative login/a local   $DB_NAME     $DB_USER                                md5" $PG_CONFIG_DIR/pg_hba.conf
    sed -i "/# IPv4 local connections:/a host    $DB_NAME     $DB_USER        127.0.0.1/32            md5" $PG_CONFIG_DIR/pg_hba.conf
fi

# Restart PostgreSQL to apply changes
systemctl restart postgresql

print_status "PostgreSQL configured successfully"

# Step 3: Create database and user
print_status "Creating database and user..."

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_warning "Database '$DB_NAME' already exists"
    read -p "Drop and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS $DB_NAME;
EOF
        print_info "Database dropped"
    else
        print_info "Keeping existing database"
    fi
fi

# Create user and database
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database and set up permissions
\c $DB_NAME

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

print_status "Database and user created successfully"

# Step 4: Create required tables
print_status "Creating database tables..."

# Create base tables SQL
TEMP_SQL="/tmp/create_tables_$(date +%s).sql"

cat > $TEMP_SQL << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions VARCHAR(10),
    full_name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),
    transcriber_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_transcriber_code ON users(transcriber_code);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users(permissions);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    transcriber_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    file_path VARCHAR(500),
    file_size BIGINT,
    duration INTEGER,
    audio_url TEXT,
    waveform_url TEXT,
    backup_count INTEGER DEFAULT 0,
    last_backup TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_transcriber_code ON projects(transcriber_code);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_current BOOLEAN DEFAULT true,
    word_count INTEGER,
    character_count INTEGER,
    blocks_count INTEGER,
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_project_id ON transcriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_version ON transcriptions(version);
CREATE INDEX IF NOT EXISTS idx_transcriptions_is_current ON transcriptions(is_current);

-- Speakers table
CREATE TABLE IF NOT EXISTS speakers (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    speaker_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),
    shortcuts JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, speaker_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_speakers_project_id ON speakers(project_id);

-- Remarks table
CREATE TABLE IF NOT EXISTS remarks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    block_id VARCHAR(100),
    content TEXT NOT NULL,
    type VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_remarks_project_id ON remarks(project_id);
CREATE INDEX IF NOT EXISTS idx_remarks_block_id ON remarks(block_id);
CREATE INDEX IF NOT EXISTS idx_remarks_resolved ON remarks(resolved);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mimetype VARCHAR(100),
    size BIGINT,
    path VARCHAR(1000),
    url TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    upload_type VARCHAR(50),
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_project_id ON file_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_processing_status ON file_uploads(processing_status);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    permissions VARCHAR(10) NOT NULL,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    payment_status VARCHAR(50),
    payment_amount DECIMAL(10, 2),
    payment_date TIMESTAMP,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON licenses(type);
CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON licenses(is_active);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON speakers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remarks_updated_at BEFORE UPDATE ON remarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transcription_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transcription_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO transcription_user;
EOF

# Execute SQL
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $TEMP_SQL

# Cleanup
rm -f $TEMP_SQL

print_status "Database tables created successfully"

# Step 5: Run migrations
print_status "Running database migrations..."

# Check if migrations directory exists
if [ -d "$PROJECT_DIR/backend/migrations" ]; then
    for migration in $PROJECT_DIR/backend/migrations/*.sql; do
        if [ -f "$migration" ]; then
            print_info "Running migration: $(basename $migration)"
            PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration" 2>>"$LOG_FILE" || true
        fi
    done
    print_status "Migrations completed"
else
    print_warning "Migrations directory not found. Skipping migrations."
fi

# Step 6: Create default admin user
print_status "Creating default admin user..."

ADMIN_PASSWORD=$(generate_password)

PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Create admin user with all permissions
INSERT INTO users (username, email, password, permissions, full_name, is_active, email_verified)
VALUES (
    'admin',
    'admin@yalitranscription.com',
    crypt('$ADMIN_PASSWORD', gen_salt('bf')),
    'ABCDEF',
    'System Administrator',
    true,
    true
) ON CONFLICT (username) DO NOTHING;

-- Generate transcriber code for admin
UPDATE users 
SET transcriber_code = 'TRN-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0')
WHERE username = 'admin' AND transcriber_code IS NULL;
EOF

print_status "Admin user created"
print_info "Admin username: admin"
print_info "Admin password: $ADMIN_PASSWORD"
print_warning "SAVE THESE CREDENTIALS! Change the password after first login."

# Step 7: Optimize database
print_status "Optimizing database..."

sudo -u postgres psql -d $DB_NAME << EOF
-- Update statistics
ANALYZE;

-- Reindex tables
REINDEX DATABASE $DB_NAME;

-- Vacuum
VACUUM ANALYZE;
EOF

print_status "Database optimized"

# Step 8: Setup backup cron job
print_status "Setting up automated backups..."

# Create backup script specifically for database
cat > /usr/local/bin/backup-transcription-db.sh << EOF
#!/bin/bash
# Daily database backup for transcription system
BACKUP_DIR="/opt/backups/postgres"
mkdir -p \$BACKUP_DIR

# Create backup
PGPASSWORD="$DB_PASSWORD" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > "\$BACKUP_DIR/transcription_\$(date +%Y%m%d_%H%M%S).sql.gz"

# Remove backups older than 30 days
find \$BACKUP_DIR -name "transcription_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: \$(date)" >> /var/log/db-backup.log
EOF

chmod +x /usr/local/bin/backup-transcription-db.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-transcription-db.sh") | crontab -

print_status "Automated backups configured"

# Step 9: Test database connection
print_status "Testing database connection..."

if PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
    print_status "Database connection successful"
else
    print_error "Database connection failed!"
    exit 1
fi

# Step 10: Save configuration
print_status "Saving database configuration..."

# Create configuration file
cat > $PROJECT_DIR/backend/.database.conf << EOF
# Database Configuration
# Generated: $(date)
# DO NOT COMMIT THIS FILE TO GIT

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Connection string
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Backup settings
BACKUP_DIR=/opt/backups/postgres
BACKUP_RETENTION_DAYS=30
EOF

chmod 600 $PROJECT_DIR/backend/.database.conf

print_status "Configuration saved"

# Final summary
echo ""
echo "============================================" | tee -a $LOG_FILE
print_status "Database setup completed successfully!"
echo "============================================" | tee -a $LOG_FILE
echo ""
print_info "Database Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
print_warning "Important: Save these credentials securely!"
echo "  Database Password: $DB_PASSWORD"
echo "  Admin Password: $ADMIN_PASSWORD"
echo ""
print_info "Configuration saved to: $PROJECT_DIR/backend/.database.conf"
print_info "Automated backups: Daily at 2 AM"
print_info "Backup location: /opt/backups/postgres"
echo ""
print_info "Next steps:"
echo "  1. Update backend/.env.production with database credentials"
echo "  2. Test application connection to database"
echo "  3. Change admin password after first login"
echo ""

exit 0