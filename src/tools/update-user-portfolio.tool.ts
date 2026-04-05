import { tool } from '@openai/agents';
import { z } from 'zod';
import { User } from '../models/user.model.js';

export const updateUserPortfolioTool = tool({
  name: 'update_user_portfolio',
  description:
    'Add, remove, or update a crypto asset in the user portfolio. Use "add" to add a new holding or increase an existing one, "remove" to delete an asset entirely, "update" to set the exact amount.',
  parameters: z.object({
    telegramId: z.number().describe('The Telegram user ID'),
    action: z.enum(['add', 'remove', 'update']).describe('The action to perform'),
    ticker: z.string().describe('The crypto ticker symbol, e.g. BTC, ETH, SOL'),
    amount: z.number().describe('The amount of the asset'),
  }),
  execute: async ({ telegramId, action, ticker, amount }) => {
    const upperTicker = ticker.toUpperCase();

    if (action === 'remove') {
      const result = await User.findOneAndUpdate(
        { telegramId },
        { $pull: { portfolio: { ticker: upperTicker } } },
        { new: true },
      );
      if (!result) return JSON.stringify({ error: 'User not found.' });
      return JSON.stringify({
        success: true,
        message: `Removed ${upperTicker} from portfolio.`,
        portfolio: result.portfolio,
      });
    }

    if (action === 'add') {
      const user = await User.findOne({ telegramId });
      if (!user) return JSON.stringify({ error: 'User not found.' });

      const existing = user.portfolio.find((a) => a.ticker === upperTicker);
      if (existing) {
        existing.amount += amount;
        await user.save();
        return JSON.stringify({
          success: true,
          message: `Added ${amount} ${upperTicker}. Total: ${existing.amount}.`,
          portfolio: user.portfolio,
        });
      }

      user.portfolio.push({ ticker: upperTicker, amount });
      await user.save();
      return JSON.stringify({
        success: true,
        message: `Added ${amount} ${upperTicker} to portfolio.`,
        portfolio: user.portfolio,
      });
    }

    // action === 'update'
    const result = await User.findOneAndUpdate(
      { telegramId, 'portfolio.ticker': upperTicker },
      { $set: { 'portfolio.$.amount': amount } },
      { new: true },
    );
    if (!result) {
      // Asset doesn't exist yet, add it
      const addResult = await User.findOneAndUpdate(
        { telegramId },
        { $push: { portfolio: { ticker: upperTicker, amount } } },
        { new: true },
      );
      if (!addResult) return JSON.stringify({ error: 'User not found.' });
      return JSON.stringify({
        success: true,
        message: `Set ${upperTicker} to ${amount}.`,
        portfolio: addResult.portfolio,
      });
    }

    return JSON.stringify({
      success: true,
      message: `Updated ${upperTicker} to ${amount}.`,
      portfolio: result.portfolio,
    });
  },
});
