// PM2 Ecosystem Configuration
// Alternative to Docker deployment for DigitalOcean
// Usage: pm2 start pm2.ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      // Backend API Server
      name: 'transcription-backend',
      script: './backend/dist/server.js',
      cwd: '/opt/transcription-system',
      instances: 2,  // Cluster mode with 2 instances
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // Load from .env.production
        dotenv: './backend/.env.production'
      },
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'user_data', '.git'],
      max_memory_restart: '2G',
      
      // Logging
      error_file: '/opt/transcription-system/logs/backend-error.log',
      out_file: '/opt/transcription-system/logs/backend-out.log',
      log_file: '/opt/transcription-system/logs/backend-combined.log',
      time: true,
      merge_logs: true,
      
      // Auto-restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Startup behavior
      post_update: ['npm install', 'npm run build'],
      
      // Health check
      health_check: {
        interval: 30000,
        timeout: 5000,
        max_consecutive_failures: 3,
        endpoint: 'http://localhost:5000/api/health'
      }
    },
    
    {
      // Frontend Next.js Server
      name: 'transcription-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/opt/transcription-system/frontend/main-app',
      instances: 1,  // Next.js handles its own worker processes
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        // Load from .env.production
        dotenv: './frontend/main-app/.env.production'
      },
      
      // Process management
      watch: false,
      max_memory_restart: '1G',
      
      // Logging
      error_file: '/opt/transcription-system/logs/frontend-error.log',
      out_file: '/opt/transcription-system/logs/frontend-out.log',
      log_file: '/opt/transcription-system/logs/frontend-combined.log',
      time: true,
      
      // Auto-restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Startup behavior
      post_update: ['npm install', 'npm run build'],
      
      // Startup delay (wait for backend)
      delay: 5000
    },
    
    {
      // Backup Cron Job
      name: 'backup-cron',
      script: '/opt/transcription-system/scripts/backup.sh',
      cwd: '/opt/transcription-system',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 2 * * *',  // Run daily at 2 AM
      autorestart: false,
      watch: false,
      
      // Arguments for backup script
      args: 'incremental 30',  // Incremental backup, 30 days retention
      
      // Logging
      error_file: '/opt/transcription-system/logs/backup-error.log',
      out_file: '/opt/transcription-system/logs/backup-out.log',
      time: true,
      
      // Environment
      env_production: {
        NODE_ENV: 'production'
      }
    },
    
    {
      // Cleanup Job (remove old temp files)
      name: 'cleanup-cron',
      script: '/opt/transcription-system/scripts/cleanup.sh',
      cwd: '/opt/transcription-system',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 4 * * *',  // Run daily at 4 AM
      autorestart: false,
      watch: false,
      
      // Logging
      error_file: '/opt/transcription-system/logs/cleanup-error.log',
      out_file: '/opt/transcription-system/logs/cleanup-out.log',
      time: true,
      
      // Environment
      env_production: {
        NODE_ENV: 'production'
      }
    },
    
    {
      // Resource Monitor (optional)
      name: 'resource-monitor',
      script: './scripts/monitor.js',
      cwd: '/opt/transcription-system',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      
      // Logging
      error_file: '/opt/transcription-system/logs/monitor-error.log',
      out_file: '/opt/transcription-system/logs/monitor-out.log',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        MONITOR_INTERVAL: 60000,  // Check every minute
        ALERT_THRESHOLD_CPU: 80,
        ALERT_THRESHOLD_MEMORY: 85,
        ALERT_THRESHOLD_DISK: 90
      },
      
      // Auto-restart settings
      autorestart: true,
      max_restarts: 5
    }
  ],
  
  // Deploy configuration (optional, for automated deployment)
  deploy: {
    production: {
      user: 'root',
      host: '157.245.137.210',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/transcription-system.git',
      path: '/opt/transcription-system',
      'pre-deploy': 'git pull',
      'post-deploy': 'npm install && npm run build:all && pm2 reload pm2.ecosystem.config.js --env production',
      'post-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

// Helper Scripts Content (create these if using PM2 deployment)

// /opt/transcription-system/scripts/cleanup.sh
/*
#!/bin/bash
# Remove temporary files older than 1 day
find /opt/transcription-system/backend/temp -type f -mtime +1 -delete
find /opt/transcription-system/backend/uploads/temp -type f -mtime +1 -delete

# Clear old logs (keep last 30 days)
find /opt/transcription-system/logs -name "*.log" -mtime +30 -delete

# Clear old waveform cache (keep last 7 days)
find /opt/transcription-system/backend/waveform-cache -type f -mtime +7 -delete

echo "Cleanup completed: $(date)"
*/

// /opt/transcription-system/scripts/monitor.js
/*
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

// Monitor system resources
function checkResources() {
  // CPU usage
  const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
  
  // Memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;
  
  // Disk usage
  exec('df -h / | tail -1', (error, stdout) => {
    if (!error) {
      const diskUsage = parseInt(stdout.split(/\s+/)[4]);
      
      // Log metrics
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        cpu: cpuUsage.toFixed(2),
        memory: memUsage.toFixed(2),
        disk: diskUsage,
        uptime: os.uptime()
      }));
      
      // Alert if thresholds exceeded
      if (cpuUsage > process.env.ALERT_THRESHOLD_CPU) {
        console.error(`HIGH CPU USAGE: ${cpuUsage.toFixed(2)}%`);
      }
      if (memUsage > process.env.ALERT_THRESHOLD_MEMORY) {
        console.error(`HIGH MEMORY USAGE: ${memUsage.toFixed(2)}%`);
      }
      if (diskUsage > process.env.ALERT_THRESHOLD_DISK) {
        console.error(`HIGH DISK USAGE: ${diskUsage}%`);
      }
    }
  });
}

// Run checks periodically
setInterval(checkResources, parseInt(process.env.MONITOR_INTERVAL) || 60000);

// Initial check
checkResources();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Monitor shutting down...');
  process.exit(0);
});
*/