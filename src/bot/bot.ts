import { Bot } from 'grammy';
import type { BotContext } from './context.js';
import { config } from '../config/env.js';
import { ensureUser } from './middleware/ensure-user.js';
import { sendTyping } from './middleware/typing.js';
import { handleStart } from './commands/start.js';
import { handleAnalyze } from './commands/analyze.js';
import { handleMessage } from './handlers/message.js';
import { handlePhoto } from './handlers/photo.js';

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.TELEGRAM_BOT_TOKEN);

  // Global middleware
  bot.use(ensureUser);
  bot.use(sendTyping);

  // Commands
  bot.command('start', handleStart);
  bot.command('analyze', handleAnalyze);

  // Photo handler (screenshot portfolio recognition)
  bot.on('message:photo', handlePhoto);

  // Catch-all for text messages -> agent
  bot.on('message:text', handleMessage);

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}
