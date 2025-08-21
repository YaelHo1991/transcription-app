#!/bin/bash

# ============================================
# Transcription System Restore Script
# For DigitalOcean Droplet Emergency Recovery
# ============================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/transcription-system"
BACKUP_BASE_DIR="/opt/backups"
LOG_FILE="/var/log/transcription-restore.log"
BACKUP_PATH="${1}"  # Path to backup directory or "latest"
RESTORE_TYPE="${2:-full}"  # full, database, files, or config
DRY_RUN="${3:-false}"  # Set to "true" for dry run

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Validate backup path
if [ -z "$BACKUP_PATH" ]; then
    print_error "Usage: ./restore.sh <backup_path|latest> [restore_type] [dry_run]"
    print_info "restore_type: full, database, files, config (default: full)"
    print_info "dry_run: true or false (default: false)"
    echo ""
    print_info "Available backups:"
    ls -la $BACKUP_BASE_DIR | grep "^d" | tail -n +2
    exit 1
fi

# Handle "latest" keyword
if [ "$BACKUP_PATH" = "latest" ]; then
    BACKUP_PATH="${BACKUP_BASE_DIR}/latest"
    if [ ! -L "$BACKUP_PATH" ]; then
        print_error "No 'latest' backup symlink found!"
        exit 1
    fi
    BACKUP_PATH=$(readlink -f "$BACKUP_PATH")
fi

# Check if backup directory exists
if [ ! -d "$BACKUP_PATH" ]; then
    print_error "Backup directory not found: $BACKUP_PATH"
    exit 1
fi

# Start restore
echo "============================================" | tee -a $LOG_FILE
echo "Starting Transcription System Restore" | tee -a $LOG_FILE
echo "Time: $(date)" | tee -a $LOG_FILE
echo "Backup: $BACKUP_PATH" | tee -a $LOG_FILE
echo "Type: $RESTORE_TYPE" | tee -a $LOG_FILE
echo "Dry Run: $DRY_RUN" | tee -a $LOG_FILE
echo "============================================" | tee -a $LOG_FILE

# Load database configuration
if [ -f "$PROJECT_DIR/backend/.env.production" ]; then
    export $(grep -v '^#' $PROJECT_DIR/backend/.env.production | xargs)
fi

# Function to execute or simulate command
execute_cmd() {
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY RUN] Would execute: $1"
    else
        eval "$1"
    fi
}

# Step 1: Stop services
stop_services() {
    print_status "Stopping services..."
    
    # Check deployment type
    if [ -f "$PROJECT_DIR/docker-compose.production.yml" ] && command -v docker-compose &> /dev/null; then
        print_info "Stopping Docker containers..."
        execute_cmd "docker-compose -f $PROJECT_DIR/docker-compose.production.yml down"
    elif command -v pm2 &> /dev/null; then
        print_info "Stopping PM2 processes..."
        execute_cmd "pm2 stop all"
    fi
    
    # Stop nginx
    if systemctl is-active --quiet nginx; then
        print_info "Stopping Nginx..."
        execute_cmd "systemctl stop nginx"
    fi
}

# Step 2: Create safety backup
create_safety_backup() {
    print_status "Creating safety backup of current state..."
    
    if [ "$DRY_RUN" = "false" ]; then
        SAFETY_BACKUP="${BACKUP_BASE_DIR}/safety_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$SAFETY_BACKUP"
        
        # Quick database dump
        if command -v pg_dump &> /dev/null; then
            print_info "Backing up current database..."
            PGPASSWORD="${DB_PASSWORD}" pg_dump \
                -h "${DB_HOST:-localhost}" \
                -U "${DB_USER:-transcription_user}" \
                -d "${DB_NAME:-transcription_prod}" \
                > "${SAFETY_BACKUP}/database_safety.sql" 2>/dev/null || true
        fi
        
        # Quick file backup
        if [ -d "$PROJECT_DIR/backend/user_data" ]; then
            print_info "Backing up current user data..."
            tar -czf "${SAFETY_BACKUP}/user_data_safety.tar.gz" \
                -C "$PROJECT_DIR/backend" user_data 2>/dev/null || true
        fi
        
        print_status "Safety backup created: $SAFETY_BACKUP"
    else
        print_info "[DRY RUN] Would create safety backup"
    fi
}

