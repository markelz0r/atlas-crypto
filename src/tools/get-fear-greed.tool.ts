import { tool } from '@openai/agents';
import { z } from 'zod';
import { getFearAndGreed } from '../services/fear-greed.service.js';

export const getFearGreedTool = tool({
  name: 'get_fear_and_greed',
  description:
    'Get the current Crypto Fear & Greed Index (0-100). Provides market sentiment: Extreme Fear, Fear, Neutral, Greed, Extreme Greed. Also shows weekly trend.',
  parameters: z.object({}),
  execute: async () => {
    const data = await getFearAndGreed();
    if (!data) return JSON.stringify({ error: 'Fear & Greed data unavailable.' });
    return JSON.stringify(data);
  },
});
