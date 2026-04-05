import { tool } from '@openai/agents';
import { z } from 'zod';
import { getTrending, getGlobalMarketData } from '../services/coingecko.service.js';

export const getMarketOverviewTool = tool({
  name: 'get_market_overview',
  description:
    'Get a snapshot of the overall crypto market: total market cap, BTC/ETH dominance, 24h market cap change, and currently trending coins. Use this for general market context.',
  parameters: z.object({}),
  execute: async () => {
    const [global, trending] = await Promise.all([
      getGlobalMarketData(),
      getTrending(),
    ]);
    return JSON.stringify({
      global: global ?? 'unavailable',
      trending: trending.slice(0, 7),
    });
  },
});
