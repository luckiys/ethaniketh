import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/server/orchestrator';
import '@/server/events';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const result = await runWorkflow(sessionId);
  return NextResponse.json(result);
}
