import type { WatchSignal, StrategyPlan } from '@aegisos/shared';
import { StrategyPlanSchema } from '@aegisos/shared';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

type GoalProfile = {
  label: 'conservative' | 'balanced' | 'aggressive' | 'yield';
  wConcentration: number;
  wVolatility: number;
  wSentiment: number;
  wLiquidity: number;
  wDrawdown: number;
  reduceRiskAt: number;
  rebalanceAt: number;
  goalSummary: string;
};

function buildReasoningPrompt(
  goal: string,
  profile: GoalProfile,
  riskScore: number,
  recommendation: string,
  C: number, V: number, S: number, L: number, D: number,
  marketRegime: string,
  alerts: string[],
  topPositions: Array<{ symbol: string; weight: number; valueUsd: number }>,
  marketData: WatchSignal['marketData'],
  portfolioValue: number,
): string {
  return `You are a DeFi portfolio risk analyst. Write a clear, concise 2-3 sentence reasoning paragraph explaining a strategy recommendation to a crypto investor.

Portfolio context:
- Goal: ${goal}
- Portfolio value: $${portfolioValue.toLocaleString()}
- Top holdings: ${topPositions.map(p => `${p.symbol} (${p.weight.toFixed(1)}%)`).join(', ')}
- Market regime: ${marketRegime}
- Fear & Greed index: ${marketData?.fearGreedIndex ?? 'N/A'} (${marketData?.fearGreedLabel ?? 'N/A'})
- 24h avg volatility: ${marketData?.avgVolatility24h.toFixed(1) ?? 'N/A'}%
- Avg drawdown from ATH: ${marketData?.avgAthDrawdown.toFixed(1) ?? 'N/A'}%

Risk breakdown (0-100 scale, higher = riskier):
- Concentration: ${C}/100
- Volatility: ${V}/100
- Market sentiment: ${S}/100
- Liquidity: ${L}/100
- Drawdown proximity: ${D}/100
- Overall risk score: ${riskScore}/100

Recommendation: ${recommendation}
${alerts.length > 0 ? `Key alerts: ${alerts.join('; ')}` : ''}

Write a plain English explanation of why this recommendation makes sense given the data. Be specific about the numbers but explain them in plain language a non-expert can understand. No bullet points, no headers — just flowing prose.`;
}

async function generateLLMReasoning(
  goal: string,
  profile: GoalProfile,
  riskScore: number,
  recommendation: string,
  C: number, V: number, S: number, L: number, D: number,
  marketRegime: string,
  alerts: string[],
  topPositions: Array<{ symbol: string; weight: number; valueUsd: number }>,
  marketData: WatchSignal['marketData'],
  portfolioValue: number,
): Promise<string | null> {
  const prompt = buildReasoningPrompt(
    goal, profile, riskScore, recommendation,
    C, V, S, L, D,
    marketRegime, alerts, topPositions, marketData, portfolioValue,
  );

  // Try Gemini first (free tier, no credit card required)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text) return text;
  }

  // Fall back to Anthropic Claude if key is present
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0];
    return content.type === 'text' ? content.text.trim() : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Goal profile — parsed from free-text goal, controls risk weights + thresholds
// ---------------------------------------------------------------------------

function parseGoalProfile(goal: string): GoalProfile {
  const g = goal.toLowerCase();

  const isConservative =
    /conservat|safe|protect|preserv|stable|low.?risk|minimal.?risk|capital.?preserv|cautious|slow|steady/.test(g);
  const isAggressive =
    /aggress|maximiz|max.?(yield|return|profit)|high.?risk|bold|growth|moon|ape|degen|all.?in/.test(g);
  const isYield =
    /yield|income|dividend|staking|earn|passive|cash.?flow|interest/.test(g);

  if (isConservative) {
    return {
      label: 'conservative',
      // Conservative: concentration and volatility matter most — punish both hard
      wConcentration: 0.35,
      wVolatility: 0.30,
      wSentiment: 0.15,
      wLiquidity: 0.12,
      wDrawdown: 0.08,
      // Tighter thresholds — trigger warnings sooner
      reduceRiskAt: 55,
      rebalanceAt: 35,
      goalSummary: 'capital preservation / low risk',
    };
  }

  if (isAggressive) {
    return {
      label: 'aggressive',
      // Aggressive: concentration is fine, focus more on liquidity and market timing (drawdown/sentiment)
      wConcentration: 0.10,
      wVolatility: 0.20,
      wSentiment: 0.25,
      wLiquidity: 0.20,
      wDrawdown: 0.25,
      // Wider thresholds — only flag extreme risk
      reduceRiskAt: 82,
      rebalanceAt: 65,
      goalSummary: 'aggressive growth / high risk tolerance',
    };
  }

  if (isYield) {
    return {
      label: 'yield',
      // Yield: liquidity and sentiment matter most (can't earn yield on illiquid or panic-sold positions)
      wConcentration: 0.20,
      wVolatility: 0.15,
      wSentiment: 0.25,
      wLiquidity: 0.25,
      wDrawdown: 0.15,
      reduceRiskAt: 68,
      rebalanceAt: 45,
      goalSummary: 'yield / passive income',
    };
  }

  // Balanced (default)
  return {
    label: 'balanced',
    wConcentration: 0.25,
    wVolatility: 0.25,
    wSentiment: 0.20,
    wLiquidity: 0.15,
    wDrawdown: 0.15,
    reduceRiskAt: 70,
    rebalanceAt: 45,
    goalSummary: 'balanced growth / moderate risk',
  };
}

