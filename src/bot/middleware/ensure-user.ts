import type { BotContext } from '../context.js';
import { User } from '../../models/user.model.js';

export async function ensureUser(
  ctx: BotContext,
  next: () => Promise<void>,
): Promise<void> {
  if (!ctx.from) return;

  const user = await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    {
      $setOnInsert: {
        telegramId: ctx.from.id,
        username: ctx.from.username,
        portfolio: [],
      },
    },
    { upsert: true, new: true },
  );

  ctx.dbUser = user!;
  await next();
}
