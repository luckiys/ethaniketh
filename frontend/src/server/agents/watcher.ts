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

interface AssetMarketData {
  symbol: string;
  price: number;
  change24h: number;      // % e.g. 2.5
  marketCap: number;      // USD
  volume24h: number;      // USD
  athDrawdown: number;    // % below ATH, e.g. -30 means 30% below ATH
}

interface FetchedMarketData {
  assets: Record<string, AssetMarketData>;
  fearGreedIndex: number;
  fearGreedLabel: string;
}

async function fetchMarketData(symbols: string[]): Promise<FetchedMarketData> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter((id): id is string => Boolean(id));

  // Always include BTC and ETH for market regime signals (even if not in portfolio)
  const marketIds = [...new Set([...ids, 'bitcoin', 'ethereum'])];

  const [coingeckoRes, fngRes] = await Promise.allSettled([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${marketIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    ),
    fetch('https://api.alternative.me/fng/?limit=1'),
  ]);

  const assets: Record<string, AssetMarketData> = {};

  if (coingeckoRes.status === 'fulfilled' && coingeckoRes.value.ok) {
    const data = (await coingeckoRes.value.json()) as Array<{
      id: string;
      current_price?: number;
      market_cap?: number;
      total_volume?: number;
      price_change_percentage_24h?: number;
      ath_change_percentage?: number;
    }>;
    for (const item of data) {
      const symbol = Object.entries(COINGECKO_IDS).find(([, v]) => v === item.id)?.[0] ?? item.id.toUpperCase();
      assets[symbol] = {
        symbol,
        price: item.current_price ?? 0,
        change24h: item.price_change_percentage_24h ?? 0,
        marketCap: item.market_cap ?? 0,
        volume24h: item.total_volume ?? 0,
        athDrawdown: item.ath_change_percentage ?? 0,
      };
    }
  }

  let fearGreedIndex = 50;
  let fearGreedLabel = 'Neutral';
  if (fngRes.status === 'fulfilled' && fngRes.value.ok) {
    const fng = (await fngRes.value.json()) as { data?: Array<{ value: string; value_classification: string }> };
    if (fng.data?.[0]) {
      fearGreedIndex = parseInt(fng.data[0].value, 10);
      fearGreedLabel = fng.data[0].value_classification;
    }
  }

  return { assets, fearGreedIndex, fearGreedLabel };
}

function inferMarketRegime(assets: Record<string, AssetMarketData>): 'bull' | 'bear' | 'sideways' | 'volatile' {
  const keyAssets = ['BTC', 'ETH'];
  const changes = keyAssets.filter((s) => s in assets).map((s) => assets[s].change24h);
  if (changes.length === 0) return 'sideways';

  const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
  const maxAbs = Math.max(...changes.map(Math.abs));

  if (maxAbs > 10) return 'volatile';
  if (avg > 5) return 'bull';
  if (avg < -5) return 'bear';
  return 'sideways';
}

function weightedAvg(items: Array<{ value: number; weight: number }>): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((s, i) => s + i.value * i.weight, 0) / totalWeight;
}

export async function runWatcher(holdings: Holding[], goal: string): Promise<WatchSignal> {
  const symbols = [...new Set(holdings.map((h) => h.symbol.toUpperCase()))];
  const { assets, fearGreedIndex, fearGreedLabel } = await fetchMarketData(symbols);

  // Build positions using live prices
  const positions = holdings.map((h) => {
    const sym = h.symbol.toUpperCase();
    const asset = assets[sym];
    const price = asset?.price ?? 0;
    const valueUsd = price > 0 ? h.amount * price : (h.valueUsd ?? 0);
    return { symbol: h.symbol, amount: h.amount, valueUsd, asset };
  });

  const portfolioValue = positions.reduce((sum, p) => sum + p.valueUsd, 0);

  const topPositions = [...positions]
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 5)
    .map((p) => ({
      symbol: p.symbol,
      weight: portfolioValue > 0 ? (p.valueUsd / portfolioValue) * 100 : 0,
      valueUsd: p.valueUsd,
      amount: p.amount,
    }));

  // Build per-asset data for positions that have CoinGecko data
  const perAsset = positions
    .filter((p) => p.asset)
    .map((p) => ({
      symbol: p.symbol,
      change24h: p.asset!.change24h,
      marketCap: p.asset!.marketCap,
      volume24h: p.asset!.volume24h,
      athDrawdown: p.asset!.athDrawdown,
    }));

  // Compute portfolio-weighted market metrics
  const weightedItems = positions.map((p) => ({
    weight: p.valueUsd,
    change24h: p.asset?.change24h ?? 0,
    liquidityRatio: p.asset && p.asset.marketCap > 0 ? p.asset.volume24h / p.asset.marketCap : 0,
    athDrawdown: p.asset?.athDrawdown ?? 0,
  }));

  const avgVolatility24h = portfolioValue > 0
    ? weightedAvg(weightedItems.map((w) => ({ value: Math.abs(w.change24h), weight: w.weight })))
    : 0;

  const avgLiquidityRatio = portfolioValue > 0
    ? weightedAvg(weightedItems.map((w) => ({ value: w.liquidityRatio, weight: w.weight })))
    : 0;

  const avgAthDrawdown = portfolioValue > 0
    ? weightedAvg(weightedItems.map((w) => ({ value: w.athDrawdown, weight: w.weight })))
    : 0;

  // Build alerts from real data
  const alerts: string[] = [];
  if (portfolioValue === 0) alerts.push('Portfolio empty — add holdings');

  const topWeight = topPositions[0]?.weight ?? 0;
  if (topWeight > 60) alerts.push(`High concentration: ${topPositions[0]?.symbol} is ${topWeight.toFixed(1)}% of portfolio`);
  else if (topWeight > 40) alerts.push(`Moderate concentration: ${topPositions[0]?.symbol} at ${topWeight.toFixed(1)}%`);

  if (avgVolatility24h > 8) alerts.push(`Elevated volatility: avg 24h move ${avgVolatility24h.toFixed(1)}% across holdings`);

  if (fearGreedIndex <= 20) alerts.push(`Extreme market fear (F&G index: ${fearGreedIndex}) — panic selling may be occurring`);
  else if (fearGreedIndex >= 80) alerts.push(`Extreme market greed (F&G index: ${fearGreedIndex}) — potential correction risk`);

  if (avgAthDrawdown > -10) alerts.push(`Holdings near all-time highs (avg ${avgAthDrawdown.toFixed(1)}% from ATH) — elevated correction risk`);

  if (goal.toLowerCase().includes('conservative') && portfolioValue > 0) {
    const volatilePositions = positions.filter((p) =>
      ['ETH', 'BTC', 'SOL', 'AVAX'].includes(p.symbol.toUpperCase())
    );
    const volatilePct = volatilePositions.reduce((s, p) => s + p.valueUsd, 0) / portfolioValue;
    if (volatilePct > 0.5) alerts.push(`Conservative goal: ${(volatilePct * 100).toFixed(0)}% in volatile assets`);
  }

  const marketRegime = inferMarketRegime(assets);

  const signal: WatchSignal = {
    portfolioValue,
    marketRegime,
    topPositions,
    alerts,
    timestamp: new Date().toISOString(),
    marketData: {
      fearGreedIndex,
      fearGreedLabel,
      avgVolatility24h,
      avgLiquidityRatio,
      avgAthDrawdown,
      perAsset,
    },
  };

  return WatchSignalSchema.parse(signal);
}
