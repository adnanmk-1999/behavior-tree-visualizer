import type {
  BehaviorTreeEvent,
  DisplayStatus,
  ExecutionStatus,
  NodeStatusMap,
} from '@/types/behaviorTreeEvents'

export function normalizeNodeUid(uid?: string): string | undefined {
  const value = uid?.trim()
  return value && /^\d+$/.test(value) ? BigInt(value).toString() : undefined
}

export function getNodeStatus(statuses: NodeStatusMap, uid?: string): DisplayStatus {
  const key = normalizeNodeUid(uid)
  return key === undefined ? 'UNOBSERVED' : (statuses.get(key) ?? 'UNOBSERVED')
}

/** Apply only events after the cursor, in their original order, including ties and IDLE. */
export function applyEventsThrough(
  events: readonly BehaviorTreeEvent[],
  nextEventIndex: number,
  timeMs: number,
  statuses: Map<string, ExecutionStatus>,
): number {
  while (nextEventIndex < events.length) {
    const event = events[nextEventIndex]!
    if (event.offsetMs > timeMs) break
    statuses.set(event.uid, event.currentStatus)
    nextEventIndex++
  }
  return nextEventIndex
}

export function reconstructPlayback(events: readonly BehaviorTreeEvent[], timeMs: number) {
  const statuses = new Map<string, ExecutionStatus>()
  const nextEventIndex = applyEventsThrough(events, 0, timeMs, statuses)
  return { statuses, nextEventIndex }
}
