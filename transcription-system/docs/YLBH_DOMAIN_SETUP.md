# YLBH.co.il Domain HTTPS Setup Instructions

## Overview
This document provides step-by-step instructions for enabling HTTPS on the ylbh.co.il domain to support USB pedal functionality.

## Prerequisites
- SSH access to the server
- Root or sudo privileges
- Domain ylbh.co.il pointing to your server's IP address

## Setup Steps

### 1. Connect to the Server
```bash
ssh root@146.190.57.51
# or use your SSH key
ssh -i ~/.ssh/your-key root@146.190.57.51
```

### 2. Navigate to the Project Directory
```bash
cd /opt/transcription-system
```

### 3. Pull Latest Changes
```bash
git pull origin main
```

### 4. Make the SSL Setup Script Executable
```bash
chmod +x scripts/setup-ssl-ylbh.sh
```

### 5. Run the SSL Setup Script
```bash
sudo ./scripts/setup-ssl-ylbh.sh
```

The script will:
- Install Certbot if needed
- Create SSL certificates for ylbh.co.il
- Configure Nginx
- Set up automatic renewal
- Test the configuration

### 6. Manual Steps (if script fails)

#### 6a. Copy Nginx Configuration
```bash
sudo cp nginx/sites-available/transcription-ylbh /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/transcription-ylbh /etc/nginx/sites-enabled/
```

#### 6b. Request SSL Certificate Manually
```bash
sudo certbot certonly --nginx \
  -d ylbh.co.il \
  -d www.ylbh.co.il \
  --email admin@ylbh.co.il \
  --agree-tos \
  --non-interactive
```

#### 6c. Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Restart Application Services
```bash
# If using PM2
pm2 restart all

# If using systemd services
sudo systemctl restart transcription-backend
sudo systemctl restart transcription-frontend

# If using Docker
docker-compose -f docker-compose.production.yml restart
```

### 8. Verify HTTPS is Working

#### Test URLs:
- https://ylbh.co.il - Should redirect to HTTPS and show the application
- https://ylbh.co.il/transcription/transcription - Transcription page
- https://ylbh.co.il/api/health - API health check

#### Test Pedal Functionality:
1. Navigate to https://ylbh.co.il/transcription/transcription
2. Open the Media Player settings (gear icon)
3. Go to the "Pedal" tab
4. Click "Connect Pedal" - should work without HTTPS warning
5. Connect your USB pedal and test functionality

### 9. Set Up Auto-Renewal (if not done by script)
```bash
# Add cron job for automatic renewal
sudo crontab -e

# Add this line:
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## Troubleshooting

### DNS Not Resolving
If ylbh.co.il is not resolving to your server:
1. Check DNS settings at your domain registrar
2. Ensure A record points to: 146.190.57.51
3. Wait for DNS propagation (can take up to 48 hours)

### Certificate Request Fails
If Certbot fails to get a certificate:
1. Check that port 80 is open: `sudo ufw allow 80`
2. Check that port 443 is open: `sudo ufw allow 443`
3. Ensure Nginx is running: `sudo systemctl status nginx`
4. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Pedal Not Connecting
If the pedal still shows HTTPS warning:
1. Clear browser cache and cookies
2. Try in an incognito/private window
3. Check browser console for errors (F12)
4. Ensure you're accessing via HTTPS (not HTTP)

### CORS Errors
If you see CORS errors in the console:
1. Restart the backend service to load new CORS settings
2. Check backend logs: `pm2 logs backend` or `journalctl -u transcription-backend`

## Verification Checklist
- [ ] HTTPS redirect works (HTTP automatically redirects to HTTPS)
- [ ] SSL certificate is valid (no browser warnings)
- [ ] Application loads correctly on https://ylbh.co.il
- [ ] API endpoints work (check /api/health)
- [ ] Pedal connects without HTTPS warning
- [ ] Pedal buttons function correctly
- [ ] Auto-renewal is configured

## Rollback Instructions
If something goes wrong:

1. Disable the new Nginx configuration:
```bash
sudo rm /etc/nginx/sites-enabled/transcription-ylbh
sudo systemctl reload nginx
```

2. The original yalitranscription.duckdns.org will continue working

## Support
For issues or questions:
- Check server logs: `/var/log/nginx/error.log`
- Check application logs: `pm2 logs` or `docker-compose logs`
- Review this documentation: `/opt/transcription-system/docs/YLBH_DOMAIN_SETUP.md`

## Important Notes
1. Both domains (ylbh.co.il and yalitranscription.duckdns.org) will work simultaneously
2. Users can access the application from either domain
3. SSL certificates need to be renewed every 90 days (automated via cron)
4. Keep the server firewall configured to allow ports 80 and 443

## Files Modified
- `/nginx/sites-available/transcription-ylbh` - New Nginx configuration
- `/scripts/setup-ssl-ylbh.sh` - SSL setup automation script
- `/backend/src/server.ts` - Added ylbh.co.il to CORS allowed origins
- `/frontend/main-app/src/app/transcription/transcription/components/MediaPlayer/PedalTab.tsx` - Updated HTTPS detection and warnings

Last updated: 2025-09-09