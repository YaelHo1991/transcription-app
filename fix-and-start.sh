#!/bin/bash

# =====================================================
# FIX AND START - Fixes all deployment issues
# =====================================================

echo "======================================"
echo "🔧 FIXING DEPLOYMENT ISSUES"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to app directory
cd /var/app/transcription-system

# Step 1: Fix Backend
echo -e "${YELLOW}Fixing backend...${NC}"
cd transcription-system/backend
echo "Installing dependencies (this may take a few minutes)..."
npm install
echo "Building backend..."
npm run build
echo -e "${GREEN}✓ Backend fixed${NC}"

# Step 2: Fix Frontend
echo -e "${YELLOW}Fixing frontend...${NC}"
cd ../frontend/main-app
echo "Installing dependencies (this may take a few minutes)..."
npm install
echo "Building frontend..."
npm run build
echo -e "${GREEN}✓ Frontend fixed${NC}"

# Step 3: Create basic database tables
echo -e "${YELLOW}Setting up database...${NC}"
cd /var/app/transcription-system/transcription-system/backend
PGPASSWORD=simple123 psql -h localhost -U transcription_user -d transcription_prod << EOF
-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    permissions VARCHAR(10) DEFAULT 'A',
    transcriber_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table if not exists
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user if not exists
INSERT INTO users (email, password, name, permissions)
VALUES ('admin@test.com', '\$2a\$10\$YourHashedPasswordHere', 'Admin', 'ABCDEF')
ON CONFLICT (email) DO NOTHING;
EOF
echo -e "${GREEN}✓ Database setup complete${NC}"

# Step 4: Restart PM2
echo -e "${YELLOW}Starting services...${NC}"
cd /var/app/transcription-system
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save --force
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✓ Services started${NC}"

# Step 5: Show status
echo ""
echo -e "${YELLOW}Current Status:${NC}"
pm2 status

echo ""
echo "======================================"
echo -e "${GREEN}✅ DEPLOYMENT FIXED!${NC}"
echo "======================================"
echo ""
echo "Your app should now be running at:"
echo "  http://146.190.57.51"
echo ""
echo "Default login (change this!):"
echo "  Email: admin@test.com"
echo "  Password: admin123"
echo ""
echo "Commands:"
echo "  pm2 status - Check status"
echo "  pm2 logs - View logs"
echo "  pm2 restart all - Restart services"
echo ""