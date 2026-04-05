import { tool } from '@openai/agents';
import { z } from 'zod';
import { getCoinDetail } from '../services/coingecko.service.js';

export const getCoinDetailTool = tool({
  name: 'get_coin_detail',
  description:
    'Get detailed info for a crypto token: market cap rank, developer activity (GitHub stars, commits), community size (Twitter followers, Reddit subscribers), liquidity score, and community sentiment. Useful for evaluating altcoin quality beyond price.',
  parameters: z.object({
    ticker: z.string().describe('Crypto ticker symbol, e.g. ARB, UNI, PEPE'),
  }),
  execute: async ({ ticker }) => {
    const data = await getCoinDetail(ticker);
    if (!data) return JSON.stringify({ error: `No detail data found for ${ticker}.` });
    return JSON.stringify(data);
  },
});
