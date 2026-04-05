import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { createBot } from './bot/bot.js';
import mongoose from 'mongoose';

async function main() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  const bot = createBot();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await bot.stop();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('Atlas is online. Starting long-polling...');
  bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running.`);
    },
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
