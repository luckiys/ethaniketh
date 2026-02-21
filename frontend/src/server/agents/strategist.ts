import type { WatchSignal, StrategyPlan } from '@mudra/shared';
import { StrategyPlanSchema } from '@mudra/shared';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { geminiGenerate } from '@/lib/gemini';

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
- Funding rate (BTC/ETH avg): ${marketData?.fundingRateAvg != null ? (marketData.fundingRateAvg * 100).toFixed(4) + '%' : 'N/A'}
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
  const geminiText = await geminiGenerate(prompt);
  if (geminiText) return geminiText;

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
// Uses LLM (Gemini) when available for natural-language understanding; regex fallback otherwise.
// ---------------------------------------------------------------------------

const PROFILE_CONFIGS: Record<GoalProfile['label'], Omit<GoalProfile, 'goalSummary'>> = {
  conservative: {
    label: 'conservative',
    wConcentration: 0.35,
    wVolatility: 0.30,
    wSentiment: 0.15,
    wLiquidity: 0.12,
    wDrawdown: 0.08,
    reduceRiskAt: 55,
    rebalanceAt: 35,
  },
  aggressive: {
    label: 'aggressive',
    wConcentration: 0.10,
    wVolatility: 0.20,
    wSentiment: 0.25,
    wLiquidity: 0.20,
    wDrawdown: 0.25,
    reduceRiskAt: 82,
    rebalanceAt: 65,
  },
  yield: {
    label: 'yield',
    wConcentration: 0.20,
    wVolatility: 0.15,
    wSentiment: 0.25,
    wLiquidity: 0.25,
    wDrawdown: 0.15,
    reduceRiskAt: 68,
    rebalanceAt: 45,
  },
  balanced: {
    label: 'balanced',
    wConcentration: 0.25,
    wVolatility: 0.25,
    wSentiment: 0.20,
    wLiquidity: 0.15,
    wDrawdown: 0.15,
    reduceRiskAt: 70,
    rebalanceAt: 45,
  },
};

const DEFAULT_SUMMARIES: Record<GoalProfile['label'], string> = {
  conservative: 'capital preservation / low risk',
  aggressive: 'aggressive growth / high risk tolerance',
  yield: 'yield / passive income',
  balanced: 'balanced growth / moderate risk',
};

/** LLM-based goal interpretation — understands natural language like "saving for a house" or "I want passive income" */
async function interpretGoalWithLLM(goal: string): Promise<{ label: GoalProfile['label']; goalSummary: string } | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  try {
    const prompt = `You are a DeFi portfolio advisor. A user described their investment goal in plain language. Classify it into exactly one of: conservative, balanced, aggressive, yield.

User goal: "${goal}"

Rules:
- conservative: capital preservation, safety, low risk, protecting savings, retirement, house down payment, cautious
- aggressive: maximize returns, high risk tolerance, growth, "moon", degen, all-in, bold bets
- yield: passive income, staking, dividends, earning interest, cash flow, DCA into yield
- balanced: moderate risk, mix of growth and safety, no strong preference

Respond with ONLY a JSON object, no other text: {"label":"conservative|balanced|aggressive|yield","goalSummary":"one short phrase summarizing their goal"}
Example: {"label":"conservative","goalSummary":"saving for house down payment in 2 years"}`;

    const text = await geminiGenerate(prompt) ?? '';
    const json = text.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(json) as { label?: string; goalSummary?: string };
    const label = parsed?.label as GoalProfile['label'] | undefined;
    if (label && ['conservative', 'balanced', 'aggressive', 'yield'].includes(label)) {
      return {
        label,
        goalSummary: parsed.goalSummary?.trim() || DEFAULT_SUMMARIES[label],
      };
    }
  } catch {
    // Fall through to regex
  }
  return null;
}

function parseGoalProfileRegex(goal: string): GoalProfile['label'] {
  const g = goal.toLowerCase();
  if (/conservat|safe|protect|preserv|stable|low.?risk|minimal.?risk|capital.?preserv|cautious|slow|steady|retirement|house|college|savings/.test(g)) return 'conservative';
  if (/aggress|maximiz|max.?(yield|return|profit)|high.?risk|bold|growth|moon|ape|degen|all.?in/.test(g)) return 'aggressive';
  if (/yield|income|dividend|staking|earn|passive|cash.?flow|interest/.test(g)) return 'yield';
  return 'balanced';
}

