// PM2 Configuration for Digital Ocean Droplet Deployment
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      // Backend API Server
      name: 'transcription-backend',
      script: './transcription-system/backend/dist/server.js',
      cwd: './transcription-system/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/pm2/backend-error.log',
      out_file: '/var/log/pm2/backend-out.log',
      log_file: '/var/log/pm2/backend-combined.log',
      time: true
    },
    {
      // Frontend Next.js Application
      name: 'transcription-frontend',
      script: 'npm',
      args: 'start',
      cwd: './transcription-system/frontend/main-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      log_file: '/var/log/pm2/frontend-combined.log',
      time: true
    }
  ],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_DROPLET_IP',
      ref: 'origin/master',
      repo: 'git@github.com:YOUR_USERNAME/transcription-system.git',
      path: '/var/app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};