import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/orchestrator';
import '@/server/events';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = getSession(sessionId);
  if (!state) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(state);
}
