export type WorkflowState =
  | 'IDLE'
  | 'WATCHING'
  | 'PROPOSED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'EXECUTED';

export type EventType =
  | 'WATCH'
  | 'PROPOSE'
  | 'APPROVAL_REQUEST'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTE_STEP'
  | 'EXECUTED'
  | 'ERROR';

export type AgentId = 'watcher' | 'strategist' | 'executor';

export interface AgentEvent {
  type: EventType;
  sessionId: string;
  planId?: string;
  agentId: AgentId;
  agentNftId?: string;
  payload: Record<string, unknown>;
  payloadHash?: string;
  prevHash?: string;
  timestamp: string;
  hcsTxId?: string;
}
