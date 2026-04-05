import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { User } from '../../models/user.model.js';
import type { BotContext } from '../context.js';
import { escapeHtml, sendFormatted } from '../utils/markdown.js';

const HoldingsSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string(),
      amount: z.number(),
      averageBuyPrice: z.number().optional(),
    }),
  ),
});

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export async function handlePhoto(ctx: BotContext): Promise<void> {
  if (!ctx.message?.photo || !ctx.from) return;

  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat!.id, 'typing').catch(() => {});
  }, 4000);

  try {
    // Get the highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content:
            'You extract crypto holdings from screenshots. Return ONLY valid JSON matching this schema: { "holdings": [{ "ticker": "BTC", "amount": 1.5, "averageBuyPrice": 60000 }] }. Use uppercase tickers. If averageBuyPrice is not visible, omit it. If you cannot identify holdings, return { "holdings": [] }.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all crypto holdings from this screenshot.',
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    clearInterval(typingInterval);

    const raw = completion.choices[0].message.content;
    if (!raw) {
      await ctx.reply("Couldn't read that screenshot. Try again with a clearer image.");
      return;
    }

    const parsed = HoldingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.holdings.length === 0) {
      await ctx.reply(
        "Couldn't identify any holdings in that screenshot. Make sure it shows your portfolio with tickers and amounts.",
      );
      return;
    }

    // Apply updates to portfolio
    const user = ctx.dbUser;
    const changes: string[] = [];

    for (const holding of parsed.data.holdings) {
      const ticker = holding.ticker.toUpperCase();
      const existing = user.portfolio.find((a) => a.ticker === ticker);

      if (existing) {
        if (existing.amount !== holding.amount) {
          changes.push(`${ticker}: ${existing.amount} → ${holding.amount}`);
          existing.amount = holding.amount;
        }
        if (holding.averageBuyPrice !== undefined) {
          existing.averageBuyPrice = holding.averageBuyPrice;
        }
      } else {
        changes.push(`${ticker}: +${holding.amount} (new)`);
        user.portfolio.push({
          ticker,
          amount: holding.amount,
          averageBuyPrice: holding.averageBuyPrice,
        });
      }
    }

    if (changes.length === 0) {
      await ctx.reply('Portfolio already matches. No changes needed.');
      return;
    }

    await user.save();

    const summary = changes.map((c) => `• ${escapeHtml(c)}`).join('\n');
    await sendFormatted(
      ctx,
      `<b>Portfolio updated.</b>\n\n${summary}\n\n<i>${user.portfolio.length} assets tracked.</i>`,
    );
  } catch (error) {
    clearInterval(typingInterval);
    console.error('Photo handler error:', error);
    await ctx.reply('Failed to process that image. Try again.');
  }
}
