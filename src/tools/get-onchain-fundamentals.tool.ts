import { tool } from '@openai/agents';
import { z } from 'zod';
import { getOnchainFundamentals } from '../services/defillama.service.js';

export const getOnchainFundamentalsTool = tool({
  name: 'get_onchain_fundamentals',
  description:
    'Get on-chain fundamentals for a crypto protocol: Total Value Locked (TVL), TVL 1-day change, and 24h DEX trading volume.',
  parameters: z.object({
    ticker: z.string().describe('Crypto ticker symbol, e.g. ETH, ARB, UNI'),
  }),
  execute: async ({ ticker }) => {
    const data = await getOnchainFundamentals(ticker);
    if (!data) return JSON.stringify({ error: `No on-chain data found for ${ticker}. This token may not be a DeFi protocol.` });
    return JSON.stringify(data);
  },
});
