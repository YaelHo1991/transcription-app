#!/bin/bash

echo "Setting up systemd services..."

# Copy service files
cp /opt/transcription-system/transcription-system/scripts/systemd/*.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable services to start on boot
systemctl enable transcription-backend.service
systemctl enable transcription-frontend.service

# Start services
systemctl start transcription-backend.service
systemctl start transcription-frontend.service

# Check status
echo ""
echo "Service Status:"
systemctl status transcription-backend.service --no-pager
echo ""
systemctl status transcription-frontend.service --no-pager

echo ""
echo "Services installed and started!"
echo "They will automatically restart if they crash and start on boot."