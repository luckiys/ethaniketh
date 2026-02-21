import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  startSession,
  runWorkflow,
  approvePlan,
  rejectPlan,
  getSession,
  setEventCallback,
} from './orchestrator.js';
import type { AgentEvent } from '@mudra/shared';
import { HoldingsInputSchema, GoalInputSchema, SignedApprovalSchema } from '@mudra/shared';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const eventQueue: AgentEvent[] = [];
const MAX_EVENTS = 100;

setEventCallback((event: AgentEvent) => {
  eventQueue.push(event);
  if (eventQueue.length > MAX_EVENTS) eventQueue.shift();
});

app.get('/health', async () => ({ ok: true }));

const StartSessionSchema = z.object({
  goal: GoalInputSchema.shape.goal,
  holdings: HoldingsInputSchema.shape.holdings,
  walletAddress: z.string().optional(),
});

app.post('/session/start', async (req, reply) => {
  const parsed = StartSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.message });
  }
  const { goal, holdings, walletAddress } = parsed.data;
  const state = await startSession(goal, holdings, walletAddress);
  return state;
});

app.get('/session/:sessionId', async (req, reply) => {
  const { sessionId } = req.params as { sessionId: string };
  const state = getSession(sessionId);
  if (!state) return reply.status(404).send({ error: 'Session not found' });
  return state;
});

app.post('/session/:sessionId/run', async (req, reply) => {
  const { sessionId } = req.params as { sessionId: string };
  const result = await runWorkflow(sessionId);
  return result;
});

const ApproveBodySchema = z.object({
  approval: SignedApprovalSchema,
});

app.post('/session/:sessionId/approve', async (req, reply) => {
  const { sessionId } = req.params as { sessionId: string };
  const parsed = ApproveBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.message });
  }
  const result = await approvePlan(sessionId, parsed.data.approval);
  if (!result.success) {
    return reply.status(400).send({ error: result.error });
  }
  return { success: true };
});

app.post('/session/:sessionId/reject', async (req, reply) => {
  const { sessionId } = req.params as { sessionId: string };
  const result = await rejectPlan(sessionId);
  return { success: result.success };
});

app.get('/events', async (req, reply) => {
  reply.header('Content-Type', 'application/json');
  return eventQueue;
});

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: '0.0.0.0' });
console.log(`Mudra API running on http://localhost:${port}`);
