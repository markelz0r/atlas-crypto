import { z } from 'zod';

const API_URL = 'https://api.alternative.me/fng/?limit=7&format=json';

const FearGreedSchema = z.object({
  data: z.array(
    z.object({
      value: z.string(),
      value_classification: z.string(),
      timestamp: z.string(),
    }),
  ),
});

export interface FearGreedData {
  current: { value: number; classification: string };
  weekAgo: { value: number; classification: string } | null;
  trend: 'improving' | 'worsening' | 'stable';
}

export async function getFearAndGreed(): Promise<FearGreedData | null> {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const parsed = FearGreedSchema.parse(await res.json());
    if (parsed.data.length === 0) return null;

    const current = {
      value: parseInt(parsed.data[0].value, 10),
      classification: parsed.data[0].value_classification,
    };

    const weekEntry = parsed.data[parsed.data.length - 1];
    const weekAgo = weekEntry
      ? { value: parseInt(weekEntry.value, 10), classification: weekEntry.value_classification }
      : null;

    let trend: FearGreedData['trend'] = 'stable';
    if (weekAgo) {
      const diff = current.value - weekAgo.value;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'worsening';
    }

    return { current, weekAgo, trend };
  } catch {
    return null;
  }
}
