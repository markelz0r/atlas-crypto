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
