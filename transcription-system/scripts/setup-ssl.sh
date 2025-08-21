#!/bin/bash

# SSL Setup Script for Transcription System
# This script sets up Let's Encrypt SSL certificates for the domain
# Run this on your DigitalOcean droplet after initial deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="yalitranscription.duckdns.org"
EMAIL="ayelho@gmail.com"  # Update this with your email
NGINX_SSL_DIR="/etc/nginx/ssl"
CERTBOT_DIR="/etc/letsencrypt/live/${DOMAIN}"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_status "Starting SSL setup for ${DOMAIN}"

# Step 1: Install Certbot if not already installed
print_status "Checking for Certbot installation..."
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot not found. Installing..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    print_status "Certbot installed successfully"
else
    print_status "Certbot is already installed"
fi

# Step 2: Stop nginx if running (to avoid port conflicts)
print_status "Stopping Nginx temporarily..."
if systemctl is-active --quiet nginx; then
    systemctl stop nginx
    NGINX_WAS_RUNNING=true
else
    NGINX_WAS_RUNNING=false
fi

# For Docker setup, also stop the container
if docker ps | grep -q transcription-nginx; then
    print_status "Stopping Docker nginx container..."
    docker-compose -f docker-compose.production.yml stop nginx
    DOCKER_WAS_RUNNING=true
else
    DOCKER_WAS_RUNNING=false
fi

# Step 3: Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --domains ${DOMAIN} \
    --domains www.${DOMAIN} \
    --keep-until-expiring \
    --expand

# Check if certificate was obtained successfully
if [ -d "${CERTBOT_DIR}" ]; then
    print_status "SSL certificate obtained successfully"
else
    print_error "Failed to obtain SSL certificate"
    exit 1
fi

# Step 4: Create SSL directory for nginx
print_status "Setting up SSL directory..."
mkdir -p ${NGINX_SSL_DIR}

# Step 5: Create symbolic links to certificates
print_status "Creating certificate links..."
ln -sf ${CERTBOT_DIR}/fullchain.pem ${NGINX_SSL_DIR}/fullchain.pem
ln -sf ${CERTBOT_DIR}/privkey.pem ${NGINX_SSL_DIR}/privkey.pem

# Step 6: Set proper permissions
print_status "Setting certificate permissions..."
chmod 755 ${NGINX_SSL_DIR}
chmod 644 ${NGINX_SSL_DIR}/fullchain.pem
chmod 600 ${NGINX_SSL_DIR}/privkey.pem

# Step 7: Generate DH parameters for additional security (optional but recommended)
if [ ! -f ${NGINX_SSL_DIR}/dhparam.pem ]; then
    print_status "Generating DH parameters (this may take a few minutes)..."
    openssl dhparam -out ${NGINX_SSL_DIR}/dhparam.pem 2048
else
    print_status "DH parameters already exist"
fi

# Step 8: Test nginx configuration
print_status "Testing Nginx configuration..."
if [ -f /etc/nginx/sites-available/transcription ]; then
    nginx -t
    if [ $? -eq 0 ]; then
        print_status "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
fi

# Step 9: Restart services
if [ "$NGINX_WAS_RUNNING" = true ]; then
    print_status "Restarting Nginx..."
    systemctl start nginx
    systemctl reload nginx
fi

if [ "$DOCKER_WAS_RUNNING" = true ]; then
    print_status "Restarting Docker containers..."
    docker-compose -f docker-compose.production.yml up -d nginx
fi

# Step 10: Set up auto-renewal
print_status "Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renewal << EOF
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root certbot renew --quiet --no-self-upgrade --post-hook "systemctl reload nginx" 2>&1 | logger -t certbot
EOF

# Step 11: Test auto-renewal
print_status "Testing certificate renewal process..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_status "Auto-renewal test successful"
else
    print_warning "Auto-renewal test failed - manual renewal may be required"
fi

# Final status
echo ""
print_status "SSL setup completed successfully!"
echo ""
echo "Certificate details:"
echo "  Domain: ${DOMAIN}"
echo "  Certificate location: ${CERTBOT_DIR}"
echo "  Nginx SSL directory: ${NGINX_SSL_DIR}"
echo "  Auto-renewal: Enabled (twice daily)"
echo ""
print_status "Your site should now be accessible at:"
echo "  https://${DOMAIN}"
echo "  https://www.${DOMAIN}"
echo ""
print_warning "Remember to:"
echo "  1. Update your DuckDNS domain to point to your droplet IP"
echo "  2. Ensure ports 80 and 443 are open in your firewall"
echo "  3. Test the HTTPS connection in your browser"
echo ""

# Test HTTPS connection
print_status "Testing HTTPS connection..."
sleep 5
if curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} | grep -q "200\|301\|302"; then
    print_status "HTTPS is working!"
else
    print_warning "HTTPS test failed - please check your configuration"
fi

exit 0