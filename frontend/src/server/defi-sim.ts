/**
 * AegisOS DeFAI Simulation — 0G Labs DeFAI bounty
 *
 * Pre-execution portfolio simulation: shows users the projected before/after
 * state of their portfolio BEFORE any transaction is signed.
 *
 * This is a key user-safety feature required by the 0G DeFAI bounty:
 *   - AI produces structured decisions (not just chat)
 *   - Users see simulated outcome before confirming
 *   - User can override or reject at any point
 *   - 0G Storage used to archive simulation results
 *
 * The simulation uses the same risk scoring model as the Strategist agent,
 * but applies the proposed actions to forecast the new portfolio state.
 */

import { uploadToZeroG } from './zerog';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PortfolioSnapshot {
  holdings: Array<{ token: string; weight: number; value: number }>;
  totalValue: number;
  riskScore: number;
  concentrationScore: number;   // HHI
  volatilityScore: number;
  liquidityScore: number;
  diversification: number;      // 0-1, higher is better
}

export interface SimulatedAction {
  type: 'REDUCE' | 'INCREASE' | 'TRANSFER' | 'HOLD';
  token: string;
  fromWeight: number;
  toWeight: number;
  impactOnRisk: number;        // negative = reduces risk
  reasoning: string;
}

export interface SimulationResult {
  sessionId: string;
  planId: string;
  before: PortfolioSnapshot;
  after: PortfolioSnapshot;
  actions: SimulatedAction[];
  netRiskChange: number;        // negative = improved
  netDiversificationChange: number;
  estimatedSlippage: number;    // simulated (0-5%)
  maxDrawdownImpact: number;    // worst-case % loss
  confidenceScore: number;      // 0-100, AI confidence in simulation
  aiReasoning: string;
  storageId: string;            // 0G Storage CID for this simulation
  simulatedAt: string;
}

// ─── Risk scoring helpers (mirrors strategist.ts) ────────────────────────────

function computeHHI(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w * w, 0);
}

function concentrationScore(hhi: number): number {
  // HHI ranges 1/n to 1. Score 0-100 (lower = less concentrated = safer)
  return Math.min(100, Math.round(hhi * 100));
}

function diversificationIndex(weights: number[]): number {
  // 1 - HHI normalised to [0,1]
  const hhi = computeHHI(weights);
  const n = weights.length;
  if (n <= 1) return 0;
  return Math.round(((1 - hhi) / (1 - 1 / n)) * 100) / 100;
}

// Simplified volatility proxy based on asset class
const ASSET_VOLATILITY: Record<string, number> = {
  BTC: 0.65, ETH: 0.72, SOL: 0.85, AVAX: 0.80,
  BNB: 0.60, LINK: 0.75, UNI: 0.80, AAVE: 0.75,
  USDC: 0.01, USDT: 0.01, DAI: 0.02,
  MATIC: 0.80, ARB: 0.85, OP: 0.85,
};

function estimateVolatility(holdings: Array<{ token: string; weight: number }>): number {
  let weightedVol = 0;
  for (const h of holdings) {
    const vol = ASSET_VOLATILITY[h.token.toUpperCase()] ?? 0.75;
    weightedVol += h.weight * vol;
  }
  return Math.round(weightedVol * 100); // 0-100
}

function computeSnapshot(
  holdings: Array<{ token: string; weight: number; value: number }>
): PortfolioSnapshot {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const weights = holdings.map((h) => h.weight);
  const hhi = computeHHI(weights);
  const conc = concentrationScore(hhi);
  const vol = estimateVolatility(holdings);
  const liq = Math.round(holdings.reduce((s, h) => {
    const l = ['BTC', 'ETH', 'USDC', 'USDT'].includes(h.token.toUpperCase()) ? 1.0 : 0.6;
    return s + h.weight * l;
  }, 0) * 100);

  const riskScore = Math.round(conc * 0.35 + vol * 0.35 + (100 - liq) * 0.30);

  return {
    holdings,
    totalValue,
    riskScore,
    concentrationScore: conc,
    volatilityScore: vol,
    liquidityScore: liq,
    diversification: diversificationIndex(weights),
  };
}

// ─── Action application ───────────────────────────────────────────────────────

function applyActions(
  holdings: Array<{ token: string; weight: number; value: number }>,
  actions: Array<{ type: string; token: string; amount: number | string }>
): Array<{ token: string; weight: number; value: number }> {
  const result = holdings.map((h) => ({ ...h }));

  for (const action of actions) {
    const idx = result.findIndex((h) => h.token.toUpperCase() === action.token.toUpperCase());
    if (idx === -1) continue;

    const delta = typeof action.amount === 'number'
      ? action.amount
      : parseFloat(String(action.amount)) || 0;

    if (action.type === 'REDUCE') {
      result[idx].weight = Math.max(0, result[idx].weight - delta);
      result[idx].value  = Math.max(0, result[idx].value * (1 - delta / (result[idx].weight + delta)));
    } else if (action.type === 'INCREASE') {
      result[idx].weight = Math.min(1, result[idx].weight + delta);
    }
  }

  // Re-normalise weights to sum to 1
  const total = result.reduce((s, h) => s + h.weight, 0);
  if (total > 0) {
    for (const h of result) h.weight = Math.round((h.weight / total) * 1000) / 1000;
  }

  return result.filter((h) => h.weight > 0.001);
}

