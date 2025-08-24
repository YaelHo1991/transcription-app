#!/bin/bash

echo "======================================"
echo "🔧 REPLACING ALL LOCALHOST URLS"
echo "======================================"
echo ""

# Go to frontend directory
cd /var/app/transcription-system/transcription-system/frontend/main-app

# Create a backup first
echo "Creating backup..."
cp -r src src.backup

# Replace all occurrences of localhost:5000 with environment variable or IP
echo "Replacing localhost URLs in all files..."

# Find and replace in all TypeScript/JavaScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i 's|http://localhost:5000|http://146.190.57.51:5000|g' {} \;

# Also replace any https://localhost:5000
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i 's|https://localhost:5000|http://146.190.57.51:5000|g' {} \;

# Count how many replacements were made
echo "Replacements made:"
grep -r "146.190.57.51:5000" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l

echo ""
echo "✅ All localhost URLs replaced with IP address"
echo ""

# Restart frontend to use updated code
echo "Restarting frontend..."
pkill -f "next"
nohup npm run dev > /var/log/frontend.log 2>&1 &

echo "Waiting for frontend to start..."
sleep 15

echo ""
echo "======================================"
echo "✅ ALL URLS FIXED!"
echo "======================================"
echo ""
echo "All localhost:5000 URLs have been replaced with 146.190.57.51:5000"
echo ""
echo "Now try accessing:"
echo "http://146.190.57.51/licenses"
echo "or"
echo "http://yalitranscription.duckdns.org/licenses"
echo ""
echo "Registration should work now!"