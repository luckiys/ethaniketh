/**
 * POST /api/defi-sim
 * Runs a pre-execution DeFAI simulation and returns before/after risk snapshots.
 * 0G Labs DeFAI bounty — AI-driven preview before any transaction.
 *
 * Body: {
 *   sessionId: string,
 *   planId: string,
 *   holdings: Array<{ token, weight, value? }>,
 *   actions: Array<{ type, token, amount }>
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { simulateStrategy } from '@/server/defi-sim';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, planId, holdings, actions, aiReasoning } = body;

    if (!sessionId || !planId) {
      return NextResponse.json({ error: 'sessionId and planId required' }, { status: 400 });
    }
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json({ error: 'holdings array required' }, { status: 400 });
    }
    if (!Array.isArray(actions)) {
      return NextResponse.json({ error: 'actions array required' }, { status: 400 });
    }

    const result = await simulateStrategy({ sessionId, planId, holdings, actions, aiReasoning });

    return NextResponse.json({
      ...result,
      bounty: '0G Labs DeFAI',
      description: 'Pre-execution simulation — no transactions created. Archived to 0G Storage.',
      zeroDotGExplorer: `https://explorer.0g.ai/mainnet/tx/${result.storageId}`,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/**
 * GET /api/defi-sim — returns API documentation for judges
 */
export async function GET() {
  return NextResponse.json({
    name: 'Mudra DeFAI Simulation API',
    bounty: '0G Labs: Best DeFAI Application',
    description: 'Pre-execution portfolio simulation powered by AI risk analysis. Results archived to 0G decentralized storage.',
    endpoint: 'POST /api/defi-sim',
    example: {
      sessionId: 'sess-abc123',
      planId: 'plan-xyz789',
      holdings: [
        { token: 'ETH', weight: 0.60, value: 6000 },
        { token: 'BTC', weight: 0.30, value: 3000 },
        { token: 'SOL', weight: 0.10, value: 1000 },
      ],
      actions: [
        { type: 'REDUCE', token: 'ETH', amount: 0.10 },
        { type: 'INCREASE', token: 'BTC', amount: 0.05 },
      ],
    },
    output: {
      before: 'PortfolioSnapshot (risk scores, concentrations, volatility)',
      after: 'PortfolioSnapshot (projected after actions)',
      netRiskChange: 'number (negative = improved)',
      estimatedSlippage: 'number (%)',
      maxDrawdownImpact: 'number (%)',
      confidenceScore: 'number (0-100)',
      aiReasoning: 'string (human-readable AI explanation)',
      storageId: '0G Storage CID (verifiable on 0G explorer)',
    },
    network: '0G testnet (https://rpc-testnet.0g.ai)',
    faucet: 'https://faucet.0g.ai',
  });
}
