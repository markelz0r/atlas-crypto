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

// --- Stablecoin flows ---

const StablecoinSchema = z.object({
  peggedAssets: z.array(
    z.object({
      name: z.string(),
      symbol: z.string(),
      circulating: z.object({
        peggedUSD: z.number().optional(),
      }).optional(),
      circulatingPrevDay: z.object({
        peggedUSD: z.number().optional(),
      }).optional(),
      circulatingPrevWeek: z.object({
        peggedUSD: z.number().optional(),
      }).optional(),
    }),
  ),
});

export interface StablecoinFlow {
  name: string;
  symbol: string;
  circulating: number;
  change1d: number | null;
  change7d: number | null;
}

export interface StablecoinSummary {
  totalCirculating: number;
  totalChange1d: number;
  totalChange7d: number;
  top: StablecoinFlow[];
}

export async function getStablecoinFlows(): Promise<StablecoinSummary | null> {
  try {
    const res = await fetch(`${config.DEFILLAMA_BASE_URL.replace('api.llama.fi', 'stablecoins.llama.fi')}/stablecoins?includePrices=false`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = StablecoinSchema.parse(await res.json());

    const flows: StablecoinFlow[] = data.peggedAssets
      .filter((s) => s.circulating?.peggedUSD && s.circulating.peggedUSD > 100_000_000)
      .map((s) => {
        const circ = s.circulating?.peggedUSD ?? 0;
        const prevDay = s.circulatingPrevDay?.peggedUSD;
        const prevWeek = s.circulatingPrevWeek?.peggedUSD;
        return {
          name: s.name,
          symbol: s.symbol,
          circulating: circ,
          change1d: prevDay ? circ - prevDay : null,
          change7d: prevWeek ? circ - prevWeek : null,
        };
      })
      .sort((a, b) => b.circulating - a.circulating);

    const totalCirculating = flows.reduce((s, f) => s + f.circulating, 0);
    const totalChange1d = flows.reduce((s, f) => s + (f.change1d ?? 0), 0);
    const totalChange7d = flows.reduce((s, f) => s + (f.change7d ?? 0), 0);

    return {
      totalCirculating,
      totalChange1d,
      totalChange7d,
      top: flows.slice(0, 5),
    };
  } catch {
    return null;
  }
}
