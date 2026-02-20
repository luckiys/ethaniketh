import type { Holding, WatchSignal } from '@aegisos/shared';
import { WatchSignalSchema } from '@aegisos/shared';

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
};

interface PriceData {
  prices: Record<string, number>;
  changes24h: Record<string, number>;
}

async function fetchPrices(symbols: string[]): Promise<PriceData> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()] || s.toLowerCase())
    .filter(Boolean);
  if (ids.length === 0) return { prices: {}, changes24h: {} };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const prices: Record<string, number> = {};
    const changes24h: Record<string, number> = {};
    for (const [id, val] of Object.entries(data)) {
      const symbol = Object.entries(COINGECKO_IDS).find(([, v]) => v === id)?.[0] ?? id.toUpperCase();
      prices[symbol] = val?.usd ?? 0;
      changes24h[symbol] = val?.usd_24h_change ?? 0;
    }
    return { prices, changes24h };
  } catch {
    return {
      prices: Object.fromEntries(symbols.map((s) => [s, 0])),
      changes24h: {},
    };
  }
}

function inferMarketRegime(changes24h: Record<string, number>): 'bull' | 'bear' | 'sideways' | 'volatile' {
  // Use BTC and ETH 24h price change as leading market indicators
  const keyAssets = ['BTC', 'ETH'];
  const relevantChanges = keyAssets
    .filter((s) => s in changes24h)
    .map((s) => changes24h[s]);

  if (relevantChanges.length === 0) return 'sideways';

  const avgChange = relevantChanges.reduce((a, b) => a + b, 0) / relevantChanges.length;
  const maxAbsChange = Math.max(...relevantChanges.map(Math.abs));

  if (maxAbsChange > 10) return 'volatile';
  if (avgChange > 5) return 'bull';
  if (avgChange < -5) return 'bear';
  return 'sideways';
}

export async function runWatcher(holdings: Holding[], goal: string): Promise<WatchSignal> {
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const { prices, changes24h } = await fetchPrices(symbols);

  const positions = holdings.map((h) => {
    const price = prices[h.symbol.toUpperCase()] ?? 0;
    const valueUsd = price > 0 ? h.amount * price : (h.valueUsd ?? 0);
    return { symbol: h.symbol, amount: h.amount, valueUsd, price };
  });

  const portfolioValue = positions.reduce((sum, p) => sum + p.valueUsd, 0);
  const topPositions = positions
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      weight: portfolioValue > 0 ? (p.valueUsd / portfolioValue) * 100 : 0,
      valueUsd: p.valueUsd,
      amount: p.amount,
    }));

  const alerts: string[] = [];
  if (portfolioValue === 0) alerts.push('Portfolio empty - add holdings');
  if (topPositions.some((p) => p.weight > 50)) alerts.push('Concentration risk: single asset >50%');
  if (goal.toLowerCase().includes('conservative') && portfolioValue > 0) {
    const volatile = positions.filter((p) =>
      ['ETH', 'BTC', 'SOL', 'AVAX'].includes(p.symbol.toUpperCase())
    );
    const volatilePct = volatile.reduce((s, p) => s + p.valueUsd, 0) / portfolioValue;
    if (volatilePct > 0.5) alerts.push('Conservative goal: consider reducing volatile assets');
  }

  const marketRegime = inferMarketRegime(changes24h);

  const signal: WatchSignal = {
    portfolioValue,
    marketRegime,
    topPositions,
    alerts,
    timestamp: new Date().toISOString(),
  };

  return WatchSignalSchema.parse(signal);
}
