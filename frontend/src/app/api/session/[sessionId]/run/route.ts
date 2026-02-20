import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/server/orchestrator';
import '@/server/events';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { state, signal, plan, planHash, stratBrainCid, error } = await runWorkflow(sessionId);
  return NextResponse.json({ state, signal, plan, planHash, stratBrainCid, error });
}
