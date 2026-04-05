import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  COINGECKO_BASE_URL: z.string().url().default('https://api.coingecko.com/api/v3'),
  DEFILLAMA_BASE_URL: z.string().url().default('https://api.llama.fi'),
});

export const config = envSchema.parse(process.env);