async function parseGoalProfile(goal: string): Promise<GoalProfile> {
  // Try LLM first for natural-language understanding
  const llmResult = await interpretGoalWithLLM(goal);
  if (llmResult) {
    const config = PROFILE_CONFIGS[llmResult.label];
    return { ...config, goalSummary: llmResult.goalSummary };
  }

  // Fallback: regex-based parsing
  const label = parseGoalProfileRegex(goal);
  const config = PROFILE_CONFIGS[label];
  return { ...config, goalSummary: DEFAULT_SUMMARIES[label] };
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
 * Sentiment risk from Fear & Greed index + funding rates.
 * Contrarian: extreme fear AND extreme greed both = higher risk.
 * Funding >0.1% = euphoric leverage (liquidation cascade risk); <-0.05% = fear/short squeeze.
 * Neutral (50) = minimum risk.
 */
function sentimentScore(fearGreedIndex: number, fundingRateAvg?: number): number {
  let s = Math.min(100, Math.round(20 + 60 * (Math.abs(fearGreedIndex - 50) / 50)));
  if (fundingRateAvg != null) {
    const fundingPct = fundingRateAvg * 100;
    if (fundingPct > 0.1) s = Math.min(100, s + 15); // euphoria
    else if (fundingPct < -0.05) s = Math.min(100, s + 10); // fear/short squeeze
  }
  return s;
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

async function fetchPortfolioOptimization(
  holdings: Array<{ symbol: string; amount: number; valueUsd?: number }>,
  riskPreference?: number
): Promise<{ suggested_action?: string; drift_pct?: number } | null> {
  const url = process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:5002';
  try {
    const riskTolerance = riskPreference != null ? riskPreference / 100 : 0.5;
    const res = await fetch(`${url}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holdings: holdings.filter((h) => (h.valueUsd ?? 0) > 0),
        risk_tolerance: riskTolerance,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { suggested_action?: string; drift_pct?: number };
    return data;
  } catch {
    return null;
  }
}

export type StrategistResult = { plan: StrategyPlan; alternatePlans: StrategyPlan[] };

export async function runStrategist(signal: WatchSignal, goal: string, riskPreference?: number): Promise<StrategistResult> {
  const planId = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { portfolioValue, marketRegime, topPositions, alerts, marketData } = signal;
  const maxWeight = topPositions[0]?.weight ?? 0;

  // Parse goal to determine profile (weights + thresholds) — LLM when available, regex fallback
  const profile = await parseGoalProfile(goal);

  // --- Compute 5 risk components (each 0–100) ---
  const C = concentrationScore(topPositions);

  let V = marketData
    ? volatilityScore(marketData.avgVolatility24h)
    : volatilityScore(marketRegime === 'volatile' ? 12 : marketRegime === 'bear' ? 7 : 3);
  if (marketData?.var95 != null && marketData.var95 > 5) {
    V = Math.min(100, V + Math.round((marketData.var95 - 5) * 2));
  }

  const L = marketData ? liquidityScore(marketData.avgLiquidityRatio) : 30;

  const S = marketData ? sentimentScore(marketData.fearGreedIndex, marketData.fundingRateAvg) : sentimentScore(50);

  const D = marketData ? drawdownScore(marketData.avgAthDrawdown) : 40;

  let protocolRisk = 0;
  if (marketData?.protocolRiskScore != null && marketData.protocolRiskScore > 60) {
    protocolRisk = Math.min(20, marketData.protocolRiskScore - 60);
  }
  if (marketData?.macroRegime === 'risk-off') {
    protocolRisk += 10;
  }

  // Weighted risk score using goal-driven weights
  const riskScore = Math.min(
    100,
    Math.round(
      C * profile.wConcentration +
      V * profile.wVolatility +
      S * profile.wSentiment +
      L * profile.wLiquidity +
      D * profile.wDrawdown +
      protocolRisk
    )
  );

  // If user supplied an explicit risk preference (0–100), override the profile thresholds to match.
  // Low ≤35 → tighten; Medium 36–72 → keep profile; High ≥73 → loosen.
  if (riskPreference !== undefined) {
    if (riskPreference <= 35) {
      profile.reduceRiskAt = Math.max(30, riskPreference);
      profile.rebalanceAt = Math.max(15, Math.round(riskPreference * 0.6));
    } else if (riskPreference >= 73) {
      profile.reduceRiskAt = Math.min(100, riskPreference + 5);
      profile.rebalanceAt = Math.min(90, Math.round(riskPreference * 0.8));
    } else {
      // medium band — scale linearly between defaults
      const t = (riskPreference - 36) / (72 - 36);
      profile.reduceRiskAt = Math.round(55 + t * (82 - 55));
      profile.rebalanceAt = Math.round(35 + t * (65 - 35));
    }
  }

  // --- Recommendation — thresholds depend on goal profile ---
  let baseRecommendation: StrategyPlan['recommendation'] = 'HOLD';

  const holdingsForOpt = topPositions.map((p) => ({
    symbol: p.symbol,
    amount: 0,
    valueUsd: p.valueUsd,
  }));
  const portfolioOpt = portfolioValue > 0 ? await fetchPortfolioOptimization(holdingsForOpt, riskPreference) : null;

  if (portfolioValue === 0) {
    baseRecommendation = 'HOLD';
  } else if (riskScore >= profile.reduceRiskAt || alerts.length >= 3) {
    baseRecommendation = 'REDUCE_RISK';
  } else if (riskScore >= profile.rebalanceAt || alerts.length >= 1) {
    baseRecommendation = 'REBALANCE';
  } else if (portfolioOpt?.suggested_action === 'REBALANCE' && (portfolioOpt.drift_pct ?? 0) > 15) {
    baseRecommendation = 'REBALANCE';
  } else if (marketRegime === 'bull' && riskScore < profile.rebalanceAt * 0.8) {
    baseRecommendation = 'INCREASE_EXPOSURE';
  }

  const fgStr = marketData ? `${marketData.fearGreedLabel} (${marketData.fearGreedIndex}/100)` : 'N/A';
  const volStr = marketData ? `${marketData.avgVolatility24h.toFixed(1)}%` : 'N/A';
  const liqStr = marketData ? `${(marketData.avgLiquidityRatio * 100).toFixed(2)}%` : 'N/A';
  const athStr = marketData ? `${marketData.avgAthDrawdown.toFixed(1)}% from ATH` : 'N/A';

  const goalContext = profile.label === 'conservative'
    ? 'Given your capital-preservation goal'
    : profile.label === 'aggressive'
    ? 'Given your high-risk-tolerance goal'
    : profile.label === 'yield'
    ? 'Given your yield-focused goal'
    : 'Given your balanced goal';

  // Build multiple candidate plans with different reduction amounts; pick the one that fits user's risk band
  const targetUserRisk = riskPreference ?? 50;
  const candidates: Array<{ targetWeight: number; rec: StrategyPlan['recommendation']; projectedRisk: number }> = [];

  if (portfolioValue === 0 || baseRecommendation === 'HOLD' || baseRecommendation === 'INCREASE_EXPOSURE') {
    candidates.push({ targetWeight: maxWeight, rec: baseRecommendation, projectedRisk: riskScore });
  } else if (topPositions.length > 0 && maxWeight > 40) {
    // Variants: HOLD (no change), mild (50), moderate (40), aggressive (35) — pick one that fits user's risk band
    const targets = [maxWeight, 50, 40, 35].filter((t) => t <= maxWeight);
    const unique = [...new Set(targets)].sort((a, b) => b - a);
    for (const targetWeight of unique) {
      const rec = targetWeight >= 45 ? 'REBALANCE' : targetWeight >= 38 ? 'REBALANCE' : 'REDUCE_RISK';
      const reduction = maxWeight - targetWeight;
      const projectedRisk = Math.max(0, Math.min(100, riskScore - 0.35 * reduction));
      candidates.push({ targetWeight, rec, projectedRisk });
    }
  } else {
    candidates.push({ targetWeight: maxWeight, rec: baseRecommendation, projectedRisk: riskScore });
  }

  // Pick the candidate whose projected risk is closest to user's risk preference
  const sorted = [...candidates].sort((a, b) =>
    Math.abs(a.projectedRisk - targetUserRisk) - Math.abs(b.projectedRisk - targetUserRisk)
  );
  const chosen = sorted[0];
  const alternates = sorted.slice(1);

  const targetWeight = chosen.targetWeight;
  const recommendation = chosen.rec;

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

  const worstCaseAnalysis = riskScore >= profile.reduceRiskAt
    ? `${goalContext}, risk score ${riskScore}/100 is above your threshold of ${profile.reduceRiskAt}. Concentration score ${C}/100 and volatility ${V}/100. In a sharp downturn, your top position (${topPositions[0]?.symbol ?? 'N/A'} at ${maxWeight.toFixed(1)}%) could drive significant portfolio losses. Reducing exposure is recommended.`
    : riskScore >= profile.rebalanceAt
    ? `${goalContext}, moderate risk detected (${riskScore}/100). Concentration at ${C}/100. Market sentiment: ${fgStr}. ${athStr} — ${marketData && marketData.avgAthDrawdown > -15 ? 'positions are near all-time highs, increasing correction risk.' : 'drawdown provides some cushion.'} Rebalancing could improve the risk/return profile.`
    : riskScore >= 25
    ? `${goalContext}, risk is low-to-moderate (${riskScore}/100). Primary concern: ${C > 50 ? `concentration (${C}/100)` : V > 50 ? `volatility (${V}/100)` : `market sentiment (${S}/100)`}. No immediate action required.`
    : `${goalContext}, portfolio risk is low (${riskScore}/100). All components within acceptable range for your profile.`;

  const actions: StrategyPlan['actions'] = [];
  if (
    (recommendation === 'REBALANCE' || recommendation === 'REDUCE_RISK') &&
    topPositions.length > 0 &&
    maxWeight > 40 &&
    targetWeight < maxWeight - 2
  ) {
    const top = topPositions[0];
    if (top) {
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

  // Structured context for LLM to explain our logic to beginners
  const decisionContext = {
    userGoal: goal,
    goalSummary: profile.goalSummary,
    goalProfile: profile.label,
    portfolioValue,
    topHoldings: topPositions.slice(0, 5).map((p) => ({ symbol: p.symbol, weight: p.weight, valueUsd: p.valueUsd })),
    riskComponents: {
      concentration: { score: C, meaning: C > 60 ? 'Most of your portfolio is in one asset' : C > 40 ? 'Portfolio is somewhat concentrated' : 'Well diversified' },
      volatility: { score: V, meaning: V > 60 ? 'Prices have been swinging a lot' : V > 40 ? 'Moderate price movement' : 'Relatively stable' },
      sentiment: { score: S, meaning: S > 60 ? 'Market mood is extreme (fear or greed)' : 'Market mood is moderate' },
      liquidity: { score: L, meaning: L > 60 ? 'Harder to sell quickly' : 'Liquid enough to trade' },
      drawdown: { score: D, meaning: D > 60 ? 'Near all-time highs (correction risk)' : 'Some cushion from peaks' },
    },
    overallRiskScore: riskScore,
    projectedRiskAfterAction: Math.round(chosen.projectedRisk),
    userRiskPreference: riskPreference ?? 50,
    thresholds: { reduceRiskAt: profile.reduceRiskAt, rebalanceAt: profile.rebalanceAt },
    whyThisRecommendation: portfolioValue === 0
      ? 'Portfolio is empty'
      : riskScore >= profile.reduceRiskAt || alerts.length >= 3
      ? `Risk (${riskScore}) is above your comfort level (${profile.reduceRiskAt})`
      : riskScore >= profile.rebalanceAt || alerts.length >= 1
      ? `Moderate risk (${riskScore}) — rebalancing could help`
      : marketRegime === 'bull' && riskScore < profile.rebalanceAt * 0.8
      ? 'Bull market with room to grow'
      : 'Risk is within your range — no action needed',
    recommendation,
    actions: actions.map((a) => ({ type: a.type, token: a.token, amount: a.amount })),
    marketRegime,
    fearGreed: marketData ? { index: marketData.fearGreedIndex, label: marketData.fearGreedLabel } : null,
    alerts,
    candidatesConsidered: candidates.length,
    whyChoseThisPlan: `Picked the option whose risk after action (${Math.round(chosen.projectedRisk)}) is closest to your preference (${targetUserRisk})`,
  };

  const primaryPlan = StrategyPlanSchema.parse({
    planId,
    recommendation,
    riskScore: Math.round(chosen.projectedRisk),
    worstCaseAnalysis,
    actions,
    reasoning,
    expiresAt,
    decisionContext,
  });

  // Build alternate plans (same structure, different target weights)
  const alternatePlans: StrategyPlan[] = alternates.map((alt, i) => {
    const altActions: StrategyPlan['actions'] = [];
    if (
      (alt.rec === 'REBALANCE' || alt.rec === 'REDUCE_RISK') &&
      topPositions.length > 0 &&
      maxWeight > 40 &&
      alt.targetWeight < maxWeight - 2
    ) {
      const top = topPositions[0];
      if (top) {
        const excessUsd = Math.max(0, ((maxWeight - alt.targetWeight) / 100) * portfolioValue);
        const pricePerToken = top.amount && top.amount > 0 ? top.valueUsd / top.amount : 0;
        const reduceAmount = pricePerToken > 0
          ? (excessUsd / pricePerToken).toFixed(4)
          : top.amount ? (top.amount * (maxWeight - alt.targetWeight) / maxWeight).toFixed(4) : '0';
        altActions.push({
          type: 'TRANSFER',
          from: 'portfolio',
          to: 'stable',
          amount: reduceAmount,
          token: top.symbol,
        });
      }
    }
    return StrategyPlanSchema.parse({
      planId: randomUUID(),
      recommendation: alt.rec,
      riskScore: Math.round(alt.projectedRisk),
      worstCaseAnalysis,
      actions: altActions,
      reasoning: templateReasoning,
      expiresAt,
    });
  });

  return { plan: primaryPlan, alternatePlans };
}
