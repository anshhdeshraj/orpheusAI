// PM2 Ecosystem Configuration for OrpheusAI
// Optimized for million+ concurrent users with zero downtime

module.exports = {
    apps: [
      {
        name: 'orpheus-ai-server',
        script: 'server.js',
        instances: 'max', // Use all CPU cores
        exec_mode: 'cluster',
        
        // Environment
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
          WEB_CONCURRENCY: 0, // Let PM2 handle clustering
        },
        
        // Performance & Scaling
        max_memory_restart: '512M',
        instance_var: 'INSTANCE_ID',
        min_uptime: '10s',
        max_restarts: 10,
        
        // Zero Downtime Deployment
        wait_ready: true,
        listen_timeout: 10000,
        kill_timeout: 5000,
        
        // Auto-restart configuration
        autorestart: true,
        restart_delay: 1000,
        
        // Monitoring
        monitoring: true,
        pmx: true,
        
        // Logging
        log_file: './logs/pm2-combined.log',
        out_file: './logs/pm2-out.log',
        error_file: './logs/pm2-error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        
        // Advanced PM2 Features
        vizion: false, // Disable git metadata
        post_update: ['npm install --production'],
        
        // Health monitoring
        health_check_grace_period: 10000,
        health_check_fatal_exceptions: true,
        
        // Process management
        increment_var: 'PORT',
        combine_logs: true,
        
        // Node.js specific optimizations
        node_args: [
          '--max-old-space-size=512',
          '--optimize-for-size',
          '--gc-interval=100',
          '--max-http-header-size=16384'
        ],
        
        // Graceful shutdown
        shutdown_with_message: true,
        wait_ready: true,
        
        // Custom environment variables for production
        env_production: {
          NODE_ENV: 'production',
          PORT: 3000,
          DEBUG: 'orpheus:*',
          UV_THREADPOOL_SIZE: 16,
          NODE_OPTIONS: '--max-old-space-size=512 --enable-source-maps'
        }
      }
    ],
    
    // Deployment configuration
    deploy: {
      production: {
        user: 'deploy',
        host: ['server1.orpheusai.com', 'server2.orpheusai.com'],
        ref: 'origin/main',
        repo: 'git@github.com:orpheus-ai/civic-chatbot-server.git',
        path: '/var/www/orpheus-ai',
        
        // Pre-deployment
        'pre-deploy-local': 'echo "Starting deployment..."',
        'pre-deploy': 'git fetch --all',
        
        // Post-deployment
        'post-deploy': [
          'npm install --production',
          'npm run security-audit',
          'pm2 reload ecosystem.config.js --env production',
          'pm2 save'
        ].join(' && '),
        
        // Post-setup (first deployment)
        'post-setup': [
          'ls -la',
          'npm install --production',
          'pm2 save',
          'pm2 startup'
        ].join(' && '),
        
        // Environment
        env: {
          NODE_ENV: 'production'
        }
      },
      
      staging: {
        user: 'deploy',
        host: 'staging.orpheusai.com',
        ref: 'origin/develop',
        repo: 'git@github.com:orpheus-ai/civic-chatbot-server.git',
        path: '/var/www/orpheus-ai-staging',
        
        'post-deploy': [
          'npm install',
          'npm test',
          'pm2 reload ecosystem.config.js --env staging'
        ].join(' && '),
        
        env: {
          NODE_ENV: 'staging',
          PORT: 3001
        }
      }
    }
  };