#!/bin/bash
# Script to configure email on Digital Ocean production server
# Run this on your Digital Ocean server

echo "🔧 Configuring email settings for production..."

# Navigate to backend directory
cd /var/www/transcription-system/backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

# Add Gmail configuration to .env file
echo "" >> .env
echo "# Email Configuration" >> .env
echo "GMAIL_USER=your-email@gmail.com" >> .env
echo "GMAIL_APP_PASSWORD=your-16-character-app-password" >> .env

echo "✅ Email configuration added to .env file"
echo ""
echo "🚨 IMPORTANT: You need to:"
echo "1. Edit the .env file and replace with your actual Gmail credentials:"
echo "   nano /var/www/transcription-system/backend/.env"
echo ""
echo "2. Replace 'your-email@gmail.com' with your actual Gmail address"
echo "3. Replace 'your-16-character-app-password' with your Gmail App Password"
echo ""
echo "4. Restart PM2 to load the new environment variables:"
echo "   pm2 restart all"
echo ""
echo "5. Check PM2 logs to verify email service is configured:"
echo "   pm2 logs --lines 20"