// ---------------------------------------------------------------------------
// Risk component functions — each returns 0–100
// ---------------------------------------------------------------------------

/**
 * Concentration risk via Herfindahl–Hirschman Index (HHI).
 * Single asset → HHI = 1.0 → score 100.
 * 5 equal assets → HHI = 0.2 → score 20.
 */
function concentrationScore(positions: Array<{ weight: number }>): number {
  if (positions.length === 0) return 100;
  const hhi = positions.reduce((sum, p) => sum + Math.pow(p.weight / 100, 2), 0);
  return Math.min(100, Math.round(hhi * 100));
}

/**
 * Volatility risk: portfolio-weighted avg |24h change|.
 * Uses sqrt scaling: 10% daily avg move → ~100.
 */
function volatilityScore(avgVolatility24h: number): number {
  return Math.min(100, Math.round(Math.sqrt(avgVolatility24h / 10) * 100));
}

/**
 * Liquidity risk: portfolio-weighted avg (24h volume / market cap).
 * Exponential decay: high ratio = liquid = low risk.
 */
function liquidityScore(avgLiquidityRatio: number): number {
  if (avgLiquidityRatio <= 0) return 80;
  return Math.min(100, Math.round(100 * Math.exp(-avgLiquidityRatio / 0.03)));
}

/**
 * Sentiment risk from Fear & Greed index.
 * Contrarian: extreme fear AND extreme greed both = higher risk.
 * Neutral (50) = minimum risk.
 * Formula: 20 + 60 × |fgi − 50| / 50
 */
function sentimentScore(fearGreedIndex: number): number {
  return Math.min(100, Math.round(20 + 60 * (Math.abs(fearGreedIndex - 50) / 50)));
}

/**
 * Drawdown risk: proximity to all-time high.
 * Near ATH (0%) → high correction risk (80).
 * Very deep drawdown → distress risk kicks back in.
 * athDrawdown is negative (e.g. -30 = 30% below ATH).
 */
function drawdownScore(avgAthDrawdown: number): number {
  const abs = Math.abs(avgAthDrawdown);
  const nearAthRisk = 80 * Math.exp(-abs / 25);
  const distressRisk = Math.max(0, (abs - 70) * 0.5);
  return Math.min(100, Math.round(nearAthRisk + distressRisk));
}

// ---------------------------------------------------------------------------
// Main strategist
// ---------------------------------------------------------------------------

