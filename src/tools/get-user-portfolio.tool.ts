import { tool } from '@openai/agents';
import { z } from 'zod';
import { User } from '../models/user.model.js';

export const getUserPortfolioTool = tool({
  name: 'get_user_portfolio',
  description:
    'Retrieve the current crypto portfolio holdings for a user by their Telegram ID.',
  parameters: z.object({
    telegramId: z.number().describe('The Telegram user ID'),
  }),
  execute: async ({ telegramId }) => {
    const user = await User.findOne({ telegramId });
    if (!user || user.portfolio.length === 0) {
      return JSON.stringify({ holdings: [], message: 'No portfolio found.' });
    }
    return JSON.stringify({ holdings: user.portfolio });
  },
});
