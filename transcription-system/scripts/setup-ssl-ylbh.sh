#!/bin/bash

# SSL Setup Script for ylbh.co.il
# This script sets up Let's Encrypt SSL certificates for the ylbh.co.il domain
# to enable HTTPS support for USB pedal functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_info "Starting SSL setup for ylbh.co.il domain..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    print_info "Certbot is already installed"
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed. Please install nginx first."
    exit 1
fi

# Create directory for ACME challenges
print_info "Creating directory for ACME challenges..."
mkdir -p /var/www/certbot

# Check if the domain is configured in DNS
print_info "Checking DNS configuration for ylbh.co.il..."
if ! host ylbh.co.il > /dev/null 2>&1; then
    print_warning "DNS resolution for ylbh.co.il failed. Make sure the domain is pointing to this server's IP."
    echo "Current server IP addresses:"
    ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print "  - " $2}'
    echo ""
    read -p "Do you want to continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Copy nginx configuration if not already in sites-available
NGINX_CONFIG="/etc/nginx/sites-available/transcription-ylbh"
if [ ! -f "$NGINX_CONFIG" ]; then
    print_info "Copying nginx configuration to sites-available..."
    cp /opt/transcription-system/nginx/sites-available/transcription-ylbh "$NGINX_CONFIG"
else
    print_info "Nginx configuration already exists at $NGINX_CONFIG"
fi

# Create symlink in sites-enabled if not exists
if [ ! -L "/etc/nginx/sites-enabled/transcription-ylbh" ]; then
    print_info "Enabling nginx configuration..."
    ln -s "$NGINX_CONFIG" /etc/nginx/sites-enabled/
else
    print_info "Nginx configuration already enabled"
fi

# Test nginx configuration
print_info "Testing nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload nginx to apply configuration (for HTTP challenge)
print_info "Reloading nginx..."
systemctl reload nginx

# Request SSL certificate
print_info "Requesting SSL certificate for ylbh.co.il..."
EMAIL="admin@ylbh.co.il"  # Change this to your email

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/ylbh.co.il" ]; then
    print_warning "Certificate already exists for ylbh.co.il"
    read -p "Do you want to renew it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot certonly --nginx \
            -d ylbh.co.il \
            -d www.ylbh.co.il \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            --force-renewal
    else
        print_info "Skipping certificate renewal"
    fi
else
    # Request new certificate
    certbot certonly --nginx \
        -d ylbh.co.il \
        -d www.ylbh.co.il \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL"
fi

# Check if certificate was created successfully
if [ -f "/etc/letsencrypt/live/ylbh.co.il/fullchain.pem" ]; then
    print_success "SSL certificate created successfully"
else
    print_error "Failed to create SSL certificate"
    exit 1
fi

# Test nginx configuration with SSL
print_info "Testing nginx configuration with SSL..."
if nginx -t; then
    print_success "Nginx configuration with SSL is valid"
else
    print_error "Nginx configuration test failed with SSL"
    exit 1
fi

# Reload nginx to apply SSL configuration
print_info "Reloading nginx with SSL configuration..."
systemctl reload nginx

# Set up automatic renewal
print_info "Setting up automatic certificate renewal..."

# Create renewal script
cat > /etc/cron.d/certbot-ylbh << EOF
# Renew Let's Encrypt certificates twice daily
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

print_success "Automatic renewal configured"

# Test renewal
print_info "Testing certificate renewal (dry run)..."
if certbot renew --dry-run; then
    print_success "Certificate renewal test passed"
else
    print_warning "Certificate renewal test failed - please check manually"
fi

# Final checks
print_info "Performing final checks..."

# Check if HTTPS is working
if curl -s -o /dev/null -w "%{http_code}" https://ylbh.co.il/nginx-health | grep -q "200"; then
    print_success "HTTPS is working on ylbh.co.il"
else
    print_warning "Could not verify HTTPS on ylbh.co.il - please check manually"
fi

# Display certificate information
print_info "Certificate information:"
echo "----------------------------------------"
certbot certificates | grep -A 5 "ylbh.co.il"
echo "----------------------------------------"

print_success "SSL setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update your DNS records to point ylbh.co.il to this server's IP address"
echo "2. Test HTTPS access at: https://ylbh.co.il"
echo "3. Test USB pedal connectivity on the secure connection"
echo ""
echo "To manually renew the certificate:"
echo "  sudo certbot renew"
echo ""
echo "To check certificate status:"
echo "  sudo certbot certificates"
echo ""

# Create a summary file
SUMMARY_FILE="/opt/transcription-system/ssl-setup-summary.txt"
cat > "$SUMMARY_FILE" << EOF
SSL Setup Summary for ylbh.co.il
================================
Date: $(date)

Domain: ylbh.co.il, www.ylbh.co.il
Certificate Path: /etc/letsencrypt/live/ylbh.co.il/
Nginx Config: /etc/nginx/sites-available/transcription-ylbh
Auto-Renewal: Configured via cron

Test URLs:
- https://ylbh.co.il
- https://ylbh.co.il/transcription/transcription
- https://ylbh.co.il/api/health

Pedal Test:
1. Navigate to https://ylbh.co.il/transcription/transcription
2. Open Media Player settings
3. Go to Pedal tab
4. Click "Connect Pedal" - should work without warnings

EOF

print_info "Setup summary saved to: $SUMMARY_FILE"

exit 0