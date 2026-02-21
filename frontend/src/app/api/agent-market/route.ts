/**
 * GET  /api/agent-market?sessionId=<id>  — get predictions for session
 * POST /api/agent-market                 — record or settle a prediction
 *
 * Hedera Killer App bounty — prediction market between agents.
 * Predictions and settlements are published to HCS.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  recordPrediction,
  settlePredictions,
  getSessionPredictions,
  type AgentId,
} from '@/server/agent-economy';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const predictions = getSessionPredictions(sessionId);
  return NextResponse.json({ sessionId, predictions, count: predictions.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, agentId, prediction, stakeAmount, actualOutcome } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (action === 'record') {
      if (!agentId || !prediction) {
        return NextResponse.json({ error: 'agentId and prediction required' }, { status: 400 });
      }
      await recordPrediction(sessionId, agentId as AgentId, prediction, stakeAmount ?? 10);
      return NextResponse.json({ recorded: true, sessionId, agentId, prediction });
    }

    if (action === 'settle') {
      if (!actualOutcome) {
        return NextResponse.json({ error: 'actualOutcome required' }, { status: 400 });
      }
      const settled = await settlePredictions(sessionId, actualOutcome);
      return NextResponse.json({ settled: true, sessionId, predictions: settled });
    }

    return NextResponse.json({ error: 'action must be "record" or "settle"' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