# Step 3: Restore database
restore_database() {
    print_status "Restoring database..."
    
    # Find database backup file
    DB_BACKUP=$(find "$BACKUP_PATH" -name "database_*.sql.gz" -type f | head -1)
    
    if [ -z "$DB_BACKUP" ]; then
        print_error "No database backup found in $BACKUP_PATH"
        return 1
    fi
    
    print_info "Found database backup: $(basename $DB_BACKUP)"
    
    if [ "$DRY_RUN" = "false" ]; then
        # Decompress backup
        TEMP_SQL="/tmp/restore_$(date +%s).sql"
        gunzip -c "$DB_BACKUP" > "$TEMP_SQL"
        
        # Drop existing database (with confirmation in interactive mode)
        if [ -t 0 ]; then
            print_warning "This will DROP and recreate the database: ${DB_NAME:-transcription_prod}"
            read -p "Continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Restore cancelled"
                rm -f "$TEMP_SQL"
                return 1
            fi
        fi
        
        # Drop and recreate database
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST:-localhost}" \
            -U "${DB_USER:-transcription_user}" \
            -d postgres \
            -c "DROP DATABASE IF EXISTS ${DB_NAME:-transcription_prod};" 2>/dev/null || true
        
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST:-localhost}" \
            -U "${DB_USER:-transcription_user}" \
            -d postgres \
            -c "CREATE DATABASE ${DB_NAME:-transcription_prod};"
        
        # Restore database
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST:-localhost}" \
            -U "${DB_USER:-transcription_user}" \
            -d "${DB_NAME:-transcription_prod}" \
            < "$TEMP_SQL"
        
        # Cleanup
        rm -f "$TEMP_SQL"
        
        print_status "Database restored successfully"
    else
        print_info "[DRY RUN] Would restore database from: $DB_BACKUP"
    fi
}

# Step 4: Restore files
restore_files() {
    print_status "Restoring files..."
    
    # Restore user data
    USER_DATA_BACKUP=$(find "$BACKUP_PATH" -name "user_data_*.tar.gz" -type f | head -1)
    if [ ! -z "$USER_DATA_BACKUP" ]; then
        print_info "Restoring user data from: $(basename $USER_DATA_BACKUP)"
        
        if [ "$DRY_RUN" = "false" ]; then
            # Remove existing user data
            rm -rf "$PROJECT_DIR/backend/user_data"
            
            # Extract backup
            tar -xzf "$USER_DATA_BACKUP" -C "$PROJECT_DIR/backend/"
            
            # Set permissions
            chown -R www-data:www-data "$PROJECT_DIR/backend/user_data"
            chmod -R 755 "$PROJECT_DIR/backend/user_data"
        else
            print_info "[DRY RUN] Would restore user data"
        fi
    fi
    
    # Restore uploads
    UPLOADS_BACKUP=$(find "$BACKUP_PATH" -name "uploads_*.tar.gz" -type f | head -1)
    if [ ! -z "$UPLOADS_BACKUP" ]; then
        print_info "Restoring uploads from: $(basename $UPLOADS_BACKUP)"
        
        if [ "$DRY_RUN" = "false" ]; then
            # Remove existing uploads
            rm -rf "$PROJECT_DIR/backend/uploads"
            
            # Extract backup
            tar -xzf "$UPLOADS_BACKUP" -C "$PROJECT_DIR/backend/"
            
            # Set permissions
            chown -R www-data:www-data "$PROJECT_DIR/backend/uploads"
            chmod -R 755 "$PROJECT_DIR/backend/uploads"
        else
            print_info "[DRY RUN] Would restore uploads"
        fi
    fi
    
    # Restore waveform cache (optional)
    WAVEFORM_BACKUP=$(find "$BACKUP_PATH" -name "waveform_cache_*.tar.gz" -type f | head -1)
    if [ ! -z "$WAVEFORM_BACKUP" ]; then
        print_info "Restoring waveform cache from: $(basename $WAVEFORM_BACKUP)"
        
        if [ "$DRY_RUN" = "false" ]; then
            rm -rf "$PROJECT_DIR/backend/waveform-cache"
            tar -xzf "$WAVEFORM_BACKUP" -C "$PROJECT_DIR/backend/"
            chown -R www-data:www-data "$PROJECT_DIR/backend/waveform-cache"
        else
            print_info "[DRY RUN] Would restore waveform cache"
        fi
    fi
    
    print_status "Files restored successfully"
}

