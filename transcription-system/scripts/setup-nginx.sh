#!/bin/bash

echo "Setting up Nginx configuration..."

# Copy Nginx config
cp /opt/transcription-system/transcription-system/nginx/sites-available/transcription /etc/nginx/sites-available/

# Create symlink
ln -sf /etc/nginx/sites-available/transcription /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid"
    # Reload Nginx
    systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "Nginx configuration has errors. Please check the configuration."
    exit 1
fi

echo ""
echo "Nginx setup complete!"
echo "Your site should be accessible at: https://yalitranscription.duckdns.org"