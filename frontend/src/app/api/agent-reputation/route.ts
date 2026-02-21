/**
 * GET /api/agent-reputation
 * Returns on-chain reputation scores for all Mudra agents.
 * Hedera Killer App bounty — agent trust indicators.
 *
 * Query params:
 *   agentId (optional): 'watcher' | 'strategist' | 'executor'
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReputation,
  getAgentReputation,
  getTrustBadge,
  updateAgentReputation,
  recordPrediction,
  settlePredictions,
  getSessionPredictions,
  type AgentId,
} from '@/server/agent-economy';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') as AgentId | null;
  const sessionId = searchParams.get('sessionId');

  if (agentId) {
    const rep = getAgentReputation(agentId);
    const badge = getTrustBadge(agentId);
    const predictions = sessionId ? getSessionPredictions(sessionId) : [];
    return NextResponse.json({ reputation: rep, badge, predictions });
  }

  const all = getAllReputation().map((rep) => ({
    ...rep,
    badge: getTrustBadge(rep.agentId),
  }));

  return NextResponse.json({
    agents: all,
    network: 'hedera-testnet',
    description: 'Agent reputation scores attested on Hedera Consensus Service',
  });
}

/**
 * POST /api/agent-reputation
 * Updates an agent's reputation after a session completes.
 * Body: { agentId, sessionId, success, riskScore }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, sessionId, success = true, riskScore = 50 } = body;

    if (!agentId || !sessionId) {
      return NextResponse.json({ error: 'agentId and sessionId required' }, { status: 400 });
    }

    const updated = await updateAgentReputation(agentId, sessionId, success, riskScore);
    const badge = getTrustBadge(agentId);

    return NextResponse.json({ reputation: updated, badge, updated: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
