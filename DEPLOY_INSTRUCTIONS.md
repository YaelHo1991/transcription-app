# Deployment Instructions for DigitalOcean

## Quick Deploy (One Command)

1. Open PuTTY or your SSH client
2. Connect to: `146.190.57.51`
3. Login as: `root`
4. Run this single command:

```bash
cd /root/transcription-app && git pull && bash deploy-to-digitalocean.sh
```

That's it! Your app will be deployed and available at:
- Frontend: http://146.190.57.51:3002
- Backend: http://146.190.57.51:5000

## What the script does:
1. Pulls latest code from GitHub
2. Installs dependencies
3. Sets up environment variables
4. Builds the frontend for production
5. Restarts all services with PM2

## To check if everything is working:
```bash
pm2 status
```

## To see logs if there are issues:
```bash
pm2 logs frontend
pm2 logs backend
```

## Windows Quick Deploy

If you want to deploy from Windows, just double-click:
```
deploy-from-windows.bat
```

This will:
1. Push your changes to Git
2. Show you instructions to complete the deployment