import type { WatchSignal, StrategyPlan } from '@aegisos/shared';
import { StrategyPlanSchema } from '@aegisos/shared';
import { randomUUID } from 'crypto';

/**
 * Concentration risk via Herfindahl–Hirschman Index (HHI).
 * HHI = Σ (share_i)² where share_i = weight_i / 100
 * Ranges from 1/n (perfectly equal) → 1.0 (single asset).
 * We normalise to [0, 100].
 */
function concentrationScore(positions: Array<{ weight: number }>): number {
  if (positions.length === 0) return 100;
  const hhi = positions.reduce((sum, p) => sum + Math.pow(p.weight / 100, 2), 0);
  // HHI of 1.0 → 100 risk, HHI of 1/n → proportionally lower
  return Math.min(100, Math.round(hhi * 100));
}

/**
 * Volatility risk: based on portfolio-weighted avg absolute 24h price change.
 * 0% move → 0 risk | 5% move → ~50 | 10%+ move → ~85+
 * Uses a sqrt curve so smaller moves still register meaningfully.
 */
function volatilityScore(avgVolatility24h: number): number {
  // sqrt scaling: 10% daily avg vol maps to ~100
  return Math.min(100, Math.round(Math.sqrt(avgVolatility24h / 10) * 100));
}

/**
 * Liquidity risk: based on portfolio-weighted avg (24h volume / market cap) ratio.
 * High ratio = liquid = low risk. Uses exponential decay.
 * ratio 0.10+ → ~10 risk | ratio 0.01 → ~50 | ratio 0.001 → ~80
 */
function liquidityScore(avgLiquidityRatio: number): number {
  if (avgLiquidityRatio <= 0) return 80;
  // Exponential decay: 100 * e^(-ratio / 0.03) gives sensible spread
  return Math.min(100, Math.round(100 * Math.exp(-avgLiquidityRatio / 0.03)));
}

/**
 * Sentiment risk from Fear & Greed index.
 * Contrarian: extreme fear AND extreme greed both = higher risk.
 * Neutral (50) = lowest risk.
 * Formula: 20 + 60 * |fgi - 50| / 50
 * fgi=0 → 80, fgi=50 → 20, fgi=100 → 80
 */
function sentimentScore(fearGreedIndex: number): number {
  return Math.min(100, Math.round(20 + 60 * (Math.abs(fearGreedIndex - 50) / 50)));
}

/**
 * Drawdown risk: measures proximity to ATH.
 * Near ATH (0% below) → elevated correction risk (80).
 * Deep drawdown → distress risk rises again.
 * Uses exponential decay from ATH + linear distress term for deep drops.
 * athDrawdown is negative (e.g. -30 means 30% below ATH).
 */
function drawdownScore(avgAthDrawdown: number): number {
  const absDrawdown = Math.abs(avgAthDrawdown);
  // Near-ATH overvaluation risk decays as you move further below ATH
  const nearAthRisk = 80 * Math.exp(-absDrawdown / 25);
  // Deep drawdown distress risk kicks in below -70%
  const distressRisk = Math.max(0, (absDrawdown - 70) * 0.5);
  return Math.min(100, Math.round(nearAthRisk + distressRisk));
}

