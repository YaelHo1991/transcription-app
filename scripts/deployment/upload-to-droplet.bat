@echo off
REM =====================================================
REM UPLOAD TO DROPLET - Windows Batch File
REM Just double-click this file to upload your code!
REM =====================================================

echo ======================================
echo UPLOADING CODE TO DIGITAL OCEAN
echo ======================================
echo.

set DROPLET_IP=146.190.57.51
set DROPLET_USER=root

echo This will upload your transcription app to %DROPLET_IP%
echo.
echo You will need:
echo 1. Your root password for the droplet
echo 2. Internet connection
echo.
pause

echo.
echo Creating directories on droplet...
ssh %DROPLET_USER%@%DROPLET_IP% "mkdir -p /var/app/transcription-system"

echo.
echo Uploading files (this may take a few minutes)...
echo.

REM Use SCP to upload the entire transcription-system folder
scp -r transcription-system %DROPLET_USER%@%DROPLET_IP%:/var/app/

REM Upload the setup scripts
scp simple-deploy.sh %DROPLET_USER%@%DROPLET_IP%:/root/
scp start-app.sh %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/
scp ecosystem.config.js %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/

echo.
echo ======================================
echo UPLOAD COMPLETE!
echo ======================================
echo.
echo Next steps:
echo 1. Connect to your droplet using PuTTY or terminal:
echo    ssh root@%DROPLET_IP%
echo.
echo 2. Run the setup (FIRST TIME ONLY):
echo    chmod +x /root/simple-deploy.sh
echo    /root/simple-deploy.sh
echo.
echo 3. Start your app:
echo    chmod +x /var/app/transcription-system/start-app.sh
echo    /var/app/transcription-system/start-app.sh
echo.
echo Your app will be available at:
echo   http://%DROPLET_IP%
echo.
pause