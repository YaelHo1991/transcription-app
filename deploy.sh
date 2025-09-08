#!/bin/bash

# Deployment script for transcription system

echo "Deploying to DigitalOcean..."

# Frontend files (excluding node_modules and .next)
echo "Copying frontend source files..."
scp -r transcription-system/frontend/main-app/src root@146.190.57.51:/var/www/transcription-system/frontend/
scp -r transcription-system/frontend/main-app/public root@146.190.57.51:/var/www/transcription-system/frontend/
scp transcription-system/frontend/main-app/package*.json root@146.190.57.51:/var/www/transcription-system/frontend/
scp transcription-system/frontend/main-app/next.config.js root@146.190.57.51:/var/www/transcription-system/frontend/
scp transcription-system/frontend/main-app/tsconfig.json root@146.190.57.51:/var/www/transcription-system/frontend/
scp transcription-system/frontend/main-app/.env.production root@146.190.57.51:/var/www/transcription-system/frontend/ 2>/dev/null || true

# Copy the built .next folder separately (it's large)
echo "Copying frontend build..."
scp -r transcription-system/frontend/main-app/.next root@146.190.57.51:/var/www/transcription-system/frontend/

echo "Deployment files copied successfully!"