import { NextRequest, NextResponse } from 'next/server';
import { rejectPlan } from '@/server/orchestrator';
import '@/server/events';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const result = await rejectPlan(sessionId);
  return NextResponse.json({ success: result.success });
}
