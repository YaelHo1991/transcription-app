#!/bin/bash

# ============================================
# Database Migration Runner
# For Transcription System
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
MIGRATIONS_DIR="$PROJECT_DIR/backend/migrations"
LOG_FILE="/var/log/migrations.log"

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

# Load database configuration
if [ -f "$PROJECT_DIR/backend/.env.production" ]; then
    export $(grep -v '^#' $PROJECT_DIR/backend/.env.production | xargs)
elif [ -f "$PROJECT_DIR/backend/.database.conf" ]; then
    export $(grep -v '^#' $PROJECT_DIR/backend/.database.conf | xargs)
else
    print_error "No database configuration found!"
    print_info "Please run setup-database.sh first or create .env.production"
    exit 1
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_warning "This script should be run as root for best results"
fi

# Start migrations
echo "============================================" | tee -a $LOG_FILE
echo "Running Database Migrations" | tee -a $LOG_FILE
echo "Time: $(date)" | tee -a $LOG_FILE
echo "Database: $DB_NAME" | tee -a $LOG_FILE
echo "============================================" | tee -a $LOG_FILE

# Test database connection
print_status "Testing database connection..."
if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" &>/dev/null; then
    print_status "Database connection successful"
else
    print_error "Cannot connect to database!"
    print_info "Check your database credentials in .env.production"
    exit 1
fi

# Create migrations tracking table
print_status "Creating migrations tracking table..."

PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" << 'EOF'
-- Create migrations table if not exists
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at DESC);
EOF

print_status "Migrations table ready"

# Function to calculate file checksum
calculate_checksum() {
    sha256sum "$1" | awk '{print $1}'
}

# Function to check if migration was already executed
is_migration_executed() {
    local filename=$(basename "$1")
    local result=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM migrations WHERE filename = '$filename' AND success = true;")
    
    if [ "$result" -gt 0 ]; then
        return 0  # Already executed
    else
        return 1  # Not executed
    fi
}

# Function to record migration execution
record_migration() {
    local filename=$(basename "$1")
    local checksum=$(calculate_checksum "$1")
    local success=$2
    local error_msg="${3:-}"
    
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" << EOF
INSERT INTO migrations (filename, checksum, success, error_message)
VALUES ('$filename', '$checksum', $success, $([ -z "$error_msg" ] && echo "NULL" || echo "'$error_msg'"))
ON CONFLICT (filename) 
DO UPDATE SET 
    executed_at = CURRENT_TIMESTAMP,
    checksum = EXCLUDED.checksum,
    success = EXCLUDED.success,
    error_message = EXCLUDED.error_message;
EOF
}

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    print_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Get all SQL files sorted by name
MIGRATION_FILES=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
    print_warning "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

# Count migrations
TOTAL_MIGRATIONS=$(echo "$MIGRATION_FILES" | wc -l)
EXECUTED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

print_info "Found $TOTAL_MIGRATIONS migration files"
echo ""

# Execute each migration
for migration_file in $MIGRATION_FILES; do
    FILENAME=$(basename "$migration_file")
    
    # Check if already executed
    if is_migration_executed "$migration_file"; then
        print_info "[$FILENAME] Already executed, skipping..."
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        continue
    fi
    
    print_status "[$FILENAME] Executing migration..."
    
    # Create temporary file to capture errors
    ERROR_FILE="/tmp/migration_error_$(date +%s).txt"
    
    # Execute migration
    if PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "$migration_file" \
        --single-transaction \
        -v ON_ERROR_STOP=1 \
        2>"$ERROR_FILE"; then
        
        # Success
        record_migration "$migration_file" true
        print_status "[$FILENAME] Migration completed successfully"
        EXECUTED_COUNT=$((EXECUTED_COUNT + 1))
        
        # Log to file
        echo "[$(date)] SUCCESS: $FILENAME" >> $LOG_FILE
    else
        # Failure
        ERROR_MSG=$(cat "$ERROR_FILE" | head -n 50)
        record_migration "$migration_file" false "$ERROR_MSG"
        print_error "[$FILENAME] Migration failed!"
        print_error "Error: $ERROR_MSG"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        
        # Log to file
        echo "[$(date)] FAILED: $FILENAME - $ERROR_MSG" >> $LOG_FILE
        
        # Ask to continue or abort
        if [ -t 0 ]; then
            read -p "Continue with remaining migrations? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Aborting remaining migrations"
                break
            fi
        else
            print_warning "Non-interactive mode, stopping on first failure"
            break
        fi
    fi
    
    # Cleanup
    rm -f "$ERROR_FILE"
    
    echo ""
done

# Verify database state
print_status "Verifying database state..."

# Get table count
TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

print_info "Database has $TABLE_COUNT tables"

# List all tables
print_info "Tables in database:"
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" -c "\dt public.*" | grep -E "^ public" | awk '{print "  - " $3}'

# Summary
echo ""
echo "============================================" | tee -a $LOG_FILE
print_status "Migration Summary"
echo "============================================" | tee -a $LOG_FILE
echo ""
print_info "Total migrations: $TOTAL_MIGRATIONS"
print_status "Executed: $EXECUTED_COUNT"
print_info "Skipped (already executed): $SKIPPED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
    print_error "Failed: $FAILED_COUNT"
    echo ""
    print_warning "Some migrations failed. Check the log for details:"
    echo "  $LOG_FILE"
    echo ""
    print_info "To retry failed migrations, run this script again"
    exit 1
else
    print_status "All migrations completed successfully!"
fi

echo ""
print_info "Migration history:"
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT filename, executed_at, success FROM migrations ORDER BY executed_at DESC LIMIT 10;"

echo ""
exit 0