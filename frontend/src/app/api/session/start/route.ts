import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { startSession } from '@/server/orchestrator';
import { GoalInputSchema, HoldingsInputSchema } from '@aegisos/shared';
import '@/server/events';

const StartSessionSchema = z.object({
  goal: GoalInputSchema.shape.goal,
  holdings: HoldingsInputSchema.shape.holdings,
  walletAddress: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = StartSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { goal, holdings, walletAddress } = parsed.data;
    const state = await startSession(goal, holdings, walletAddress);
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
