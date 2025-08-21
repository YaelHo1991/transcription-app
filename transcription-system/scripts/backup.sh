#!/bin/bash

# ============================================
# Transcription System Backup Script
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
PROJECT_DIR="/opt/transcription-system"
BACKUP_BASE_DIR="/opt/backups"
LOG_FILE="/var/log/transcription-backup.log"
BACKUP_TYPE="${1:-full}"  # full, database, files, or incremental
RETENTION_DAYS="${2:-30}"  # Keep backups for 30 days by default

# Create timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"

# Database configuration (load from environment)
if [ -f "$PROJECT_DIR/backend/.env.production" ]; then
    export $(grep -v '^#' $PROJECT_DIR/backend/.env.production | xargs)
fi

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

# Function to calculate directory size
get_size() {
    du -sh "$1" 2>/dev/null | cut -f1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Start backup
echo "============================================" | tee -a $LOG_FILE
echo "Starting Transcription System Backup" | tee -a $LOG_FILE
echo "Time: $(date)" | tee -a $LOG_FILE
echo "Type: $BACKUP_TYPE" | tee -a $LOG_FILE
echo "============================================" | tee -a $LOG_FILE

# Create backup directory
mkdir -p $BACKUP_DIR

# Step 1: Backup database
backup_database() {
    print_status "Starting database backup..."
    
    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        print_warning "PostgreSQL is not running. Attempting to start..."
        systemctl start postgresql
        sleep 3
    fi
    
    # Perform database backup
    DB_BACKUP_FILE="${BACKUP_DIR}/database_${TIMESTAMP}.sql"
    
    # Use pg_dump with proper credentials
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER:-transcription_user}" \
        -d "${DB_NAME:-transcription_prod}" \
        --verbose \
        --no-owner \
        --no-acl \
        --format=plain \
        > "$DB_BACKUP_FILE" 2>>"$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "$DB_BACKUP_FILE"
        DB_SIZE=$(get_size "${DB_BACKUP_FILE}.gz")
        print_status "Database backup completed: ${DB_BACKUP_FILE}.gz ($DB_SIZE)"
    else
        print_error "Database backup failed!"
        return 1
    fi
}

# Step 2: Backup user data and uploads
backup_files() {
    print_status "Starting file backup..."
    
    # Backup user data
    if [ -d "$PROJECT_DIR/backend/user_data" ]; then
        print_info "Backing up user data..."
        USER_DATA_BACKUP="${BACKUP_DIR}/user_data_${TIMESTAMP}.tar.gz"
        tar -czf "$USER_DATA_BACKUP" \
            -C "$PROJECT_DIR/backend" \
            user_data \
            --exclude='*.tmp' \
            --exclude='*.log' \
            2>>"$LOG_FILE"
        
        USER_DATA_SIZE=$(get_size "$USER_DATA_BACKUP")
        print_status "User data backup: $USER_DATA_SIZE"
    fi
    
    # Backup uploads
    if [ -d "$PROJECT_DIR/backend/uploads" ]; then
        print_info "Backing up uploads..."
        UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
        tar -czf "$UPLOADS_BACKUP" \
            -C "$PROJECT_DIR/backend" \
            uploads \
            --exclude='*.tmp' \
            2>>"$LOG_FILE"
        
        UPLOADS_SIZE=$(get_size "$UPLOADS_BACKUP")
        print_status "Uploads backup: $UPLOADS_SIZE"
    fi
    
    # Backup waveform cache (optional, can be regenerated)
    if [ -d "$PROJECT_DIR/backend/waveform-cache" ]; then
        print_info "Backing up waveform cache..."
        WAVEFORM_BACKUP="${BACKUP_DIR}/waveform_cache_${TIMESTAMP}.tar.gz"
        tar -czf "$WAVEFORM_BACKUP" \
            -C "$PROJECT_DIR/backend" \
            waveform-cache \
            2>>"$LOG_FILE"
        
        WAVEFORM_SIZE=$(get_size "$WAVEFORM_BACKUP")
        print_status "Waveform cache backup: $WAVEFORM_SIZE"
    fi
}

# Step 3: Backup configuration files
backup_config() {
    print_status "Backing up configuration files..."
    
    CONFIG_BACKUP="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"
    
    # Create temp directory for configs
    TEMP_CONFIG_DIR="/tmp/config_backup_${TIMESTAMP}"
    mkdir -p "$TEMP_CONFIG_DIR"
    
    # Copy configuration files
    cp "$PROJECT_DIR/backend/.env.production" "$TEMP_CONFIG_DIR/" 2>/dev/null || true
    cp "$PROJECT_DIR/frontend/main-app/.env.production" "$TEMP_CONFIG_DIR/" 2>/dev/null || true
    cp "$PROJECT_DIR/docker-compose.production.yml" "$TEMP_CONFIG_DIR/" 2>/dev/null || true
    cp "$PROJECT_DIR/nginx/default.conf" "$TEMP_CONFIG_DIR/" 2>/dev/null || true
    cp "$PROJECT_DIR/pm2.ecosystem.config.js" "$TEMP_CONFIG_DIR/" 2>/dev/null || true
    
    # Copy SSL certificates (if exists)
    if [ -d "/etc/letsencrypt/live/yalitranscription.duckdns.org" ]; then
        mkdir -p "$TEMP_CONFIG_DIR/ssl"
        cp -r "/etc/letsencrypt/live/yalitranscription.duckdns.org" "$TEMP_CONFIG_DIR/ssl/"
    fi
    
    # Create archive
    tar -czf "$CONFIG_BACKUP" -C "/tmp" "config_backup_${TIMESTAMP}" 2>>"$LOG_FILE"
    
    # Cleanup temp directory
    rm -rf "$TEMP_CONFIG_DIR"
    
    CONFIG_SIZE=$(get_size "$CONFIG_BACKUP")
    print_status "Configuration backup: $CONFIG_SIZE"
}

