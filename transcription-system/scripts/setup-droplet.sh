#!/bin/bash

# ============================================
# DigitalOcean Droplet Setup Script
# Prepares the droplet for transcription system
# ============================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="157.245.137.210"
DOMAIN="yalitranscription.duckdns.org"
PROJECT_DIR="/opt/transcription-system"
LOG_FILE="/var/log/droplet-setup.log"

# ASCII Art Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════╗"
    echo "║     DigitalOcean Droplet Setup Script         ║"
    echo "║         Transcription System v2.0              ║"
    echo "╚════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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
   print_error "This script must be run as root"
   exit 1
fi

# Start setup
show_banner
echo "Starting Droplet Setup: $(date)" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE

# Step 1: System Update
print_status "Updating system packages..."
apt update -qq
apt upgrade -y
apt autoremove -y
apt autoclean

print_status "System updated"

# Step 2: Set timezone
print_status "Setting timezone to UTC..."
timedatectl set-timezone UTC
print_status "Timezone set to UTC"

# Step 3: Configure swap (for large file processing)
print_status "Configuring swap space..."
if [ ! -f /swapfile ]; then
    # Create 4GB swap file
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make permanent
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    
    # Configure swappiness for server workload
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    
    print_status "4GB swap space configured"
else
    print_info "Swap already configured"
fi

# Step 4: Install essential packages
print_status "Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential \
    unzip \
    supervisor

print_status "Essential packages installed"

# Step 5: Install Node.js 18
print_status "Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Install global packages
    npm install -g pm2 npm@latest
    
    print_status "Node.js $(node -v) installed"
else
    print_info "Node.js already installed: $(node -v)"
fi

# Step 6: Install Docker and Docker Compose
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Install Docker Compose
    apt install -y docker-compose
    
    # Enable Docker
    systemctl enable docker
    systemctl start docker
    
    print_status "Docker installed"
else
    print_info "Docker already installed"
fi

# Step 7: Install PostgreSQL client
print_status "Installing PostgreSQL client..."
apt install -y postgresql-client

print_status "PostgreSQL client installed"

# Step 8: Install Nginx
print_status "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    print_status "Nginx installed"
else
    print_info "Nginx already installed"
fi

# Step 9: Install Certbot for SSL
print_status "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

print_status "Certbot installed"

# Step 10: Install FFmpeg for waveform generation
print_status "Installing FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    apt install -y ffmpeg
    print_status "FFmpeg installed"
else
    print_info "FFmpeg already installed"
fi

# Step 11: Configure firewall
print_status "Configuring firewall..."

# Reset UFW to defaults
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (important!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow PostgreSQL from localhost only
ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL local'

# Enable firewall
ufw --force enable

print_status "Firewall configured"

# Step 12: Configure fail2ban for security
print_status "Configuring fail2ban..."

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/error.log
maxretry = 2
EOF

systemctl restart fail2ban
print_status "fail2ban configured"

# Step 13: Create application directory structure
print_status "Creating application directories..."

mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/backups
mkdir -p $PROJECT_DIR/logs
mkdir -p /opt/backups/postgres
mkdir -p /opt/backups/files
mkdir -p /var/log/transcription

# Set permissions
chmod 755 $PROJECT_DIR
chmod 755 /opt/backups

print_status "Directories created"

# Step 14: Configure system limits for large files
print_status "Configuring system limits..."

cat >> /etc/security/limits.conf << 'EOF'
# Transcription System Limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

cat >> /etc/sysctl.conf << 'EOF'
# Transcription System Optimizations
fs.file-max = 65536
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
EOF

sysctl -p

print_status "System limits configured"

# Step 15: Install monitoring tools
print_status "Installing monitoring tools..."

# Netdata for system monitoring (optional but useful)
if [ ! -d /opt/netdata ]; then
    bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait --disable-telemetry
    print_status "Netdata monitoring installed"
else
    print_info "Netdata already installed"
fi

# Step 16: Configure log rotation
print_status "Configuring log rotation..."

cat > /etc/logrotate.d/transcription << 'EOF'
/opt/transcription-system/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/var/log/transcription/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 root adm
}
EOF

print_status "Log rotation configured"

# Step 17: Create deployment user (optional)
print_status "Creating deployment user..."

