import type { BotContext } from '../context.js';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendFormatted(
  ctx: BotContext,
  text: string,
): Promise<void> {
  try {
    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch {
    // HTML parse failed — strip tags and send as plain text
    await ctx.reply(text.replace(/<[^>]+>/g, ''));
  }
}
