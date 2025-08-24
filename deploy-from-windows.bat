@echo off
echo ========================================
echo Deployment to DigitalOcean
echo ========================================
echo.

REM Push changes to Git first
echo Step 1: Pushing latest changes to Git...
git add -A
git commit -m "Deploy to production"
git push origin main
echo Git push completed!
echo.

echo Step 2: Connecting to DigitalOcean and deploying...
echo.
echo You need to:
echo 1. Open PuTTY or your SSH client
echo 2. Connect to: 146.190.57.51
echo 3. Login as: root
echo 4. Run these commands:
echo.
echo    cd /root/transcription-app
echo    git pull origin main
echo    bash deploy-to-digitalocean.sh
echo.
echo ========================================
echo After running the script on DigitalOcean,
echo your app will be available at:
echo Frontend: http://146.190.57.51:3002
echo Backend: http://146.190.57.51:5000
echo ========================================
pause