# Step 5: Restore configuration
restore_config() {
    print_status "Restoring configuration..."
    
    CONFIG_BACKUP=$(find "$BACKUP_PATH" -name "config_*.tar.gz" -type f | head -1)
    
    if [ -z "$CONFIG_BACKUP" ]; then
        print_warning "No configuration backup found"
        return 0
    fi
    
    print_info "Found configuration backup: $(basename $CONFIG_BACKUP)"
    
    if [ "$DRY_RUN" = "false" ]; then
        # Extract to temp directory
        TEMP_CONFIG="/tmp/config_restore_$(date +%s)"
        mkdir -p "$TEMP_CONFIG"
        tar -xzf "$CONFIG_BACKUP" -C "$TEMP_CONFIG"
        
        # Find the config directory
        CONFIG_DIR=$(find "$TEMP_CONFIG" -name "config_backup_*" -type d | head -1)
        
        if [ -d "$CONFIG_DIR" ]; then
            # Restore environment files
            [ -f "$CONFIG_DIR/.env.production" ] && cp "$CONFIG_DIR/.env.production" "$PROJECT_DIR/backend/"
            [ -f "$CONFIG_DIR/frontend-env.production" ] && cp "$CONFIG_DIR/frontend-env.production" "$PROJECT_DIR/frontend/main-app/.env.production"
            
            # Restore docker-compose if exists
            [ -f "$CONFIG_DIR/docker-compose.production.yml" ] && cp "$CONFIG_DIR/docker-compose.production.yml" "$PROJECT_DIR/"
            
            # Restore nginx config
            [ -f "$CONFIG_DIR/default.conf" ] && cp "$CONFIG_DIR/default.conf" "$PROJECT_DIR/nginx/"
            
            # Restore PM2 config
            [ -f "$CONFIG_DIR/pm2.ecosystem.config.js" ] && cp "$CONFIG_DIR/pm2.ecosystem.config.js" "$PROJECT_DIR/"
            
            print_status "Configuration restored"
        else
            print_warning "Configuration directory not found in backup"
        fi
        
        # Cleanup
        rm -rf "$TEMP_CONFIG"
    else
        print_info "[DRY RUN] Would restore configuration"
    fi
}

