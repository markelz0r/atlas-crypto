import { tool } from '@openai/agents';
import { z } from 'zod';
import { getPriceAndVolume } from '../services/coingecko.service.js';

export const getPriceVolumeTool = tool({
  name: 'get_price_and_volume',
  description:
    'Get the current USD price, 24h trading volume, market cap, and 24h price change for a crypto token.',
  parameters: z.object({
    ticker: z
      .string()
      .describe('Crypto ticker symbol, e.g. BTC, ETH, SOL'),
  }),
  execute: async ({ ticker }) => {
    const data = await getPriceAndVolume(ticker);
    if (!data) return JSON.stringify({ error: `No price data found for ${ticker}.` });
    return JSON.stringify(data);
  },
});
