#!/bin/bash

# =====================================================
# START APPLICATION SCRIPT
# Run this after uploading your code
# =====================================================

echo "======================================"
echo "🚀 STARTING TRANSCRIPTION APP"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Go to app directory
cd /var/app/transcription-system

# Step 1: Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd transcription-system/backend
npm install --production
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Step 2: Build backend
echo -e "${YELLOW}Building backend...${NC}"
npm run build
echo -e "${GREEN}✓ Backend built${NC}"

# Step 3: Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod -f migrations/006_create_waveforms_table.sql
PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod -f migrations/007_create_shortcuts_tables.sql
PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod -f migrations/008_create_backup_system_tables.sql
echo -e "${GREEN}✓ Database migrations complete${NC}"

# Step 4: Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend/main-app
npm install --production
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Step 5: Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

# Step 6: Go back to root
cd /var/app/transcription-system

# Step 7: Start with PM2
echo -e "${YELLOW}Starting services with PM2...${NC}"
pm2 start ecosystem.config.js --env production
pm2 save
echo -e "${GREEN}✓ Services started${NC}"

# Step 8: Show status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
pm2 status

echo ""
echo "======================================"
echo -e "${GREEN}✅ APP IS RUNNING!${NC}"
echo "======================================"
echo ""
echo "Access your app at:"
echo "  http://146.190.57.51"
echo "  http://yalitranscription.duckdns.org"
echo ""
echo "Useful commands:"
echo "  pm2 status     - Check app status"
echo "  pm2 logs       - View app logs"
echo "  pm2 restart all - Restart all services"
echo ""