# Step 6: Run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ "$DRY_RUN" = "false" ]; then
        # Run all migrations
        for migration in $PROJECT_DIR/backend/migrations/*.sql; do
            if [ -f "$migration" ]; then
                print_info "Running migration: $(basename $migration)"
                PGPASSWORD="${DB_PASSWORD}" psql \
                    -h "${DB_HOST:-localhost}" \
                    -U "${DB_USER:-transcription_user}" \
                    -d "${DB_NAME:-transcription_prod}" \
                    -f "$migration" 2>/dev/null || true
            fi
        done
    else
        print_info "[DRY RUN] Would run database migrations"
    fi
}

# Step 7: Start services
start_services() {
    print_status "Starting services..."
    
    if [ "$DRY_RUN" = "false" ]; then
        # Start nginx
        systemctl start nginx
        
        # Check deployment type and start accordingly
        if [ -f "$PROJECT_DIR/docker-compose.production.yml" ] && command -v docker-compose &> /dev/null; then
            print_info "Starting Docker containers..."
            cd $PROJECT_DIR
            docker-compose -f docker-compose.production.yml up -d
        elif [ -f "$PROJECT_DIR/pm2.ecosystem.config.js" ] && command -v pm2 &> /dev/null; then
            print_info "Starting PM2 processes..."
            cd $PROJECT_DIR
            pm2 start pm2.ecosystem.config.js --env production
            pm2 save
        else
            print_warning "No deployment configuration found. Please start services manually."
        fi
    else
        print_info "[DRY RUN] Would start services"
    fi
}

# Step 8: Verify restoration
verify_restore() {
    print_status "Verifying restoration..."
    
    if [ "$DRY_RUN" = "false" ]; then
        # Wait for services to start
        sleep 10
        
        # Check backend health
        BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
        if [ "$BACKEND_STATUS" = "200" ]; then
            print_status "Backend is healthy"
        else
            print_error "Backend health check failed (HTTP $BACKEND_STATUS)"
        fi
        
        # Check frontend
        FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
        if [ "$FRONTEND_STATUS" = "200" ]; then
            print_status "Frontend is healthy"
        else
            print_error "Frontend health check failed (HTTP $FRONTEND_STATUS)"
        fi
        
        # Check database connectivity
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST:-localhost}" \
            -U "${DB_USER:-transcription_user}" \
            -d "${DB_NAME:-transcription_prod}" \
            -c "SELECT COUNT(*) FROM users;" &>/dev/null
        
        if [ $? -eq 0 ]; then
            print_status "Database connection verified"
        else
            print_error "Database connection failed"
        fi
    else
        print_info "[DRY RUN] Would verify restoration"
    fi
}

# Main restore process
main() {
    # Create safety backup first
    if [ "$RESTORE_TYPE" != "config" ]; then
        create_safety_backup
    fi
    
    # Stop services
    stop_services
    
    # Perform restore based on type
    case "$RESTORE_TYPE" in
        full)
            restore_database
            restore_files
            restore_config
            run_migrations
            ;;
        database)
            restore_database
            run_migrations
            ;;
        files)
            restore_files
            ;;
        config)
            restore_config
            ;;
        *)
            print_error "Unknown restore type: $RESTORE_TYPE"
            print_info "Valid types: full, database, files, config"
            exit 1
            ;;
    esac
    
    # Start services
    start_services
    
    # Verify
    verify_restore
}

# Confirmation prompt
if [ "$DRY_RUN" = "false" ] && [ -t 0 ]; then
    print_warning "WARNING: This will restore from backup: $BACKUP_PATH"
    print_warning "Type: $RESTORE_TYPE"
    print_warning "Current data may be lost!"
    echo ""
    read -p "Are you sure you want to continue? Type 'yes' to proceed: " -r
    echo
    if [ "$REPLY" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
fi

# Execute main restore process
main

# Final summary
echo ""
echo "============================================" | tee -a $LOG_FILE
if [ "$DRY_RUN" = "true" ]; then
    print_status "Dry run completed!"
    print_info "No changes were made. Run without 'true' as third parameter to perform actual restore."
else
    print_status "Restore completed!"
fi
echo "============================================" | tee -a $LOG_FILE
echo ""
print_info "Backup restored from: $BACKUP_PATH"
print_info "Restore type: $RESTORE_TYPE"
echo ""

if [ "$DRY_RUN" = "false" ]; then
    print_info "Please verify:"
    echo "  1. Application is accessible at https://yalitranscription.duckdns.org"
    echo "  2. Users can log in successfully"
    echo "  3. Projects and transcriptions are available"
    echo "  4. File uploads are working"
    echo ""
    print_warning "If issues occur, safety backup is available at:"
    echo "  ${SAFETY_BACKUP:-Not created}"
fi

exit 0