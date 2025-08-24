@echo off
echo ========================================
echo   DEPLOYING TO DIGITAL OCEAN
echo ========================================

set DROPLET_IP=146.190.57.51
set DROPLET_USER=root

echo.
echo Step 1: Connecting to Digital Ocean droplet...
echo ----------------------------------------

ssh %DROPLET_USER%@%DROPLET_IP% "cd /root/transcription-system && git pull origin main && cd backend && npm install && npm run build && cd ../frontend/main-app && npm install && npm run build && pm2 restart all && pm2 save && echo 'Deployment complete!' && pm2 status"

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your app should be live at:
echo http://%DROPLET_IP%
echo.
pause