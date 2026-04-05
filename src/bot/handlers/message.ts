import { run } from '@openai/agents';
import { atlasAgent, type AtlasContext } from '../../agent/atlas.agent.js';
import type { BotContext } from '../context.js';
import { sendFormatted } from '../utils/markdown.js';

// Store the last response ID per chat for conversation continuity.
// OpenAI handles history & compaction server-side via previousResponseId.
const lastResponseIds = new Map<number, string>();

export async function handleMessage(ctx: BotContext): Promise<void> {
  if (!ctx.message?.text || !ctx.from || !ctx.chat) return;

  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat!.id, 'typing').catch(() => {});
  }, 4000);

  try {
    const previousResponseId = lastResponseIds.get(ctx.chat.id);

    const result = await run(atlasAgent, ctx.message.text, {
      context: {
        telegramId: ctx.from.id,
        username: ctx.from.username,
      } satisfies AtlasContext,
      maxTurns: 10,
      previousResponseId,
    });

    clearInterval(typingInterval);

    if (result.lastResponseId) {
      lastResponseIds.set(ctx.chat.id, result.lastResponseId);
    }

    const response = result.finalOutput;
    if (response) {
      await sendFormatted(ctx, response);
    } else {
      await ctx.reply('No response generated. Try again.');
    }
  } catch (error) {
    clearInterval(typingInterval);
    console.error('Agent error:', error);
    await ctx.reply('Something went wrong. Try again.');
  }
}
