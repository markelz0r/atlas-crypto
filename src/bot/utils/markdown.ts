import type { BotContext } from '../context.js';

const ESCAPE_CHARS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(ESCAPE_CHARS, '\\$1');
}

export async function sendMarkdownV2(
  ctx: BotContext,
  text: string,
): Promise<void> {
  try {
    await ctx.reply(text, { parse_mode: 'MarkdownV2' });
  } catch {
    // MarkdownV2 parse failed — send as plain text
    await ctx.reply(text.replace(/\\([_*\[\]()~`>#+\-=|{}.!])/g, '$1'));
  }
}
