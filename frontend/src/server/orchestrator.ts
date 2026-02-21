import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type { AgentEvent, WorkflowState } from '@aegisos/shared';
import type { Holding, WatchSignal, StrategyPlan, SignedApproval } from '@aegisos/shared';
import { WorkflowStateMachine } from './state-machine';
import { publishToHcs, getOrCreateHcsTopic } from './hedera';
import { mintAgentNfts, archiveStrategyBrain } from './og-inft';
import { runWatcher } from './agents/watcher';
import { runStrategist } from './agents/strategist';
import { runExecutor } from './agents/executor';
export type EventCallback = (event: AgentEvent) => void;

let eventCallback: EventCallback | null = null;

export function setEventCallback(cb: EventCallback): void {
  eventCallback = cb;
}

function emit(event: AgentEvent): void {
  eventCallback?.(event);
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

function createEvent(
  type: AgentEvent['type'],
  sessionId: string,
  agentId: AgentEvent['agentId'],
  payload: Record<string, unknown>,
  agentNftId?: string,
  planId?: string,
  prevHash?: string
): AgentEvent {
  const payloadHash = hashPayload(payload);
  return {
    type,
    sessionId,
    planId,
    agentId,
    agentNftId,
    payload,
    payloadHash,
    prevHash,
    timestamp: new Date().toISOString(),
  };
}

async function logToHcs(event: AgentEvent): Promise<string> {
  const msg = JSON.stringify({
    t: event.type,
    s: event.sessionId,
    p: event.planId,
    a: event.agentId,
    n: event.agentNftId,
    h: event.payloadHash,
    ts: event.timestamp,
  });
  return publishToHcs(msg);
}

export interface SessionState {
  sessionId: string;
  goal: string;
  holdings: Holding[];
  agentNftIds: { watcher: string; strategist: string; executor: string };
  hederaTopicId: string;
  riskPreference?: number;
  currentPlan?: StrategyPlan;
  approvedPlanHash?: string;
  signature?: string;
  signerAddress?: string;
  htsTxId?: string;
  lastHcsTxId?: string;
}

// Next.js 15 isolates each API route's module scope, so a plain Map would be
// re-created per route handler and sessions would disappear between requests.
// Pinning the Map to globalThis gives all handlers a single shared instance.
const g = globalThis as typeof globalThis & { __aegis_sessions?: Map<string, SessionState> };
if (!g.__aegis_sessions) g.__aegis_sessions = new Map();
const sessions = g.__aegis_sessions;

export async function startSession(goal: string, holdings: Holding[], walletAddress?: string, riskPreference?: number): Promise<SessionState> {
  const sessionId = randomUUID();
  const topicId = await getOrCreateHcsTopic();
  const agentNftIds = await mintAgentNfts(sessionId);

  const state: SessionState = {
    sessionId,
    goal,
    holdings,
    agentNftIds,
    hederaTopicId: topicId,
    riskPreference,
  };
  sessions.set(sessionId, state);

  emit({
    type: 'WATCH',
    sessionId,
    agentId: 'watcher',
    agentNftId: agentNftIds.watcher,
    payload: { goal, holdingsCount: holdings.length, walletAddress },
    timestamp: new Date().toISOString(),
  });

  return state;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export async function runWorkflow(sessionId: string): Promise<{
  state: WorkflowState;
  signal?: WatchSignal;
  plan?: StrategyPlan;
  planHash?: string;
  stratBrainCid?: string;
  error?: string;
}> {
  const state = sessions.get(sessionId);
  if (!state) return { state: 'IDLE', error: 'Session not found' };

  const sm = new WorkflowStateMachine();
  sm.transition('WATCHING');

  emit(createEvent('WATCH', sessionId, 'watcher', { status: 'running' }, state.agentNftIds.watcher));
  const hcsTx1 = await logToHcs(createEvent('WATCH', sessionId, 'watcher', { status: 'running' }, state.agentNftIds.watcher));
  state.lastHcsTxId = hcsTx1;

  let signal: WatchSignal;
  try {
    signal = await runWatcher(state.holdings, state.goal);
  } catch (e) {
    emit(createEvent('ERROR', sessionId, 'watcher', { error: String(e) }, state.agentNftIds.watcher));
    return { state: 'IDLE', error: String(e) };
  }

  emit(createEvent('WATCH', sessionId, 'watcher', signal, state.agentNftIds.watcher));
  await logToHcs(createEvent('WATCH', sessionId, 'watcher', signal, state.agentNftIds.watcher));

  sm.transition('PROPOSED');

  const plan = await runStrategist(signal, state.goal, state.riskPreference);
  state.currentPlan = plan;

  // Archive the full strategy brain to 0g so the strategist's iNFT intelligence
  // is verifiable on-chain. The CID is emitted in the PROPOSE event payload.
  const stratBrainCid = await archiveStrategyBrain(sessionId, {
    planId: plan.planId,
    riskScore: plan.riskScore,
    recommendation: plan.recommendation,
    reasoning: plan.reasoning,
    goalProfile: state.goal,
    actions: plan.actions,
  });

  const planHash = hashPayload(plan);
  emit(createEvent('PROPOSE', sessionId, 'strategist', { ...plan, planHash, stratBrainCid }, state.agentNftIds.strategist, plan.planId));
  await logToHcs(createEvent('PROPOSE', sessionId, 'strategist', { planId: plan.planId, planHash }, state.agentNftIds.strategist, plan.planId));

  sm.transition('AWAITING_APPROVAL');

  emit(createEvent('APPROVAL_REQUEST', sessionId, 'strategist', {
    planId: plan.planId,
    planHash,
    riskScore: plan.riskScore,
    worstCaseAnalysis: plan.worstCaseAnalysis,
    actions: plan.actions,
    expiresAt: plan.expiresAt,
  }, state.agentNftIds.strategist, plan.planId));

  return { state: 'AWAITING_APPROVAL', signal, plan, planHash, stratBrainCid };
}

export async function approvePlan(sessionId: string, approval: SignedApproval): Promise<{ success: boolean; error?: string }> {
  const state = sessions.get(sessionId);
  if (!state) return { success: false, error: 'Session not found' };
  if (!state.currentPlan) return { success: false, error: 'No plan to approve' };

  const planHash = hashPayload(state.currentPlan);
  if (approval.planHash !== planHash) {
    return { success: false, error: 'Plan hash mismatch' };
  }
  if (new Date(state.currentPlan.expiresAt) < new Date()) {
    return { success: false, error: 'Plan expired' };
  }

  // Verify EIP-712 signature for real wallet signatures
  const isDemo = approval.signature.startsWith('0xDemoSignature-') ||
    approval.signerAddress === '0x0000000000000000000000000000000000000000';
  if (!isDemo && approval.signatureTimestamp) {
    try {
      const { verifyTypedData } = await import('viem');
      const isValid = await verifyTypedData({
        address: approval.signerAddress as `0x${string}`,
        domain: { name: 'AegisOS', version: '1', chainId: BigInt(8453) },
        types: {
          Approval: [
            { name: 'planId', type: 'string' },
            { name: 'planHash', type: 'string' },
            { name: 'timestamp', type: 'uint256' },
          ],
        },
        primaryType: 'Approval',
        message: {
          planId: approval.planId,
          planHash: approval.planHash,
          timestamp: BigInt(approval.signatureTimestamp),
        },
        signature: approval.signature as `0x${string}`,
      });
      if (!isValid) return { success: false, error: 'Invalid signature — signer address does not match' };
    } catch (e) {
      return { success: false, error: `Signature verification failed: ${String(e)}` };
    }
  }

  state.approvedPlanHash = planHash;
  state.signature = approval.signature;
  state.signerAddress = approval.signerAddress;

  await emit(createEvent('APPROVED', sessionId, 'executor', {
    planId: state.currentPlan.planId,
    signerAddress: approval.signerAddress,
  }, state.agentNftIds.executor, state.currentPlan.planId));
  await logToHcs(createEvent('APPROVED', sessionId, 'executor', { planId: state.currentPlan.planId }, state.agentNftIds.executor, state.currentPlan.planId));

  emit(createEvent('EXECUTE_STEP', sessionId, 'executor', { status: 'executing' }, state.agentNftIds.executor, state.currentPlan.planId));

  const { htsTxId, steps } = await runExecutor(state.currentPlan, planHash, approval.signature);
  state.htsTxId = htsTxId;

  const execPayload = { htsTxId, steps };
  emit(createEvent('EXECUTED', sessionId, 'executor', execPayload, state.agentNftIds.executor, state.currentPlan.planId));
  const hcsTx = await logToHcs(createEvent('EXECUTED', sessionId, 'executor', execPayload, state.agentNftIds.executor, state.currentPlan.planId));
  state.lastHcsTxId = hcsTx;

  return { success: true };
}

export async function rejectPlan(sessionId: string): Promise<{ success: boolean }> {
  const state = sessions.get(sessionId);
  if (!state) return { success: false };

  emit(createEvent('REJECTED', sessionId, 'strategist', { planId: state.currentPlan?.planId }, state.agentNftIds.strategist, state.currentPlan?.planId));
  await logToHcs(createEvent('REJECTED', sessionId, 'strategist', {}, state.agentNftIds.strategist, state.currentPlan?.planId));

  state.currentPlan = undefined;
  return { success: true };
}
