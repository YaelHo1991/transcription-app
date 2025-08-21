#!/bin/bash

# ============================================
# Transcription System Deployment Script
# For DigitalOcean Droplet Deployment
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
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/transcription-deploy.log"
DEPLOYMENT_MODE="${1:-docker}"  # docker or pm2

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

# Start deployment
echo "============================================" | tee -a $LOG_FILE
echo "Starting Transcription System Deployment" | tee -a $LOG_FILE
echo "Time: $(date)" | tee -a $LOG_FILE
echo "Mode: $DEPLOYMENT_MODE" | tee -a $LOG_FILE
echo "============================================" | tee -a $LOG_FILE

# Step 1: Backup current deployment (if exists)
if [ -d "$PROJECT_DIR" ]; then
    print_status "Creating backup of current deployment..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Backup database
    if command -v pg_dump &> /dev/null; then
        print_info "Backing up database..."
        PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U transcription_user -d transcription_prod > "$BACKUP_DIR/${BACKUP_NAME}_database.sql" 2>/dev/null || true
    fi
    
    # Backup user data
    if [ -d "$PROJECT_DIR/backend/user_data" ]; then
        print_info "Backing up user data..."
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_userdata.tar.gz" -C "$PROJECT_DIR/backend" user_data 2>/dev/null || true
    fi
    
    print_status "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
fi

# Step 2: Pull latest code from Git
print_status "Pulling latest code from repository..."
cd $PROJECT_DIR

# Check if git repo exists
if [ -d ".git" ]; then
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin main --force
    
    print_status "Code updated from repository"
else
    print_warning "No git repository found. Assuming files are already in place."
fi

# Step 3: Copy production environment files
print_status "Setting up environment files..."

# Check if production env files exist
if [ ! -f "backend/.env.production" ]; then
    print_error "backend/.env.production not found!"
    print_info "Please create backend/.env.production with your configuration"
    exit 1
fi

if [ ! -f "frontend/main-app/.env.production" ]; then
    print_error "frontend/main-app/.env.production not found!"
    print_info "Please create frontend/main-app/.env.production with your configuration"
    exit 1
fi

# Step 4: Create necessary directories
print_status "Creating necessary directories..."
mkdir -p $PROJECT_DIR/backend/uploads
mkdir -p $PROJECT_DIR/backend/temp
mkdir -p $PROJECT_DIR/backend/logs
mkdir -p $PROJECT_DIR/backend/waveform-cache
mkdir -p $PROJECT_DIR/backend/backups
mkdir -p $PROJECT_DIR/backend/user_data

# Set permissions
chown -R www-data:www-data $PROJECT_DIR/backend/uploads
chown -R www-data:www-data $PROJECT_DIR/backend/user_data
chmod -R 755 $PROJECT_DIR/backend/uploads
chmod -R 755 $PROJECT_DIR/backend/user_data

# Step 5: Deploy based on mode
if [ "$DEPLOYMENT_MODE" = "docker" ]; then
    # Docker deployment
    print_status "Starting Docker deployment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        print_info "Run: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed!"
        print_info "Run: sudo apt install docker-compose"
        exit 1
    fi
    
    # Stop existing containers
    print_info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down 2>/dev/null || true
    
    # Build images
    print_status "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start containers
    print_status "Starting Docker containers..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check container status
    docker-compose -f docker-compose.production.yml ps
    
elif [ "$DEPLOYMENT_MODE" = "pm2" ]; then
    # PM2 deployment (non-Docker)
    print_status "Starting PM2 deployment..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        print_info "Run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
        exit 1
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not found. Installing..."
        npm install -g pm2
    fi
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd $PROJECT_DIR/backend
    npm ci --production
    
    # Build backend
    print_status "Building backend..."
    npm run build
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd $PROJECT_DIR/frontend/main-app
    npm ci --production
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    # Start with PM2
    print_status "Starting services with PM2..."
    cd $PROJECT_DIR
    pm2 delete all 2>/dev/null || true
    pm2 start pm2.ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    pm2 startup systemd -u root --hp /root
    
else
    print_error "Unknown deployment mode: $DEPLOYMENT_MODE"
    print_info "Use: ./deploy.sh docker OR ./deploy.sh pm2"
    exit 1
fi

# Step 6: Run database migrations
print_status "Running database migrations..."

# Wait for database to be ready
sleep 5

# Run migrations
for migration in backend/migrations/*.sql; do
    if [ -f "$migration" ]; then
        print_info "Running migration: $(basename $migration)"
        PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U transcription_user -d transcription_prod -f "$migration" 2>/dev/null || true
    fi
done

# Step 7: Setup Nginx (if not using Docker)
if [ "$DEPLOYMENT_MODE" = "pm2" ]; then
    print_status "Configuring Nginx..."
    
    # Copy nginx config
    cp nginx/default.conf /etc/nginx/sites-available/transcription
    ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
fi

# Step 8: Health checks
print_status "Running health checks..."

# Check backend
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

# Step 9: Cleanup
print_status "Cleaning up..."

# Remove old Docker images
if [ "$DEPLOYMENT_MODE" = "docker" ]; then
    docker image prune -f
fi

# Clear old logs
find $PROJECT_DIR/backend/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true

# Step 10: Final status
echo ""
echo "============================================" | tee -a $LOG_FILE
print_status "Deployment completed successfully!"
echo "============================================" | tee -a $LOG_FILE
echo ""
print_info "Access your application at:"
echo "  https://yalitranscription.duckdns.org"
echo ""
print_info "Check logs:"
echo "  Application: $LOG_FILE"
if [ "$DEPLOYMENT_MODE" = "docker" ]; then
    echo "  Docker: docker-compose -f docker-compose.production.yml logs"
else
    echo "  PM2: pm2 logs"
fi
echo ""
print_warning "Remember to:"
echo "  1. Run SSL setup if not done: ./setup-ssl.sh"
echo "  2. Check firewall settings: ufw status"
echo "  3. Monitor system resources: htop"
echo ""

exit 0