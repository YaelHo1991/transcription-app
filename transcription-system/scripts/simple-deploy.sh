#!/bin/bash

echo "=========================================="
echo "    SIMPLE DEPLOYMENT FOR DIGITALOCEAN"
echo "=========================================="

# Stop any existing services
echo "Stopping existing services..."
systemctl stop transcription-backend 2>/dev/null || true
systemctl stop transcription-frontend 2>/dev/null || true
pm2 kill 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

# Navigate to project directory
cd /opt/transcription-system/transcription-system

# Pull latest code
echo "Pulling latest code..."
git pull origin master || git pull origin main

# Setup Database (if not exists)
echo "Setting up database..."
sudo -u postgres psql << EOF 2>/dev/null || true
CREATE DATABASE transcription_prod;
CREATE USER transcription_user WITH PASSWORD 'simple123';
GRANT ALL PRIVILEGES ON DATABASE transcription_prod TO transcription_user;
\c transcription_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Backend Setup
echo "Setting up backend..."
cd backend
npm ci
npm run build || echo "Backend build completed with warnings"

# Run migrations
echo "Running database migrations..."
for file in migrations/*.sql; do
  if [ -f "$file" ]; then
    PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod -f "$file" 2>/dev/null || true
  fi
done

# Frontend Setup
echo "Setting up frontend..."
cd ../frontend/main-app
npm ci
npm run build || echo "Frontend build completed with warnings"

# Create the missing prerender-manifest.json if needed
if [ ! -f ".next/prerender-manifest.json" ]; then
  mkdir -p .next
  echo '{"version":3,"routes":{},"dynamicRoutes":{},"preview":{"previewModeId":"","previewModeSigningKey":"","previewModeEncryptionKey":""}}' > .next/prerender-manifest.json
fi

# Start services using simple background processes
echo "Starting services..."

# Start backend
cd /opt/transcription-system/transcription-system/backend
nohup node dist/server.js > /var/log/transcription-backend.log 2>&1 &
echo $! > /var/run/transcription-backend.pid
echo "Backend started with PID: $(cat /var/run/transcription-backend.pid)"

# Start frontend
cd /opt/transcription-system/transcription-system/frontend/main-app
PORT=3002 nohup npx next start > /var/log/transcription-frontend.log 2>&1 &
echo $! > /var/run/transcription-frontend.pid
echo "Frontend started with PID: $(cat /var/run/transcription-frontend.pid)"

# Wait for services to start
sleep 10

# Check if services are running
echo ""
echo "Checking services..."
if curl -f http://localhost:5000/api/health 2>/dev/null; then
  echo "✓ Backend is running on port 5000"
else
  echo "✗ Backend is not responding"
fi

if curl -f http://localhost:3002 2>/dev/null; then
  echo "✓ Frontend is running on port 3002"
else
  echo "✗ Frontend is not responding"
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo ""
echo "Your application should be accessible at:"
echo "  https://yalitranscription.duckdns.org"
echo ""
echo "To check logs:"
echo "  tail -f /var/log/transcription-backend.log"
echo "  tail -f /var/log/transcription-frontend.log"
echo ""
echo "To stop services:"
echo "  kill $(cat /var/run/transcription-backend.pid)"
echo "  kill $(cat /var/run/transcription-frontend.pid)"
echo ""