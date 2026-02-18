import type { AgentEvent } from '@aegisos/shared';
import { setEventCallback } from './orchestrator';

const eventQueue: AgentEvent[] = [];
const MAX_EVENTS = 100;

setEventCallback((event: AgentEvent) => {
  eventQueue.push(event);
  if (eventQueue.length > MAX_EVENTS) eventQueue.shift();
});

export function getEventQueue(): AgentEvent[] {
  return eventQueue;
}
