import type { BotContext } from '../context.js';
import { sendMarkdownV2 } from '../utils/markdown.js';

export async function handleStart(ctx: BotContext): Promise<void> {
  const name = ctx.from?.first_name ?? 'there';

  const message = `*Atlas here\\.*

Welcome, ${name}\\. I'm your portfolio analyst — direct, data\\-driven, no fluff\\.

Tell me what you're holding \\(e\\.g\\. _"I have 50 SOL and 2 ETH"_\\), send me a screenshot of your holdings, or use /analyze once your bags are loaded\\.

Let's get to work\\.`;

  await sendMarkdownV2(ctx, message);
}