if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    usermod -aG www-data deploy
    
    # Set up SSH key for deployment (you'll need to add your public key)
    mkdir -p /home/deploy/.ssh
    touch /home/deploy/.ssh/authorized_keys
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    
    print_status "Deployment user created"
    print_warning "Add your SSH public key to /home/deploy/.ssh/authorized_keys"
else
    print_info "Deployment user already exists"
fi

# Step 18: Configure Git
print_status "Configuring Git..."
git config --global user.name "Transcription System"
git config --global user.email "admin@yalitranscription.com"
git config --global init.defaultBranch main

print_status "Git configured"

# Step 19: Install additional Python packages
print_status "Installing Python packages..."
apt install -y python3-pip
pip3 install --upgrade pip
pip3 install supervisor-stdout

print_status "Python packages installed"

# Step 20: Configure DuckDNS (if not done)
print_status "Setting up DuckDNS..."

# Create DuckDNS update script
cat > /usr/local/bin/duckdns-update.sh << 'EOF'
#!/bin/bash
# Update DuckDNS - replace TOKEN with your actual token
TOKEN="your-duckdns-token"
DOMAIN="yalitranscription"

echo url="https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=" | curl -k -o /var/log/duckdns.log -K -
EOF

chmod +x /usr/local/bin/duckdns-update.sh

# Add to crontab (update every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/duckdns-update.sh >/dev/null 2>&1") | crontab -

print_warning "Remember to add your DuckDNS token to /usr/local/bin/duckdns-update.sh"

# Step 21: Performance tuning
print_status "Applying performance tuning..."

# Tune kernel parameters for web server
cat > /etc/sysctl.d/99-transcription.conf << 'EOF'
# Network optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Memory optimizations
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sysctl -p /etc/sysctl.d/99-transcription.conf

print_status "Performance tuning applied"

# Step 22: Create health check endpoint
print_status "Creating health check script..."

cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
# System health check

echo "=== System Health Check ==="
echo "Date: $(date)"
echo ""

# Check disk space
echo "Disk Usage:"
df -h | grep -E '^/dev/'
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check services
echo "Service Status:"
systemctl is-active nginx && echo "✓ Nginx: Active" || echo "✗ Nginx: Inactive"
systemctl is-active docker && echo "✓ Docker: Active" || echo "✗ Docker: Inactive"
systemctl is-active postgresql && echo "✓ PostgreSQL: Active" || echo "✗ PostgreSQL: Inactive"
echo ""

# Check application
if [ -d /opt/transcription-system ]; then
    echo "✓ Application directory exists"
else
    echo "✗ Application directory missing"
fi
EOF

chmod +x /usr/local/bin/health-check.sh

print_status "Health check script created"

# Final Summary
echo ""
echo "========================================" | tee -a $LOG_FILE
print_status "Droplet setup completed successfully!"
echo "========================================" | tee -a $LOG_FILE
echo ""
print_info "System Information:"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Kernel: $(uname -r)"
echo "  CPU: $(nproc) cores"
echo "  RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "  Swap: $(free -h | grep Swap | awk '{print $2}')"
echo "  Disk: $(df -h / | tail -1 | awk '{print $2}')"
echo ""
print_info "Installed Software:"
echo "  Node.js: $(node -v 2>/dev/null || echo 'Not installed')"
echo "  NPM: $(npm -v 2>/dev/null || echo 'Not installed')"
echo "  Docker: $(docker -v 2>/dev/null || echo 'Not installed')"
echo "  Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "  PostgreSQL Client: $(psql --version 2>/dev/null | head -1)"
echo "  FFmpeg: $(ffmpeg -version 2>/dev/null | head -1)"
echo ""
print_info "Network Configuration:"
echo "  IP Address: $DROPLET_IP"
echo "  Domain: $DOMAIN"
echo "  Firewall: Enabled (ports 22, 80, 443 open)"
echo ""
print_warning "Next Steps:"
echo "  1. Update DuckDNS token in /usr/local/bin/duckdns-update.sh"
echo "  2. Clone your repository to $PROJECT_DIR"
echo "  3. Run database initialization: ./scripts/init-database.sh"
echo "  4. Configure SSL: certbot --nginx -d $DOMAIN"
echo "  5. Deploy application: ./scripts/deploy.sh"
echo ""
print_info "Run health check: /usr/local/bin/health-check.sh"
echo ""

exit 0