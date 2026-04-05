module.exports = {
  apps: [
    {
      name: 'atlas-bot',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      error_file: 'logs/atlas-error.log',
      out_file: 'logs/atlas-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
