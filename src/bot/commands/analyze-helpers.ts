import type { PriceData, GlobalMarketData, TrendingCoin } from '../../services/coingecko.service.js';
import type { OnchainData, StablecoinSummary } from '../../services/defillama.service.js';
import type { FearGreedData } from '../../services/fear-greed.service.js';

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(decimals)}K`;
  return `$${n.toFixed(decimals)}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function buildAssetDataBlock(
  ticker: string,
  amount: number,
  avgBuyPrice: number | undefined,
  price: PriceData | null,
  fundamentals: OnchainData | null,
): string {
  const lines: string[] = [`=== ${ticker} (Holding: ${amount}) ===`];

  if (avgBuyPrice) {
    lines.push(`Avg Buy Price: $${avgBuyPrice}`);
  }

  if (price) {
    lines.push(`Price: $${price.price} (${pct(price.change24h)} 24h)`);
    lines.push(`Market Cap: ${fmt(price.marketCap)} | 24h Volume: ${fmt(price.volume24h)}`);
    if (avgBuyPrice && price.price) {
      const pnlPct = ((price.price - avgBuyPrice) / avgBuyPrice) * 100;
      lines.push(`P&L: ${pct(pnlPct)} from avg buy`);
    }
  } else {
    lines.push('Price: No data available');
  }

  if (fundamentals) {
    const tvlLine = fundamentals.tvl
      ? `TVL: ${fmt(fundamentals.tvl)} (${pct(fundamentals.tvlChange1d)} 1d)`
      : 'TVL: N/A';
    const dexLine = fundamentals.dexVolume24h
      ? `DEX Volume 24h: ${fmt(fundamentals.dexVolume24h)}`
      : 'DEX Volume: N/A';
    lines.push(tvlLine);
    lines.push(dexLine);
  }

  return lines.join('\n');
}

export function buildMarketContext(
  fearGreed: FearGreedData | null,
  global: GlobalMarketData | null,
  trending: TrendingCoin[],
  stablecoins: StablecoinSummary | null,
): string {
  const lines: string[] = [];

  if (fearGreed) {
    lines.push(`Fear & Greed: ${fearGreed.current.value}/100 (${fearGreed.current.classification}), trend: ${fearGreed.trend}`);
  }

  if (global) {
    lines.push(`Total Market Cap: ${fmt(global.totalMarketCapUsd)} (${pct(global.marketCapChange24h)} 24h)`);
    lines.push(`BTC Dominance: ${global.btcDominance.toFixed(1)}% | ETH Dominance: ${global.ethDominance.toFixed(1)}%`);
  }

  if (stablecoins) {
    lines.push(`Stablecoin Supply: ${fmt(stablecoins.totalCirculating)} (1d: ${fmt(stablecoins.totalChange1d)}, 7d: ${fmt(stablecoins.totalChange7d)})`);
  }

  if (trending.length > 0) {
    lines.push(`Trending: ${trending.slice(0, 5).map((t) => t.symbol).join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'Market context unavailable.';
}
