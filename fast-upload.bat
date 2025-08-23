@echo off
REM =====================================================
REM FAST UPLOAD TO DROPLET - Excludes unnecessary files
REM Much faster than uploading everything!
REM =====================================================

echo ======================================
echo FAST UPLOAD TO DIGITAL OCEAN
echo ======================================
echo.

set DROPLET_IP=146.190.57.51
set DROPLET_USER=root

echo This will upload your code to %DROPLET_IP%
echo (Excluding node_modules, dist, user_data, etc.)
echo.
pause

echo.
echo Creating directories on droplet...
ssh %DROPLET_USER%@%DROPLET_IP% "mkdir -p /var/app/transcription-system/transcription-system/backend && mkdir -p /var/app/transcription-system/transcription-system/frontend/main-app"

echo.
echo Uploading backend files (without node_modules)...
echo.

REM Upload backend source and configs
scp -r transcription-system/backend/src %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/
scp -r transcription-system/backend/migrations %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/
scp -r transcription-system/backend/templates %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/
scp transcription-system/backend/package*.json %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/
scp transcription-system/backend/tsconfig.json %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/
scp transcription-system/backend/.env.production %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/backend/

echo.
echo Uploading frontend files (without node_modules or .next)...
echo.

REM Upload frontend source and configs
scp -r transcription-system/frontend/main-app/src %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp -r transcription-system/frontend/main-app/public %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp transcription-system/frontend/main-app/package*.json %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp transcription-system/frontend/main-app/tsconfig.json %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp transcription-system/frontend/main-app/next.config.js %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp transcription-system/frontend/main-app/postcss.config.mjs %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/
scp transcription-system/frontend/main-app/.env.production %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/transcription-system/frontend/main-app/

echo.
echo Uploading configuration files...
echo.

REM Upload root config files
scp ecosystem.config.js %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/
scp simple-deploy.sh %DROPLET_USER%@%DROPLET_IP%:/root/
scp start-app.sh %DROPLET_USER%@%DROPLET_IP%:/var/app/transcription-system/

echo.
echo Creating empty user_data structure...
ssh %DROPLET_USER%@%DROPLET_IP% "mkdir -p /var/app/transcription-system/transcription-system/backend/user_data && mkdir -p /var/app/transcription-system/transcription-system/backend/uploads && mkdir -p /var/app/transcription-system/transcription-system/backend/temp"

echo.
echo ======================================
echo FAST UPLOAD COMPLETE!
echo ======================================
echo.
echo Upload finished in record time!
echo.
echo Next steps:
echo 1. Connect to your droplet:
echo    ssh root@%DROPLET_IP%
echo.
echo 2. If FIRST TIME, run setup:
echo    chmod +x /root/simple-deploy.sh
echo    /root/simple-deploy.sh
echo.
echo 3. Start your app:
echo    chmod +x /var/app/transcription-system/start-app.sh
echo    /var/app/transcription-system/start-app.sh
echo.
echo Note: The app will install dependencies on the droplet
echo This is normal and only happens once.
echo.
pause