export async function runStrategist(signal: WatchSignal, goal: string): Promise<StrategyPlan> {
  const planId = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { portfolioValue, marketRegime, topPositions, alerts, marketData } = signal;
  const maxWeight = topPositions[0]?.weight ?? 0;

  // Parse goal to determine profile (weights + thresholds)
  const profile = parseGoalProfile(goal);

  // --- Compute 5 risk components (each 0–100) ---
  const C = concentrationScore(topPositions);

  const V = marketData
    ? volatilityScore(marketData.avgVolatility24h)
    : volatilityScore(marketRegime === 'volatile' ? 12 : marketRegime === 'bear' ? 7 : 3);

  const L = marketData ? liquidityScore(marketData.avgLiquidityRatio) : 30;

  const S = marketData ? sentimentScore(marketData.fearGreedIndex) : sentimentScore(50);

  const D = marketData ? drawdownScore(marketData.avgAthDrawdown) : 40;

  // Weighted risk score using goal-driven weights
  const riskScore = Math.min(
    100,
    Math.round(
      C * profile.wConcentration +
      V * profile.wVolatility +
      S * profile.wSentiment +
      L * profile.wLiquidity +
      D * profile.wDrawdown
    )
  );

  // --- Recommendation — thresholds depend on goal profile ---
  let recommendation: StrategyPlan['recommendation'] = 'HOLD';

  if (portfolioValue === 0) {
    recommendation = 'HOLD';
  } else if (riskScore >= profile.reduceRiskAt || alerts.length >= 3) {
    recommendation = 'REDUCE_RISK';
  } else if (riskScore >= profile.rebalanceAt || alerts.length >= 1) {
    recommendation = 'REBALANCE';
  } else if (marketRegime === 'bull' && riskScore < profile.rebalanceAt * 0.8) {
    recommendation = 'INCREASE_EXPOSURE';
  }

  // --- Reasoning — LLM-generated if ANTHROPIC_API_KEY is set, otherwise template fallback ---
  const fgStr = marketData
    ? `${marketData.fearGreedLabel} (${marketData.fearGreedIndex}/100)`
    : 'N/A';
  const volStr = marketData ? `${marketData.avgVolatility24h.toFixed(1)}%` : 'N/A';
  const liqStr = marketData ? `${(marketData.avgLiquidityRatio * 100).toFixed(2)}%` : 'N/A';
  const athStr = marketData ? `${marketData.avgAthDrawdown.toFixed(1)}% from ATH` : 'N/A';

  const templateReasoning = portfolioValue === 0
    ? 'Portfolio is empty. Add holdings to receive a strategy.'
    : [
        `Goal: ${profile.goalSummary}.`,
        `Risk score: ${riskScore}/100 (${profile.label} profile weights applied).`,
        `Components — Concentration: ${C}/100, Volatility (24h avg ${volStr}): ${V}/100,`,
        `Sentiment (F&G ${fgStr}): ${S}/100, Liquidity (vol/mcap ${liqStr}): ${L}/100,`,
        `Drawdown (avg ${athStr}): ${D}/100.`,
        `Market regime: ${marketRegime}.`,
        alerts.length > 0 ? `Alerts: ${alerts.join('; ')}.` : '',
      ].filter(Boolean).join(' ');

  let reasoning = templateReasoning;
  if (portfolioValue > 0) {
    try {
      const llmReasoning = await generateLLMReasoning(
        goal, profile, riskScore, recommendation,
        C, V, S, L, D,
        marketRegime, alerts, topPositions, marketData, portfolioValue,
      );
      if (llmReasoning) reasoning = llmReasoning;
    } catch {
      // LLM call failed — keep template reasoning
    }
  }

  // --- Worst-case analysis — goal-aware language ---
  const goalContext = profile.label === 'conservative'
    ? 'Given your capital-preservation goal'
    : profile.label === 'aggressive'
    ? 'Given your high-risk-tolerance goal'
    : profile.label === 'yield'
    ? 'Given your yield-focused goal'
    : 'Given your balanced goal';

  const worstCaseAnalysis = riskScore >= profile.reduceRiskAt
    ? `${goalContext}, risk score ${riskScore}/100 is above your threshold of ${profile.reduceRiskAt}. Concentration score ${C}/100 and volatility ${V}/100. In a sharp downturn, your top position (${topPositions[0]?.symbol ?? 'N/A'} at ${maxWeight.toFixed(1)}%) could drive significant portfolio losses. Reducing exposure is recommended.`
    : riskScore >= profile.rebalanceAt
    ? `${goalContext}, moderate risk detected (${riskScore}/100). Concentration at ${C}/100. Market sentiment: ${fgStr}. ${athStr} — ${marketData && marketData.avgAthDrawdown > -15 ? 'positions are near all-time highs, increasing correction risk.' : 'drawdown provides some cushion.'} Rebalancing could improve the risk/return profile.`
    : riskScore >= 25
    ? `${goalContext}, risk is low-to-moderate (${riskScore}/100). Primary concern: ${C > 50 ? `concentration (${C}/100)` : V > 50 ? `volatility (${V}/100)` : `market sentiment (${S}/100)`}. No immediate action required.`
    : `${goalContext}, portfolio risk is low (${riskScore}/100). All components within acceptable range for your profile.`;

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
        const pct = (maxWeight - targetWeight) / maxWeight;
        reduceAmount = (top.amount * pct).toFixed(4);
      } else {
        reduceAmount = excessUsd.toFixed(2);
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
