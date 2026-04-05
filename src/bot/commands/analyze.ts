import OpenAI from 'openai';
import { config } from '../../config/env.js';
import { getPriceAndVolume, getGlobalMarketData, getTrending } from '../../services/coingecko.service.js';
import { getOnchainFundamentals, getStablecoinFlows } from '../../services/defillama.service.js';
import { getFearAndGreed } from '../../services/fear-greed.service.js';
import type { BotContext } from '../context.js';
import { sendFormatted } from '../utils/markdown.js';
import { buildAssetDataBlock, buildMarketContext } from './analyze-helpers.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Atlas, a blunt crypto hedge fund manager. Analyze the portfolio based ONLY on the provided data. Do not hallucinate.

Structure (keep it SHORT — this is a mobile chat):
1. 1-2 sentence portfolio health summary with total estimated value
2. Factor in the market context (sentiment, stablecoin flows, trends) when making verdicts
3. Per asset: one line with verdict (<b>Accumulate</b>, <b>Hold</b>, or <b>Trim</b>) and the key reason why
4. One sentence final recommendation

Rules:
- Format in Telegram HTML. Use <b>bold</b> for verdicts, <i>italic</i> for secondary info.
- Max 15-20 lines total. No walls of text, no checklists, no execution plans.
- Never offer to rebalance or execute trades — you only analyze.`;

export async function handleAnalyze(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;

  if (user.portfolio.length === 0) {
    await ctx.reply(
      "You have no assets. Tell me what you're holding first, or send a screenshot of your portfolio.",
    );
    return;
  }

  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat!.id, 'typing').catch(() => {});
  }, 4000);

  try {
    const tickers = user.portfolio.map((a) => a.ticker);

    // Fan-out: fetch all data concurrently (per-asset + market-wide)
    const [priceResults, fundamentalsResults, fearGreed, globalData, trending, stablecoinData] = await Promise.all([
      Promise.all(tickers.map((t) => getPriceAndVolume(t).catch(() => null))),
      Promise.all(tickers.map((t) => getOnchainFundamentals(t).catch(() => null))),
      getFearAndGreed().catch(() => null),
      getGlobalMarketData().catch(() => null),
      getTrending().catch(() => []),
      getStablecoinFlows().catch(() => null),
    ]);

    // Build per-asset data feed
    const dataFeed = tickers
      .map((ticker, i) => {
        const asset = user.portfolio.find((a) => a.ticker === ticker)!;
        return buildAssetDataBlock(
          ticker,
          asset.amount,
          asset.averageBuyPrice,
          priceResults[i],
          fundamentalsResults[i],
        );
      })
      .join('\n\n');

    // Build market context
    const marketContext = buildMarketContext(fearGreed, globalData, trending, stablecoinData);

    const userPrompt = `My portfolio:\n${user.portfolio.map((a) => `- ${a.amount} ${a.ticker}`).join('\n')}\n\n--- Market Context ---\n${marketContext}\n\n--- Per-Asset Data ---\n${dataFeed}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    clearInterval(typingInterval);

    const response =
      completion.choices[0].message.content ?? 'Analysis failed.';
    await sendFormatted(ctx, response);
  } catch (error) {
    clearInterval(typingInterval);
    console.error('/analyze error:', error);
    await ctx.reply('Analysis failed. Try again in a moment.');
  }
}
