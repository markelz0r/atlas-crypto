const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed || {};

module.exports = {
  apps: [
    {
      name: 'atlas-bot',
      script: 'dist/index.js',
      cwd: __dirname,
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
        ...env,
      },
    },
  ],
};
