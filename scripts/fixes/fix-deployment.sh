#!/bin/bash

echo "Fixing deployment issues..."

# Fix frontend
echo "Installing frontend dependencies..."
cd /var/app/transcription-system/transcription-system/frontend/main-app
npm install --production
npm run build

# Fix backend
echo "Installing backend dependencies..."
cd /var/app/transcription-system/transcription-system/backend
npm install --production
npm install typescript
npm run build

# Fix PM2 config
echo "Fixing PM2 configuration..."
cd /var/app/transcription-system
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'transcription-backend',
      script: './transcription-system/backend/dist/server.js',
      cwd: '/var/app/transcription-system',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'transcription-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/app/transcription-system/transcription-system/frontend/main-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
EOF

# Restart PM2
echo "Restarting services..."
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save

echo "Fixed! Check status:"
pm2 status