#!/bin/bash

# Quick Deploy Script
# Run this after pulling latest changes from git

set -e

echo "🚀 Starting deployment..."

# Backend
echo "📦 Updating backend..."
cd /opt/transcription-system/transcription-system/backend
npm install
npm run build
pm2 restart transcription-backend

# Frontend
echo "📦 Updating frontend..."
cd /opt/transcription-system/transcription-system/frontend/main-app
npm install
npm run build
pm2 restart transcription-frontend

# Clear any caches
echo "🧹 Clearing caches..."
rm -rf /opt/transcription-system/waveform-cache/*
rm -rf /opt/transcription-system/temp/*

echo "✅ Deployment complete!"
pm2 status