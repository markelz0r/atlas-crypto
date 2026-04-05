import OpenAI from 'openai';
import { config } from '../../config/env.js';
import { getPriceAndVolume } from '../../services/coingecko.service.js';
import { getOnchainFundamentals } from '../../services/defillama.service.js';
import type { BotContext } from '../context.js';
import { sendMarkdownV2 } from '../utils/markdown.js';
import { buildAssetDataBlock } from './analyze-helpers.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are Atlas, a ruthless, highly analytical crypto hedge fund manager. Analyze the user's portfolio based ONLY on the provided data. Do not hallucinate data points.

Provide:
1. A 2-3 sentence executive summary of the portfolio's overall health and total estimated value
2. For each asset: a bulleted breakdown of risks and bullish signals, followed by a verdict (Accumulate, Hold, or Trim)
3. A final portfolio-level recommendation

Format in clean Telegram MarkdownV2. Use *bold* for emphasis, and properly escape special characters (\\., \\!, \\-, \\(, \\), etc.). Keep it mobile-friendly with short paragraphs.`;

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

    // Fan-out: fetch all data concurrently
    const [priceResults, fundamentalsResults] = await Promise.all([
      Promise.all(tickers.map((t) => getPriceAndVolume(t).catch(() => null))),
      Promise.all(
        tickers.map((t) => getOnchainFundamentals(t).catch(() => null)),
      ),
    ]);

    // Normalize into data feed
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

    const userPrompt = `My portfolio:\n${user.portfolio.map((a) => `- ${a.amount} ${a.ticker}`).join('\n')}\n\nData Feed:\n${dataFeed}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    clearInterval(typingInterval);

    const response =
      completion.choices[0].message.content ?? 'Analysis failed.';
    await sendMarkdownV2(ctx, response);
  } catch (error) {
    clearInterval(typingInterval);
    console.error('/analyze error:', error);
    await ctx.reply('Analysis failed. Try again in a moment.');
  }
}
