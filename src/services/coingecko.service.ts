import { z } from 'zod';
import { config } from '../config/env.js';

const TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'matic-network',
  POL: 'matic-network',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  SUI: 'sui',
  APT: 'aptos',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  ATOM: 'cosmos',
  NEAR: 'near',
  FTM: 'fantom',
  CRV: 'curve-dao-token',
  MKR: 'maker',
  LDO: 'lido-dao',
  RPL: 'rocket-pool',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  FIL: 'filecoin',
  RENDER: 'render-token',
  GRT: 'the-graph',
  STX: 'blockstack',
  BNB: 'binancecoin',
  TRX: 'tron',
  TON: 'the-open-network',
  ALGO: 'algorand',
  ICP: 'internet-computer',
  XLM: 'stellar',
  HBAR: 'hedera-hashgraph',
  VET: 'vechain',
  EOS: 'eos',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  ENS: 'ethereum-name-service',
  PENDLE: 'pendle',
  JUP: 'jupiter-exchange-solana',
  W: 'wormhole',
  ENA: 'ethena',
  EIGEN: 'eigenlayer',
  JTO: 'jito-governance-token',
  PYTH: 'pyth-network',
  WLD: 'worldcoin-wld',
  TAO: 'bittensor',
};

const SearchResultSchema = z.object({
  coins: z.array(
    z.object({
      id: z.string(),
      symbol: z.string(),
      name: z.string(),
    }),
  ),
});

const PriceResponseSchema = z.record(
  z.object({
    usd: z.number(),
    usd_market_cap: z.number().optional(),
    usd_24h_vol: z.number().optional(),
    usd_24h_change: z.number().optional(),
  }),
);

export interface PriceData {
  ticker: string;
  price: number;
  marketCap: number | null;
  volume24h: number | null;
  change24h: number | null;
}

async function resolveTickerId(ticker: string): Promise<string | null> {
  const upper = ticker.toUpperCase();
  if (TICKER_TO_ID[upper]) return TICKER_TO_ID[upper];

  try {
    const res = await fetch(
      `${config.COINGECKO_BASE_URL}/search?query=${encodeURIComponent(ticker)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const data = SearchResultSchema.parse(await res.json());
    const match = data.coins.find(
      (c) => c.symbol.toUpperCase() === upper,
    );
    if (match) {
      TICKER_TO_ID[upper] = match.id;
      return match.id;
    }
  } catch {
    // search failed, return null
  }
  return null;
}

export async function getPriceAndVolume(ticker: string): Promise<PriceData | null> {
  const id = await resolveTickerId(ticker);
  if (!id) return null;

  const url = `${config.COINGECKO_BASE_URL}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true&include_24hr_change=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!res.ok) return null;

  const raw = PriceResponseSchema.parse(await res.json());
  const entry = raw[id];
  if (!entry) return null;

  return {
    ticker: ticker.toUpperCase(),
    price: entry.usd,
    marketCap: entry.usd_market_cap ?? null,
    volume24h: entry.usd_24h_vol ?? null,
    change24h: entry.usd_24h_change ?? null,
  };
}

// --- Full coin data (social, dev, liquidity) ---

const CoinDetailSchema = z.object({
  market_cap_rank: z.number().nullable().optional(),
  sentiment_votes_up_percentage: z.number().nullable().optional(),
  sentiment_votes_down_percentage: z.number().nullable().optional(),
  developer_data: z.object({
    forks: z.number().nullable().optional(),
    stars: z.number().nullable().optional(),
    subscribers: z.number().nullable().optional(),
    commit_count_4_weeks: z.number().nullable().optional(),
  }).optional(),
  community_data: z.object({
    twitter_followers: z.number().nullable().optional(),
    reddit_subscribers: z.number().nullable().optional(),
    reddit_average_posts_48h: z.number().nullable().optional(),
    reddit_average_comments_48h: z.number().nullable().optional(),
  }).optional(),
  liquidity_score: z.number().nullable().optional(),
  public_interest_score: z.number().nullable().optional(),
}).passthrough();

export interface CoinDetail {
  ticker: string;
  marketCapRank: number | null;
  sentimentUp: number | null;
  developer: {
    githubStars: number | null;
    githubForks: number | null;
    commits4w: number | null;
  };
  community: {
    twitterFollowers: number | null;
    redditSubscribers: number | null;
  };
  liquidityScore: number | null;
}

export async function getCoinDetail(ticker: string): Promise<CoinDetail | null> {
  const id = await resolveTickerId(ticker);
  if (!id) return null;

  try {
    const res = await fetch(
      `${config.COINGECKO_BASE_URL}/coins/${id}?localization=false&tickers=false&market_data=false&sparkline=false`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;

    const data = CoinDetailSchema.parse(await res.json());
    return {
      ticker: ticker.toUpperCase(),
      marketCapRank: data.market_cap_rank ?? null,
      sentimentUp: data.sentiment_votes_up_percentage ?? null,
      developer: {
        githubStars: data.developer_data?.stars ?? null,
        githubForks: data.developer_data?.forks ?? null,
        commits4w: data.developer_data?.commit_count_4_weeks ?? null,
      },
      community: {
        twitterFollowers: data.community_data?.twitter_followers ?? null,
        redditSubscribers: data.community_data?.reddit_subscribers ?? null,
      },
      liquidityScore: data.liquidity_score ?? null,
    };
  } catch {
    return null;
  }
}

// --- Trending coins ---

const TrendingSchema = z.object({
  coins: z.array(
    z.object({
      item: z.object({
        id: z.string(),
        symbol: z.string(),
        name: z.string(),
        market_cap_rank: z.number().nullable().optional(),
        price_btc: z.number().optional(),
      }),
    }),
  ),
});

export interface TrendingCoin {
  symbol: string;
  name: string;
  marketCapRank: number | null;
}

export async function getTrending(): Promise<TrendingCoin[]> {
  try {
    const res = await fetch(`${config.COINGECKO_BASE_URL}/search/trending`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = TrendingSchema.parse(await res.json());
    return data.coins.map((c) => ({
      symbol: c.item.symbol.toUpperCase(),
      name: c.item.name,
      marketCapRank: c.item.market_cap_rank ?? null,
    }));
  } catch {
    return [];
  }
}

// --- Global market data ---

const GlobalSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.number()),
    total_volume: z.record(z.number()),
    market_cap_percentage: z.record(z.number()),
    market_cap_change_percentage_24h_usd: z.number(),
  }),
});

export interface GlobalMarketData {
  totalMarketCapUsd: number;
  totalVolumeUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
}

export async function getGlobalMarketData(): Promise<GlobalMarketData | null> {
  try {
    const res = await fetch(`${config.COINGECKO_BASE_URL}/global`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = GlobalSchema.parse(await res.json());
    return {
      totalMarketCapUsd: data.data.total_market_cap['usd'] ?? 0,
      totalVolumeUsd: data.data.total_volume['usd'] ?? 0,
      btcDominance: data.data.market_cap_percentage['btc'] ?? 0,
      ethDominance: data.data.market_cap_percentage['eth'] ?? 0,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
    };
  } catch {
    return null;
  }
}
