import type { WorkflowState } from '@mudra/shared';

const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  IDLE: ['WATCHING'],
  WATCHING: ['PROPOSED', 'IDLE'],
  PROPOSED: ['AWAITING_APPROVAL'],
  AWAITING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['EXECUTING'],
  REJECTED: ['WATCHING', 'IDLE'],
  EXECUTING: ['EXECUTED'],
  EXECUTED: ['WATCHING', 'IDLE'],
};

export class WorkflowStateMachine {
  private state: WorkflowState = 'IDLE';

  getState(): WorkflowState {
    return this.state;
  }

  canTransition(to: WorkflowState): boolean {
    return VALID_TRANSITIONS[this.state]?.includes(to) ?? false;
  }

  transition(to: WorkflowState): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `Invalid transition: ${this.state} -> ${to}. Allowed: ${VALID_TRANSITIONS[this.state]?.join(', ') ?? 'none'}`
      );
    }
    this.state = to;
  }

  reset(): void {
    this.state = 'IDLE';
  }
}