// ─── Main simulation ──────────────────────────────────────────────────────────

/**
 * Runs a pre-execution DeFAI simulation.
 * Computes before/after risk snapshots and archives to 0G Storage.
 * No transactions are created — this is a pure preview.
 */
export async function simulateStrategy(params: {
  sessionId: string;
  planId: string;
  holdings: Array<{ token: string; weight: number; value?: number }>;
  actions: Array<{ type: string; token: string; amount: number | string }>;
  aiReasoning?: string;
}): Promise<SimulationResult> {
  const { sessionId, planId, holdings, actions } = params;

  // Normalise holdings
  const totalVal = holdings.reduce((s, h) => s + (h.value ?? h.weight * 10000), 0);
  const normHoldings = holdings.map((h) => ({
    token: h.token,
    weight: h.weight,
    value: h.value ?? h.weight * totalVal,
  }));

  // Before snapshot
  const before = computeSnapshot(normHoldings);

  // Apply actions to get projected state
  const simActions: SimulatedAction[] = actions.map((a) => {
    const fromH = normHoldings.find((h) => h.token.toUpperCase() === a.token.toUpperCase());
    const fromWeight = fromH?.weight ?? 0;
    const delta = typeof a.amount === 'number' ? a.amount : parseFloat(String(a.amount)) || 0;
    const toWeight = a.type === 'REDUCE'
      ? Math.max(0, fromWeight - delta)
      : a.type === 'INCREASE'
      ? Math.min(1, fromWeight + delta)
      : fromWeight;

    // Estimate risk impact: reducing high-vol assets improves risk
    const vol = ASSET_VOLATILITY[a.token.toUpperCase()] ?? 0.75;
    const impactOnRisk = a.type === 'REDUCE'
      ? -Math.round(delta * vol * 50)
      : a.type === 'INCREASE'
      ? Math.round(delta * vol * 50)
      : 0;

    return {
      type: a.type as SimulatedAction['type'],
      token: a.token,
      fromWeight,
      toWeight,
      impactOnRisk,
      reasoning: `${a.type} ${a.token} by ${(delta * 100).toFixed(0)}% → estimated risk change: ${impactOnRisk > 0 ? '+' : ''}${impactOnRisk}pts`,
    };
  });

  const afterHoldings = applyActions(normHoldings, actions);
  const after = computeSnapshot(afterHoldings);

  const netRiskChange = after.riskScore - before.riskScore;
  const netDiversificationChange = Math.round((after.diversification - before.diversification) * 100) / 100;

  // Simulated slippage based on action size
  const totalMoved = actions.reduce((s, a) => {
    const d = typeof a.amount === 'number' ? a.amount : parseFloat(String(a.amount)) || 0;
    return s + Math.abs(d);
  }, 0);
  const estimatedSlippage = Math.min(5, Math.round(totalMoved * 2 * 100) / 100);

  // Worst-case drawdown (VaR proxy)
  const maxDrawdownImpact = Math.round(after.volatilityScore * 0.4 * 10) / 10;

  // Confidence based on how many actions and quality of data
  const confidenceScore = Math.min(95, 70 + (actions.length === 0 ? 25 : Math.max(0, 25 - actions.length * 3)));

  const aiReasoning = params.aiReasoning ??
    `Simulation projects risk score to change from ${before.riskScore} → ${after.riskScore} ` +
    `(${netRiskChange >= 0 ? '+' : ''}${netRiskChange} pts). ` +
    `Diversification ${netDiversificationChange >= 0 ? 'improves' : 'decreases'} by ${Math.abs(netDiversificationChange * 100).toFixed(0)}%. ` +
    `Estimated slippage: ~${estimatedSlippage}%. Max drawdown impact: ~${maxDrawdownImpact}%.`;

  // Archive simulation to 0G Storage (DeFAI bounty: 0G holds verifiable audit)
  const storagePayload = {
    schema: 'aegisos-defi-sim-v1',
    sessionId,
    planId,
    before: { riskScore: before.riskScore, diversification: before.diversification },
    after: { riskScore: after.riskScore, diversification: after.diversification },
    netRiskChange,
    estimatedSlippage,
    simulatedAt: new Date().toISOString(),
  };
  const storageId = await uploadToZeroG(storagePayload);

  return {
    sessionId,
    planId,
    before,
    after,
    actions: simActions,
    netRiskChange,
    netDiversificationChange,
    estimatedSlippage,
    maxDrawdownImpact,
    confidenceScore,
    aiReasoning,
    storageId,
    simulatedAt: new Date().toISOString(),
  };
}
