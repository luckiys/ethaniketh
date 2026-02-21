/**
 * GET  /api/og-inference              — inference log + stats
 * POST /api/og-inference              — run agent inference on 0G Compute
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runInference,
  buildAgentPrompt,
  getInferenceLog,
  getInferenceStats,
  OG_MODELS,
} from '@/server/og-inference';

export const runtime = 'nodejs';

export async function GET() {
  const log = getInferenceLog();
  const stats = getInferenceStats();

  return NextResponse.json({
    bounty: '0G AI Inference via 0G Compute',
    description: 'AegisOS agent reasoning runs on 0G decentralized AI compute nodes',
    network: {
      compute: 'https://inference-api.0g.ai',
      dashboard: 'https://dashboard.0g.ai/compute',
      docs: 'https://docs.0g.ai/compute',
    },
    availableModels: OG_MODELS,
    stats,
    recentInferences: log.slice(0, 5),
  });
}

export async function POST(req: NextRequest) {
  let body: {
    agentId?: string;
    sessionId?: string;
    prompt?: string;
    context?: Record<string, unknown>;
    model?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const validAgents = ['watcher', 'strategist', 'executor'] as const;
  type AgentId = typeof validAgents[number];

  const { agentId, sessionId, prompt, context, model } = body;

  if (!agentId || !validAgents.includes(agentId as AgentId)) {
    return NextResponse.json({ error: 'agentId must be: watcher | strategist | executor' }, { status: 400 });
  }
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const finalPrompt = prompt ?? buildAgentPrompt(agentId as AgentId, context ?? {});
  const finalModel = model ?? OG_MODELS.FAST;

  const result = await runInference({
    agentId: agentId as AgentId,
    sessionId,
    prompt: finalPrompt,
    model: finalModel,
    maxTokens: 512,
    temperature: 0.3,
  });

  return NextResponse.json({
    bounty: '0G AI Inference via 0G Compute',
    inference: result,
    verificationUrl: `https://storagescan-newton.0g.ai/tx/${result.verificationHash}`,
  });
}
