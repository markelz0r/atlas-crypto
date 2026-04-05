import { run } from '@openai/agents';
import { atlasAgent, type AtlasContext } from '../../agent/atlas.agent.js';
import type { BotContext } from '../context.js';
import { sendMarkdownV2 } from '../utils/markdown.js';

export async function handleMessage(ctx: BotContext): Promise<void> {
  if (!ctx.message?.text || !ctx.from) return;

  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat!.id, 'typing').catch(() => {});
  }, 4000);

  try {
    const result = await run(atlasAgent, ctx.message.text, {
      context: {
        telegramId: ctx.from.id,
        username: ctx.from.username,
      } satisfies AtlasContext,
      maxTurns: 10,
    });

    clearInterval(typingInterval);

    const response = result.finalOutput;
    if (response) {
      await sendMarkdownV2(ctx, response);
    } else {
      await ctx.reply('No response generated. Try again.');
    }
  } catch (error) {
    clearInterval(typingInterval);
    console.error('Agent error:', error);
    await ctx.reply('Something went wrong. Try again.');
  }
}
