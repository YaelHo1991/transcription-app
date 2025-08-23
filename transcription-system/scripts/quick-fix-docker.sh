#!/bin/bash

echo "=========================================="
echo "    QUICK FIX FOR DOCKER BUILD"
echo "=========================================="

cd /opt/transcription-system/transcription-system

# Fix the backend Dockerfile to install TypeScript
echo "Fixing backend Dockerfile..."
sed -i 's/RUN npm ci --only=production/RUN npm ci/' backend/Dockerfile 2>/dev/null

# Or update the Dockerfile.backend directly
cat > Dockerfile.backend << 'EOF'
# Backend Dockerfile
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Install ALL dependencies (including TypeScript)
RUN npm ci

# Copy source code
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

# Install ffmpeg for waveform generation
RUN apk add --no-cache ffmpeg

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist
COPY backend/migrations ./migrations
COPY backend/templates ./templates

# Create necessary directories
RUN mkdir -p uploads temp logs waveform-cache user_data && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

CMD ["node", "dist/server.js"]
EOF

# Also fix the frontend if needed
cat > Dockerfile.frontend << 'EOF'
# Frontend Dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY frontend/main-app/package*.json ./
RUN npm ci
# Install missing type definitions
RUN npm install --save-dev @types/file-saver

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/main-app/ .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

ENV PORT 3002

CMD ["node", "server.js"]
EOF

# Set environment variables
export DB_PASSWORD=simple123

# Build again
echo "Building Docker containers..."
docker-compose -f docker-compose.production.yml build --no-cache

# Start services
echo "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services
sleep 15

# Check status
echo ""
echo "=========================================="
echo "Checking services..."
docker ps

echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.production.yml logs"
echo ""
echo "If still getting 502 error, wait 2-3 minutes for services to fully start"
echo "Then check: https://yalitranscription.duckdns.org"
echo ""