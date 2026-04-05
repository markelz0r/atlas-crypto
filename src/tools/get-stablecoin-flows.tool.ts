import { tool } from '@openai/agents';
import { z } from 'zod';
import { getStablecoinFlows } from '../services/defillama.service.js';

export const getStablecoinFlowsTool = tool({
  name: 'get_stablecoin_flows',
  description:
    'Get stablecoin inflow/outflow data: total stablecoin market cap, 1-day and 7-day changes, and top stablecoins by circulation. Rising stablecoin supply = capital entering crypto. Falling = capital leaving.',
  parameters: z.object({}),
  execute: async () => {
    const data = await getStablecoinFlows();
    if (!data) return JSON.stringify({ error: 'Stablecoin flow data unavailable.' });
    return JSON.stringify(data);
  },
});
