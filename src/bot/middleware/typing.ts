import type { BotContext } from '../context.js';

export async function sendTyping(
  ctx: BotContext,
  next: () => Promise<void>,
): Promise<void> {
  if (ctx.chat) {
    await ctx.api.sendChatAction(ctx.chat.id, 'typing').catch(() => {});
  }
  await next();
}
