#!/bin/bash

# DuckDNS Configuration Script
# This script helps configure DuckDNS to point to your DigitalOcean droplet

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}===========================================
DuckDNS Configuration for Transcription System
===========================================${NC}"

# Configuration
DOMAIN="yalitranscription"  # Without .duckdns.org
DROPLET_IP="157.245.137.210"  # Your DigitalOcean droplet IP

echo ""
echo -e "${YELLOW}Current Configuration:${NC}"
echo "  Domain: ${DOMAIN}.duckdns.org"
echo "  Droplet IP: ${DROPLET_IP}"
echo ""

# Instructions for manual update
echo -e "${GREEN}Method 1: Manual Update via DuckDNS Website${NC}"
echo "1. Go to: https://www.duckdns.org/"
echo "2. Sign in with your account"
echo "3. Find your domain: ${DOMAIN}"
echo "4. Update the IP address to: ${DROPLET_IP}"
echo "5. Click 'update ip'"
echo ""

# DuckDNS token setup
echo -e "${GREEN}Method 2: Automatic Update via API${NC}"
echo "To use automatic updates, you need your DuckDNS token."
echo ""
read -p "Enter your DuckDNS token (or press Enter to skip): " DUCKDNS_TOKEN

if [ ! -z "$DUCKDNS_TOKEN" ]; then
    echo ""
    echo -e "${YELLOW}Updating DuckDNS...${NC}"
    
    # Update DuckDNS
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${DUCKDNS_TOKEN}&ip=${DROPLET_IP}")
    
    if [ "$RESPONSE" = "OK" ]; then
        echo -e "${GREEN}✓ DuckDNS updated successfully!${NC}"
        
        # Set up auto-update cron job
        echo ""
        echo -e "${YELLOW}Setting up automatic IP updates...${NC}"
        
        # Create update script
        cat > /usr/local/bin/duckdns-update.sh << EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | curl -k -o /var/log/duckdns.log -K -
EOF
        
        chmod +x /usr/local/bin/duckdns-update.sh
        
        # Add to crontab (every 5 minutes)
        (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/duckdns-update.sh >/dev/null 2>&1") | crontab -
        
        echo -e "${GREEN}✓ Auto-update configured (runs every 5 minutes)${NC}"
    else
        echo -e "${RED}✗ DuckDNS update failed. Response: ${RESPONSE}${NC}"
        echo "Please check your token and try again."
    fi
else
    echo -e "${YELLOW}Skipping automatic update.${NC}"
fi

# Test DNS resolution
echo ""
echo -e "${GREEN}Testing DNS Resolution...${NC}"
sleep 2

RESOLVED_IP=$(dig +short ${DOMAIN}.duckdns.org | tail -n1)

if [ "$RESOLVED_IP" = "$DROPLET_IP" ]; then
    echo -e "${GREEN}✓ DNS is correctly configured!${NC}"
    echo "  ${DOMAIN}.duckdns.org → ${RESOLVED_IP}"
else
    if [ -z "$RESOLVED_IP" ]; then
        echo -e "${RED}✗ DNS resolution failed${NC}"
        echo "  Unable to resolve ${DOMAIN}.duckdns.org"
    else
        echo -e "${YELLOW}⚠ DNS mismatch detected${NC}"
        echo "  Expected: ${DROPLET_IP}"
        echo "  Resolved: ${RESOLVED_IP}"
        echo ""
        echo "This might be due to DNS propagation delay. Wait a few minutes and try again."
    fi
fi

# Additional instructions
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Ensure DNS is pointing to: ${DROPLET_IP}"
echo "2. Run the SSL setup script: ./setup-ssl.sh"
echo "3. Test HTTPS access: https://${DOMAIN}.duckdns.org"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "- DNS changes can take 1-5 minutes to propagate"
echo "- Ensure firewall allows ports 80 and 443"
echo "- Check nginx logs if HTTPS doesn't work: /var/log/nginx/error.log"
echo ""

exit 0