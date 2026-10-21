export function recording(entries = []) {
  const start = 1_000_000_000_000_000_000n
  const events = entries.map(([offsetMs, uid, currentStatus, previousStatus = 'IDLE'], index) => ({
    index,
    timestampNs: String(start + BigInt(Math.round(offsetMs * 1_000_000))),
    offsetMs,
    uid,
    nodeName: 'Repeated node name',
    previousStatus,
    currentStatus,
  }))
  return {
    version: 1,
    sourceTopic: '/behavior_tree_log',
    startTimestampNs: events.length ? String(start) : null,
    durationMs: events.at(-1)?.offsetMs ?? 0,
    events,
  }
}