# Step 4: Create incremental backup (for daily use)
backup_incremental() {
    print_status "Starting incremental backup..."
    
    # Find last full backup
    LAST_FULL_BACKUP=$(find $BACKUP_BASE_DIR -name "manifest_full_*.json" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
    
    if [ -z "$LAST_FULL_BACKUP" ]; then
        print_warning "No full backup found. Performing full backup instead..."
        BACKUP_TYPE="full"
        perform_full_backup
        return
    fi
    
    LAST_BACKUP_TIME=$(stat -c %Y "$LAST_FULL_BACKUP" 2>/dev/null || echo 0)
    
    # Backup only changed files since last full backup
    print_info "Creating incremental backup since $(date -d @$LAST_BACKUP_TIME)"
    
    # Database changes (always backup fully due to nature of SQL)
    backup_database
    
    # File changes
    INCREMENTAL_FILE="${BACKUP_DIR}/incremental_${TIMESTAMP}.tar.gz"
    find "$PROJECT_DIR/backend/user_data" "$PROJECT_DIR/backend/uploads" \
        -newer "$LAST_FULL_BACKUP" \
        -type f \
        -print0 | \
        tar -czf "$INCREMENTAL_FILE" \
        --null -T - \
        --transform "s|$PROJECT_DIR/||" \
        2>>"$LOG_FILE" || true
    
    if [ -f "$INCREMENTAL_FILE" ]; then
        INCREMENTAL_SIZE=$(get_size "$INCREMENTAL_FILE")
        print_status "Incremental backup: $INCREMENTAL_SIZE"
    fi
}

# Step 5: Perform backup based on type
perform_full_backup() {
    backup_database
    backup_files
    backup_config
}

case "$BACKUP_TYPE" in
    full)
        perform_full_backup
        ;;
    database)
        backup_database
        ;;
    files)
        backup_files
        ;;
    config)
        backup_config
        ;;
    incremental)
        backup_incremental
        ;;
    *)
        print_error "Unknown backup type: $BACKUP_TYPE"
        print_info "Valid types: full, database, files, config, incremental"
        exit 1
        ;;
esac

# Step 6: Create backup manifest
print_status "Creating backup manifest..."

MANIFEST_FILE="${BACKUP_DIR}/manifest_${BACKUP_TYPE}_${TIMESTAMP}.json"
cat > "$MANIFEST_FILE" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "type": "$BACKUP_TYPE",
    "hostname": "$(hostname)",
    "backup_dir": "$BACKUP_DIR",
    "files": [
$(find $BACKUP_DIR -type f -name "*.gz" -printf '        "%f",\n' | sed '$ s/,$//')
    ],
    "total_size": "$(get_size $BACKUP_DIR)",
    "retention_days": $RETENTION_DAYS
}
EOF

# Step 7: Upload to remote storage (optional)
if [ ! -z "$BACKUP_S3_BUCKET" ]; then
    print_status "Uploading to S3..."
    aws s3 sync "$BACKUP_DIR" "s3://${BACKUP_S3_BUCKET}/backups/${TIMESTAMP}/" \
        --storage-class GLACIER_IR \
        --quiet
    
    if [ $? -eq 0 ]; then
        print_status "Backup uploaded to S3: ${BACKUP_S3_BUCKET}"
    else
        print_warning "S3 upload failed, backup only stored locally"
    fi
fi

# Step 8: Cleanup old backups
print_status "Cleaning up old backups..."

# Remove backups older than retention period
find $BACKUP_BASE_DIR -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null

# Count remaining backups
BACKUP_COUNT=$(find $BACKUP_BASE_DIR -mindepth 1 -maxdepth 1 -type d | wc -l)
print_info "Total backups retained: $BACKUP_COUNT"

# Step 9: Verify backup integrity
print_status "Verifying backup integrity..."

# Test each backup file
VERIFICATION_FAILED=0
for backup_file in "$BACKUP_DIR"/*.gz; do
    if [ -f "$backup_file" ]; then
        gzip -t "$backup_file" 2>/dev/null
        if [ $? -ne 0 ]; then
            print_error "Verification failed for: $(basename $backup_file)"
            VERIFICATION_FAILED=1
        fi
    fi
done

if [ $VERIFICATION_FAILED -eq 0 ]; then
    print_status "All backup files verified successfully"
else
    print_error "Some backup files failed verification!"
fi

# Step 10: Send notification (optional)
if [ ! -z "$BACKUP_EMAIL" ]; then
    BACKUP_SIZE=$(get_size $BACKUP_DIR)
    SUBJECT="Backup Complete: $BACKUP_TYPE - $(date +%Y-%m-%d)"
    BODY="Backup completed successfully.\n\nType: $BACKUP_TYPE\nSize: $BACKUP_SIZE\nLocation: $BACKUP_DIR\nRetention: $RETENTION_DAYS days"
    
    echo -e "$BODY" | mail -s "$SUBJECT" "$BACKUP_EMAIL"
fi

# Final summary
echo ""
echo "============================================" | tee -a $LOG_FILE
print_status "Backup completed successfully!"
echo "============================================" | tee -a $LOG_FILE
echo ""
print_info "Backup location: $BACKUP_DIR"
print_info "Total size: $(get_size $BACKUP_DIR)"
print_info "Retention: $RETENTION_DAYS days"
echo ""
print_info "To restore from this backup, run:"
echo "  ./restore.sh $BACKUP_DIR"
echo ""

# Create symlink to latest backup
ln -sfn "$BACKUP_DIR" "${BACKUP_BASE_DIR}/latest"

exit 0