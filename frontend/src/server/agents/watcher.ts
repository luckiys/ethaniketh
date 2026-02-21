import type { Holding, WatchSignal } from '@mudra/shared';
import { WatchSignalSchema } from '@mudra/shared';
import { getOrFetch } from '../cache';

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
  fundingRateAvg: number;
}

async function fetchMarketData(symbols: string[]): Promise<FetchedMarketData> {
  const ids = symbols
    .map((s) => COINGECKO_IDS[s.toUpperCase()])
    .filter((id): id is string => Boolean(id));

  // Always include BTC and ETH for market regime signals (even if not in portfolio)
  const marketIds = [...new Set([...ids, 'bitcoin', 'ethereum'])];

  const [coingeckoRes, fngData, fundingRes] = await Promise.allSettled([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${marketIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    ),
    getOrFetch('fearGreed', 'fng', () =>
      fetch('https://api.alternative.me/fng/?limit=1').then((r) => r.json())
    ),
    fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
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
  if (fngData.status === 'fulfilled') {
    const fng = fngData.value as { data?: Array<{ value: string; value_classification: string }> };
    if (fng.data?.[0]) {
      fearGreedIndex = parseInt(fng.data[0].value, 10);
      fearGreedLabel = fng.data[0].value_classification;
    }
  }

  let fundingRateAvg = 0;
  if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
    const funding = (await fundingRes.value.json()) as Array<{ symbol: string; lastFundingRate: string }>;
    const btcEth = funding.filter((f) => ['BTCUSDT', 'ETHUSDT'].includes(f.symbol));
    if (btcEth.length > 0) {
      const rates = btcEth.map((f) => parseFloat(f.lastFundingRate));
      fundingRateAvg = rates.reduce((a, b) => a + b, 0) / rates.length;
    }
  }

  return { assets, fearGreedIndex, fearGreedLabel, fundingRateAvg };
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
  const alerts: string[] = [];
  const symbols = [...new Set(holdings.map((h) => h.symbol.toUpperCase()))];
  const { assets, fearGreedIndex, fearGreedLabel, fundingRateAvg } = await fetchMarketData(symbols);

  let var95: number | undefined;
  let volatilityAnnualized: number | undefined;
  const varServiceUrl = process.env.VAR_SERVICE_URL || 'http://localhost:5001';
  try {
    const varRes = await fetch(`${varServiceUrl}/var`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: ['BTCUSDT', 'ETHUSDT'],
        confidence: 0.95,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (varRes.ok) {
      const varData = (await varRes.json()) as { var_portfolio_pct?: number; volatility_annualized?: number };
      var95 = varData.var_portfolio_pct;
      volatilityAnnualized = varData.volatility_annualized;
    }
  } catch {
    // VaR service optional
  }

  let protocolRiskScore: number | undefined;
  try {
    const protocols = await getOrFetch(
      'protocol',
      'protocols',
      () => fetch('https://api.llama.fi/protocols').then((r) => r.json())
    ) as Array<{ tvl?: number; change_1d?: number; change_7d?: number }>;
    if (Array.isArray(protocols)) {
      const withTvl = protocols.filter((p) => p.tvl != null && p.tvl > 0);
      const totalTvl = withTvl.reduce((s, p) => s + (p.tvl ?? 0), 0);
      if (totalTvl > 0) {
        const ch1d = withTvl.reduce((s, p) => s + ((p.change_1d ?? 0) * (p.tvl ?? 0)), 0) / totalTvl;
        const ch7d = withTvl.reduce((s, p) => s + ((p.change_7d ?? 0) * (p.tvl ?? 0)), 0) / totalTvl;
        protocolRiskScore = Math.min(100, Math.round(50 + (ch1d < 0 ? Math.abs(ch1d) * 2 : 0) + (ch7d < 0 ? Math.abs(ch7d) : 0)));
        if (ch1d < -5) alerts.push(`DeFi TVL down ${ch1d.toFixed(1)}% in 24h — sector stress`);
        if (ch7d < -10) alerts.push(`DeFi TVL down ${ch7d.toFixed(1)}% in 7d — elevated protocol risk`);
      }
    }
  } catch {
    // Protocol risk optional
  }

  let macroRegime: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
  const fredKey = process.env.FRED_API_KEY;
  if (fredKey) {
    try {
      const vixData = await getOrFetch('fred', 'vix', () =>
        fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`
        ).then((r) => r.json())
      ) as { observations?: Array<{ value?: string }> };
      const vix = parseFloat(vixData?.observations?.[0]?.value ?? '0');
      if (vix > 25) {
        macroRegime = 'risk-off';
        alerts.push('Macro regime: risk-off (VIX > 25) — defensive positioning');
      } else if (vix < 15) macroRegime = 'risk-on';
    } catch {
      // Macro optional
    }
  }

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
  if (portfolioValue === 0) alerts.push('Portfolio empty — add holdings');

  const topWeight = topPositions[0]?.weight ?? 0;
  if (topWeight > 60) alerts.push(`High concentration: ${topPositions[0]?.symbol} is ${topWeight.toFixed(1)}% of portfolio`);
  else if (topWeight > 40) alerts.push(`Moderate concentration: ${topPositions[0]?.symbol} at ${topWeight.toFixed(1)}%`);

  if (avgVolatility24h > 8) alerts.push(`Elevated volatility: avg 24h move ${avgVolatility24h.toFixed(1)}% across holdings`);

  if (fearGreedIndex <= 20) alerts.push(`Extreme market fear (F&G index: ${fearGreedIndex}) — panic selling may be occurring`);
  else if (fearGreedIndex >= 80) alerts.push(`Extreme market greed (F&G index: ${fearGreedIndex}) — potential correction risk`);

  const fundingPct = fundingRateAvg * 100;
  if (fundingPct > 0.1) alerts.push(`Elevated funding rates (${fundingPct.toFixed(3)}%) — euphoric leverage, liquidation cascade risk`);
  else if (fundingPct < -0.05) alerts.push(`Negative funding rates (${fundingPct.toFixed(3)}%) — fear/short squeeze potential`);

  if (avgAthDrawdown > -10) alerts.push(`Holdings near all-time highs (avg ${avgAthDrawdown.toFixed(1)}% from ATH) — elevated correction risk`);

  if (var95 != null && var95 > 5) alerts.push(`Elevated VaR (95%: ${var95.toFixed(1)}%) — consider reducing exposure`);

  // Goal-aware: conservative intent (preserve, safe, retirement, house, etc.)
  const goalLower = goal.toLowerCase();
  const isConservativeGoal = /conservat|safe|protect|preserv|stable|low.?risk|cautious|retirement|house|college|savings/.test(goalLower);
  if (isConservativeGoal && portfolioValue > 0) {
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
      fundingRateAvg,
      var95,
      volatilityAnnualized,
      protocolRiskScore,
      macroRegime,
      perAsset,
    },
  };

  return WatchSignalSchema.parse(signal);
}
