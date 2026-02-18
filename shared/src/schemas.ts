import { z } from 'zod';

export const HoldingSchema = z.object({
  symbol: z.string(),
  amount: z.number().min(0),
  valueUsd: z.number().optional(),
});

export const HoldingsInputSchema = z.object({
  holdings: z.array(HoldingSchema),
});

export const GoalInputSchema = z.object({
  goal: z.string().min(1, 'Goal is required'),
});

export const WatchSignalSchema = z.object({
  portfolioValue: z.number(),
  marketRegime: z.enum(['bull', 'bear', 'sideways', 'volatile']),
  topPositions: z.array(z.object({
    symbol: z.string(),
    weight: z.number(),
    valueUsd: z.number(),
  })),
  alerts: z.array(z.string()),
  timestamp: z.string(),
});

export const StrategyPlanSchema = z.object({
  planId: z.string(),
  recommendation: z.enum(['REBALANCE', 'HOLD', 'REDUCE_RISK', 'INCREASE_EXPOSURE']),
  riskScore: z.number().min(0).max(100),
  worstCaseAnalysis: z.string(),
  actions: z.array(z.object({
    type: z.enum(['SWAP', 'TRANSFER', 'STAKE', 'UNSTAKE']),
    from: z.string(),
    to: z.string(),
    amount: z.string(),
    token: z.string(),
  })),
  reasoning: z.string(),
  expiresAt: z.string(),
});

export const ApprovalRequestSchema = z.object({
  planId: z.string(),
  planHash: z.string(),
  riskScore: z.number(),
  worstCaseAnalysis: z.string(),
  actions: z.array(z.unknown()),
  expiresAt: z.string(),
});

export const SignedApprovalSchema = z.object({
  planId: z.string(),
  planHash: z.string(),
  signature: z.string(),
  signerAddress: z.string(),
  timestamp: z.string(),
});

export const SessionStartSchema = z.object({
  sessionId: z.string(),
  hederaTopicId: z.string(),
  agentNftIds: z.object({
    watcher: z.string(),
    strategist: z.string(),
    executor: z.string(),
  }),
  walletAddress: z.string().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;
export type WatchSignal = z.infer<typeof WatchSignalSchema>;
export type StrategyPlan = z.infer<typeof StrategyPlanSchema>;
export type SignedApproval = z.infer<typeof SignedApprovalSchema>;
export type SessionStart = z.infer<typeof SessionStartSchema>;