export async function runStrategist(signal: WatchSignal, goal: string): Promise<StrategyPlan> {
  const planId = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { portfolioValue, marketRegime, topPositions, alerts, marketData } = signal;
  const maxWeight = topPositions[0]?.weight ?? 0;

  // --- 5-component risk model ---
  const C = concentrationScore(topPositions);

  const V = marketData
    ? volatilityScore(marketData.avgVolatility24h)
    : volatilityScore(marketRegime === 'volatile' ? 12 : marketRegime === 'bear' ? 7 : 3);

  const L = marketData
    ? liquidityScore(marketData.avgLiquidityRatio)
    : 30; // assume moderate liquidity if no data

  const S = marketData
    ? sentimentScore(marketData.fearGreedIndex)
    : sentimentScore(50); // neutral if no data

  const D = marketData
    ? drawdownScore(marketData.avgAthDrawdown)
    : 40; // assume moderate drawdown if no data

  // Weights: concentration 25%, volatility 25%, sentiment 20%, liquidity 15%, drawdown 15%
  const riskScore = Math.min(100, Math.round(C * 0.25 + V * 0.25 + S * 0.20 + L * 0.15 + D * 0.15));

  // --- Recommendation ---
  let recommendation: StrategyPlan['recommendation'] = 'HOLD';

  if (riskScore >= 70 || alerts.length >= 3) {
    recommendation = 'REDUCE_RISK';
  } else if (riskScore >= 45 || alerts.length >= 1) {
    recommendation = 'REBALANCE';
  } else if (marketRegime === 'bull' && riskScore < 35 && portfolioValue > 0) {
    recommendation = 'INCREASE_EXPOSURE';
  }

  if (portfolioValue === 0) recommendation = 'HOLD';

  // --- Reasoning (uses real numbers, not placeholder text) ---
  const fgLabel = marketData ? `${marketData.fearGreedLabel} (${marketData.fearGreedIndex})` : 'N/A';
  const volStr = marketData ? `${marketData.avgVolatility24h.toFixed(1)}%` : 'N/A';
  const liqStr = marketData ? (marketData.avgLiquidityRatio * 100).toFixed(2) + '%' : 'N/A';
  const athStr = marketData ? `${marketData.avgAthDrawdown.toFixed(1)}% from ATH` : 'N/A';

  const reasoning = portfolioValue === 0
    ? 'Portfolio empty. Add holdings to receive a strategy.'
    : [
        `Risk score ${riskScore}/100.`,
        `Concentration (HHI): ${C}/100.`,
        `Volatility (24h avg move ${volStr}): ${V}/100.`,
        `Sentiment (F&G ${fgLabel}): ${S}/100.`,
        `Liquidity (vol/mcap ${liqStr}): ${L}/100.`,
        `Drawdown (avg ${athStr}): ${D}/100.`,
        `Market regime: ${marketRegime}.`,
        alerts.length > 0 ? `Active alerts: ${alerts.join('; ')}.` : '',
      ].filter(Boolean).join(' ');

  // --- Worst-case analysis ---
  const worstCaseAnalysis = riskScore >= 70
    ? `High aggregate risk (${riskScore}/100). Concentration at ${C}/100, volatility at ${V}/100. Drawdown from ATH: ${athStr}. Significant market move could substantially impair portfolio.`
    : riskScore >= 45
    ? `Moderate risk (${riskScore}/100). ${maxWeight.toFixed(1)}% in top position. Market sentiment: ${fgLabel}. Consider rebalancing to reduce single-asset exposure.`
    : riskScore >= 25
    ? `Low-to-moderate risk (${riskScore}/100). Portfolio reasonably diversified. Primary concern: ${C > 50 ? 'concentration' : V > 50 ? 'volatility' : 'market sentiment'}.`
    : `Low risk (${riskScore}/100). Portfolio well-diversified, market conditions benign.`;

  // --- Actions ---
  const actions: StrategyPlan['actions'] = [];
  if (
    (recommendation === 'REBALANCE' || recommendation === 'REDUCE_RISK') &&
    topPositions.length > 0 &&
    maxWeight > 40
  ) {
    const top = topPositions[0];
    if (top) {
      const targetWeight = recommendation === 'REDUCE_RISK' ? 35 : 40;
      const excessUsd = Math.max(0, ((maxWeight - targetWeight) / 100) * portfolioValue);
      const pricePerToken = top.amount && top.amount > 0 ? top.valueUsd / top.amount : 0;
      let reduceAmount: string;
      if (pricePerToken > 0) {
        reduceAmount = (excessUsd / pricePerToken).toFixed(4);
      } else if (top.amount && top.amount > 0) {
        // No price: use % of holding proportional to excess weight
        const pct = (maxWeight - targetWeight) / maxWeight;
        reduceAmount = (top.amount * pct).toFixed(4);
      } else {
        reduceAmount = excessUsd.toFixed(2); // express in USD if no token amount
      }
      actions.push({
        type: 'TRANSFER',
        from: 'portfolio',
        to: 'stable',
        amount: reduceAmount,
        token: top.symbol,
      });
    }
  }

  return StrategyPlanSchema.parse({
    planId,
    recommendation,
    riskScore,
    worstCaseAnalysis,
    actions,
    reasoning,
    expiresAt,
  });
}
