import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { approvePlan } from '@/server/orchestrator';
import { SignedApprovalSchema } from '@mudra/shared';
import '@/server/events';

const ApproveBodySchema = z.object({
  approval: SignedApprovalSchema,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const body = await req.json();
    const parsed = ApproveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const result = await approvePlan(sessionId, parsed.data.approval);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
