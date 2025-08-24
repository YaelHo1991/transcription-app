#!/bin/bash

echo "Deploying to Digital Ocean..."

ssh root@146.190.57.51 << 'EOF'
echo "Pulling latest code..."
cd /var/app/transcription-system
git pull origin main

echo "Building backend..."
cd backend
npm install
npm run build

echo "Building frontend..."
cd ../frontend/main-app
npm install
npm run build

echo "Restarting services..."
pm2 restart all
pm2 save

echo "Deployment complete!"
pm2 status
EOF

echo "Deployment finished!"