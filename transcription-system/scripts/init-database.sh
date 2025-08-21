#!/bin/bash

# ============================================
# Quick Database Initialization Script
# One-command database setup for production
# ============================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════╗"
    echo "║     Transcription System Database Init     ║"
    echo "║            Quick Setup Script              ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Check prerequisites
check_prerequisites() {
    local missing=0
    
    print_info "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    
    # Check required commands
    for cmd in psql openssl wget curl; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is not installed"
            missing=1
        fi
    done
    
    if [ $missing -eq 1 ]; then
        print_error "Please install missing prerequisites first"
        exit 1
    fi
    
    print_status "All prerequisites met"
}

# Install PostgreSQL
install_postgresql() {
    print_info "Installing PostgreSQL..."
    
    # Update package list
    apt update -qq
    
    # Install PostgreSQL and dependencies
    DEBIAN_FRONTEND=noninteractive apt install -y \
        postgresql \
        postgresql-contrib \
        postgresql-client \
        libpq-dev
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    print_status "PostgreSQL installed"
}

# Quick setup with defaults
quick_setup() {
    local db_name="transcription_prod"
    local db_user="transcription_user"
    local db_password=$(generate_password)
    local admin_password=$(generate_password)
    
    print_info "Starting quick setup with defaults..."
    echo ""
    
    # Create database and user
    sudo -u postgres psql << EOF
-- Create user
CREATE USER $db_user WITH PASSWORD '$db_password';

-- Create database
CREATE DATABASE $db_name OWNER $db_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;
EOF
    
    print_status "Database and user created"
    
    # Run base schema
    PGPASSWORD="$db_password" psql -h localhost -U $db_user -d $db_name << 'EOF'
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Quick table setup (minimal for immediate use)
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
    crypt('$admin_password', gen_salt('bf')),
    'ABCDEF',
    'System Administrator',
    true
);

-- Generate transcriber code
UPDATE users 
SET transcriber_code = 'TRN-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0')
WHERE username = 'admin';
EOF
    
    print_status "Basic schema created"
    
    # Save credentials
    cat > /opt/transcription-system/backend/.database.conf << EOF
# Database Configuration - KEEP SECURE!
# Generated: $(date)

DB_HOST=localhost
DB_PORT=5432
DB_NAME=$db_name
DB_USER=$db_user
DB_PASSWORD=$db_password

# Connection string
DATABASE_URL=postgresql://$db_user:$db_password@localhost:5432/$db_name

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$admin_password
EOF
    
    chmod 600 /opt/transcription-system/backend/.database.conf
    
    # Update .env.production if exists
    if [ -f "/opt/transcription-system/backend/.env.production" ]; then
        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$db_password|" /opt/transcription-system/backend/.env.production
        print_status "Updated .env.production with database password"
    fi
    
    # Show summary
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}    DATABASE SETUP COMPLETED!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Database Credentials:${NC}"
    echo "  Database: $db_name"
    echo "  User: $db_user"
    echo "  Password: ${YELLOW}$db_password${NC}"
    echo ""
    echo -e "${CYAN}Admin Login:${NC}"
    echo "  Username: admin"
    echo "  Password: ${YELLOW}$admin_password${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: Save these credentials securely!${NC}"
    echo -e "${RED}⚠️  They won't be shown again!${NC}"
    echo ""
    echo "Credentials saved to: /opt/transcription-system/backend/.database.conf"
}

# Interactive setup
interactive_setup() {
    print_info "Starting interactive setup..."
    
    read -p "Database name [transcription_prod]: " db_name
    db_name=${db_name:-transcription_prod}
    
    read -p "Database user [transcription_user]: " db_user
    db_user=${db_user:-transcription_user}
    
    read -p "Generate random password? (Y/n): " gen_pass
    if [[ $gen_pass =~ ^[Nn]$ ]]; then
        read -s -p "Enter database password: " db_password
        echo
    else
        db_password=$(generate_password)
        echo "Generated password: $db_password"
    fi
    
    # Continue with setup using provided values
    # ... (implementation similar to quick_setup but with custom values)
}

# Main execution
main() {
    show_banner
    check_prerequisites
    
    # Check if PostgreSQL is installed
    if ! command -v psql &> /dev/null; then
        install_postgresql
    else
        print_info "PostgreSQL is already installed"
    fi
    
    # Check for existing database
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw transcription_prod; then
        print_warning "Database 'transcription_prod' already exists!"
        read -p "Drop and recreate? This will DELETE ALL DATA! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo -u postgres psql -c "DROP DATABASE transcription_prod;"
            print_info "Existing database dropped"
        else
            print_info "Keeping existing database. Exiting."
            exit 0
        fi
    fi
    
    # Quick or interactive setup
    if [ "$1" = "--quick" ] || [ "$1" = "-q" ]; then
        quick_setup
    else
        echo "Choose setup mode:"
        echo "  1) Quick setup with defaults (recommended)"
        echo "  2) Interactive setup"
        read -p "Your choice [1]: " choice
        choice=${choice:-1}
        
        case $choice in
            1)
                quick_setup
                ;;
            2)
                interactive_setup
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
    fi
    
    # Run migrations
    print_info "Running migrations..."
    if [ -f "/opt/transcription-system/scripts/run-migrations.sh" ]; then
        /opt/transcription-system/scripts/run-migrations.sh
    else
        print_warning "Migrations script not found. Run manually later."
    fi
    
    # Test connection
    print_info "Testing database connection..."
    source /opt/transcription-system/backend/.database.conf
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
        print_status "Database connection successful!"
    else
        print_error "Database connection failed!"
    fi
    
    # Setup cron backup
    print_info "Setting up automated backups..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/transcription-system/scripts/backup.sh database 30") | crontab -
    print_status "Daily backups configured"
    
    echo ""
    print_status "Database initialization complete!"
    print_info "Next steps:"
    echo "  1. Run migrations: ./scripts/run-migrations.sh"
    echo "  2. Start application: ./scripts/deploy.sh"
    echo "  3. Access at: https://yalitranscription.duckdns.org"
    echo ""
}

# Handle command line arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --quick, -q     Quick setup with defaults"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              Interactive setup"
        echo "  $0 --quick      Quick setup with defaults"
        ;;
    *)
        main "$@"
        ;;
esac