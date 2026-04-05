import { z } from 'zod';
import { config } from '../config/env.js';

const TICKER_TO_PROTOCOL: Record<string, string> = {
  ETH: 'ethereum',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'polygon',
  POL: 'polygon',
  AVAX: 'avalanche',
  SOL: 'solana',
  BNB: 'bsc',
  UNI: 'uniswap',
  AAVE: 'aave',
  CRV: 'curve-dex',
  MKR: 'makerdao',
  LDO: 'lido',
  COMP: 'compound-finance',
  SNX: 'synthetix',
  SUSHI: 'sushi',
  CAKE: 'pancakeswap',
  GMX: 'gmx',
  DYDX: 'dydx',
  PENDLE: 'pendle',
  JUP: 'jupiter',
  INJ: 'injective',
  SUI: 'sui',
  APT: 'aptos',
  SEI: 'sei',
  NEAR: 'near',
  FTM: 'fantom',
  ATOM: 'cosmos',
};

const TvlSchema = z.number();

const ProtocolSchema = z.object({
  name: z.string(),
  tvl: z.number().optional(),
  change_1d: z.number().optional(),
  change_7d: z.number().optional(),
});

const DexVolumeSchema = z.object({
  total24h: z.number().optional(),
  total48hto24h: z.number().optional(),
}).passthrough();

export interface OnchainData {
  ticker: string;
  tvl: number | null;
  tvlChange1d: number | null;
  dexVolume24h: number | null;
}

export async function getOnchainFundamentals(ticker: string): Promise<OnchainData | null> {
  const upper = ticker.toUpperCase();
  const slug = TICKER_TO_PROTOCOL[upper];
  if (!slug) return null;

  const [tvl, dexVolume] = await Promise.all([
    fetchTvl(slug),
    fetchDexVolume(slug),
  ]);

  if (tvl === null && dexVolume === null) return null;

  return {
    ticker: upper,
    tvl: tvl?.tvl ?? null,
    tvlChange1d: tvl?.change1d ?? null,
    dexVolume24h: dexVolume,
  };
}

async function fetchTvl(slug: string): Promise<{ tvl: number; change1d: number | null } | null> {
  try {
    const res = await fetch(`${config.DEFILLAMA_BASE_URL}/protocols`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const protocols = z.array(ProtocolSchema).parse(await res.json());
    const match = protocols.find(
      (p) => p.name.toLowerCase() === slug.toLowerCase(),
    );
    if (!match || match.tvl === undefined) return null;

    return { tvl: match.tvl, change1d: match.change_1d ?? null };
  } catch {
    return null;
  }
}

async function fetchDexVolume(slug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${config.DEFILLAMA_BASE_URL}/summary/dexs/${slug}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;

    const data = DexVolumeSchema.parse(await res.json());
    return data.total24h ?? null;
  } catch {
    return null;
  }
}
