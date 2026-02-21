/**
 * 0G AI Inference — Decentralized AI Compute for AegisOS
 * ETHDenver Bounty: 0G AI Inference via 0G Compute ($7,000)
 *
 * Routes AegisOS agent reasoning through 0G's decentralized AI inference
 * network. Instead of calling centralized AI APIs, agents submit inference
 * requests to 0G Compute nodes — censorship-resistant, verifiable AI.
 *
 * Free testnet compute: https://dashboard.0g.ai/compute
 * 0G Compute docs: https://docs.0g.ai/compute
 */

import { createHash } from 'crypto';

const OG_COMPUTE_URL = process.env.OG_COMPUTE_URL ?? 'https://inference-api.0g.ai';
const OG_COMPUTE_KEY = process.env.OG_COMPUTE_KEY ?? '';

export interface InferenceRequest {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  sessionId: string;
  agentId: 'watcher' | 'strategist' | 'executor';
}

export interface InferenceResult {
  requestId: string;
  model: string;
  agentId: string;
  sessionId: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  computeNodeId: string;
  verificationHash: string;
  latencyMs: number;
  mockMode: boolean;
  timestamp: string;
}

// Available models on 0G Compute
export const OG_MODELS = {
  FAST: 'llama-3.1-8b-instruct',
  BALANCED: 'llama-3.1-70b-instruct',
  POWERFUL: 'llama-3.3-70b-instruct',
} as const;

type OGModel = typeof OG_MODELS[keyof typeof OG_MODELS];

// In-memory inference log
const inferenceLog: InferenceResult[] = [];

function buildVerificationHash(result: Omit<InferenceResult, 'verificationHash'>): string {
  return '0x' + createHash('sha256')
    .update(`${result.requestId}:${result.response}:${result.computeNodeId}`)
    .digest('hex');
}

const MOCK_RESPONSES: Record<InferenceRequest['agentId'], string[]> = {
  watcher: [
    'Market regime: NEUTRAL. BTC dominance rising (54.2%), ETH RSI at 58 — approaching resistance. VIX elevated at 18.4 suggesting mild risk-off. Recommend defensive positioning until trend confirms.',
    'Anomaly detected: correlated drawdown across DeFi blue chips. On-chain data shows whale accumulation at current levels. Short-term bearish, medium-term constructive.',
    'Macro headwinds persist. Fed Fund futures pricing 2 cuts in 2026. Crypto historically correlates with liquidity cycles — current phase: late expansion. Portfolio concentration risk elevated.',
  ],
  strategist: [
    'Risk score: 68/100. Primary risk: ETH concentration at 62% exceeds 45% target. Recommend: reduce ETH by 20%, rotate to BTC (15%) and stablecoin reserve (5%). Expected risk reduction: 18 points.',
    'Optimal rebalancing path: ETH→USDC 0.5 ETH via Uniswap V3, USDC→WBTC 1200 USDC. Estimated slippage: 0.3%. Execution window: next 4 hours during low-volatility period.',
    'Portfolio Sharpe ratio: 1.24. Optimization target: 1.8. Suggested allocation: BTC 40%, ETH 35%, SOL 15%, stables 10%. Expected improvement: 45% Sharpe gain with 12% lower max drawdown.',
  ],
  executor: [
    'Execution plan verified. Trade split into 3 tranches to minimize market impact. Tranche 1 (40%): immediate. Tranche 2 (35%): T+1hr. Tranche 3 (25%): T+2hr. Expected total slippage: 0.31%.',
    'HTS transfer queued. Scheduled via AegisScheduler.sol at block T+150. Fallback: manual approval required if schedule expires. Gas estimate: 0.002 ETH.',
    'Execution complete. All tranches settled. Final slippage: 0.28% (under 0.5% target). AegisPoints +100 awarded. HCS receipt logged. 0G audit trail archived.',
  ],
};

export async function runInference(req: InferenceRequest): Promise<InferenceResult> {
  const requestId = createHash('sha256')
    .update(`${req.sessionId}:${req.agentId}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16);

  const start = Date.now();

  if (!OG_COMPUTE_KEY) {
    console.log('[og-inference] mock mode — get free compute at dashboard.0g.ai/compute');
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200)); // realistic latency

    const responses = MOCK_RESPONSES[req.agentId];
    const response = responses[Math.floor(Math.random() * responses.length)];
    const computeNodeId = `0g-node-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`;

    const partial: Omit<InferenceResult, 'verificationHash'> = {
      requestId,
      model: req.model,
      agentId: req.agentId,
      sessionId: req.sessionId,
      prompt: req.prompt,
      response,
      tokensUsed: Math.floor(100 + Math.random() * 400),
      computeNodeId,
      latencyMs: Date.now() - start,
      mockMode: true,
      timestamp: new Date().toISOString(),
    };

    const result: InferenceResult = { ...partial, verificationHash: buildVerificationHash(partial) };
    inferenceLog.push(result);
    return result;
  }

  try {
    const res = await fetch(`${OG_COMPUTE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OG_COMPUTE_KEY}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: 'system', content: `You are AegisOS ${req.agentId} agent — an autonomous DeFi risk specialist.` },
          { role: 'user', content: req.prompt },
        ],
        max_tokens: req.maxTokens,
        temperature: req.temperature,
      }),
    });

    if (!res.ok) throw new Error(`0G Compute error: ${res.status}`);

    const data = await res.json() as {
      id: string;
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
      model: string;
    };

    const response = data.choices[0]?.message?.content ?? '';
    const computeNodeId = data.id;

    const partial: Omit<InferenceResult, 'verificationHash'> = {
      requestId,
      model: data.model,
      agentId: req.agentId,
      sessionId: req.sessionId,
      prompt: req.prompt,
      response,
      tokensUsed: data.usage.total_tokens,
      computeNodeId,
      latencyMs: Date.now() - start,
      mockMode: false,
      timestamp: new Date().toISOString(),
    };

    const result: InferenceResult = { ...partial, verificationHash: buildVerificationHash(partial) };
    inferenceLog.push(result);
    return result;
  } catch (e) {
    console.error('[og-inference] failed, using mock:', e);
    return runInference({ ...req });
  }
}

// Pre-built prompts for each agent role
export function buildAgentPrompt(
  agentId: InferenceRequest['agentId'],
  context: Record<string, unknown>
): string {
  switch (agentId) {
    case 'watcher':
      return `Analyze this portfolio for market risks: ${JSON.stringify(context)}. Provide a concise market regime assessment and risk signals.`;
    case 'strategist':
      return `Generate a rebalancing strategy for this portfolio: ${JSON.stringify(context)}. Include specific allocation targets and risk score.`;
    case 'executor':
      return `Create an execution plan for this strategy: ${JSON.stringify(context)}. Include trade sizing, timing, and slippage targets.`;
  }
}

export function getInferenceLog(): InferenceResult[] {
  return inferenceLog.slice().reverse();
}

export function getInferenceStats() {
  const total = inferenceLog.length;
  const live = inferenceLog.filter((r) => !r.mockMode).length;
  const avgLatency = total > 0
    ? Math.round(inferenceLog.reduce((s, r) => s + r.latencyMs, 0) / total)
    : 0;
  const totalTokens = inferenceLog.reduce((s, r) => s + r.tokensUsed, 0);
  return { total, live, mock: total - live, avgLatencyMs: avgLatency, totalTokens };
}
