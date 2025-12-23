const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  apps: [{
    name: 'ninex-group-api',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    
    // Logging configuration - use absolute paths
    error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
    out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
    log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: false, // Keep separate logs for better debugging
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Log rotation - PM2 module handles this
    // Note: Install pm2-logrotate if needed: pm2 install pm2-logrotate
    
    // Restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Kill timeout
    kill_timeout: 5000,
    
    // Output handling - ensure logs are written
    output: path.join(__dirname, 'logs', 'pm2-out.log'),
    error: path.join(__dirname, 'logs', 'pm2-error.log'),
    
    // Enable logging
    disable_logs: false,
    log_stdout: true,
    log_stderr: true,
    
    // Force immediate log flushing
    instance_var: 'INSTANCE_ID'
  }]
};

