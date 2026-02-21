import type { Holding, WatchSignal } from '@mudra/shared';
import { WatchSignalSchema } from '@mudra/shared';

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

async function fetchPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()] || s.toLowerCase())
    .filter(Boolean);
  if (ids.length === 0) return {};

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
    );
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const prices: Record<string, number> = {};
    for (const [id, val] of Object.entries(data)) {
      const symbol = Object.entries(COINGECKO_IDS).find(([, v]) => v === id)?.[0] ?? id.toUpperCase();
      prices[symbol] = val?.usd ?? 0;
    }
    return prices;
  } catch {
    return Object.fromEntries(symbols.map((s) => [s, 0]));
  }
}

function inferMarketRegime(portfolioValue: number, alerts: string[]): 'bull' | 'bear' | 'sideways' | 'volatile' {
  if (alerts.some((a) => a.toLowerCase().includes('crash') || a.toLowerCase().includes('dump')))
    return 'bear';
  if (alerts.some((a) => a.toLowerCase().includes('pump') || a.toLowerCase().includes('rally')))
    return 'bull';
  if (alerts.some((a) => a.toLowerCase().includes('volatile') || a.toLowerCase().includes('swing')))
    return 'volatile';
  return 'sideways';
}

export async function runWatcher(holdings: Holding[], goal: string): Promise<WatchSignal> {
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const prices = await fetchPrices(symbols);

  const positions = holdings.map((h) => {
    const price = prices[h.symbol.toUpperCase()] ?? h.valueUsd ?? 0;
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

  const marketRegime = inferMarketRegime(portfolioValue, alerts);

  const signal: WatchSignal = {
    portfolioValue,
    marketRegime,
    topPositions,
    alerts,
    timestamp: new Date().toISOString(),
  };

  return WatchSignalSchema.parse(signal);
}
