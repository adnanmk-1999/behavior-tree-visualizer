import { EXECUTION_STATUSES } from '../types/behaviorTreeEvents.ts'
import type {
  BehaviorTreeEvent,
  BehaviorTreeRecording,
  ExecutionStatus,
  RecordingMetadata,
} from '../types/behaviorTreeEvents'
import { normalizeNodeUid } from './playbackState.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid recording: ${message}`)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStatus(value: unknown): value is ExecutionStatus {
  return EXECUTION_STATUSES.some((status) => status === value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d+$/.test(value)
}

export function parseBehaviorTreeEvents(input: unknown): BehaviorTreeRecording {
  assert(isObject(input), 'expected a JSON object.')
  assert(input.version === 1, 'expected format version 1.')
  assert(input.sourceTopic === '/behavior_tree_log', 'expected sourceTopic /behavior_tree_log.')
  assert(
    typeof input.durationMs === 'number' &&
      Number.isFinite(input.durationMs) &&
      input.durationMs >= 0,
    'durationMs must be a finite, non-negative number.',
  )
  assert(Array.isArray(input.events), 'events must be an array.')
  assert(
    input.events.length ? isTimestamp(input.startTimestampNs) : input.startTimestampNs === null,
    'startTimestampNs must be a decimal string, or null for an empty recording.',
  )

  const start = input.startTimestampNs === null ? null : BigInt(input.startTimestampNs as string)
  let previousTimestamp = start
  let previousOffset = 0
  const events = input.events.map((value: unknown, index): BehaviorTreeEvent => {
    const context = `events[${index}]`
    assert(isObject(value), `${context} must be an object.`)
    assert(
      value.index === index,
      `${context}.index must match its array position; event order cannot be changed.`,
    )
    assert(isTimestamp(value.timestampNs), `${context}.timestampNs must be a decimal string.`)
    const timestamp = BigInt(value.timestampNs)
    assert(
      previousTimestamp !== null && timestamp >= previousTimestamp,
      `${context} is not in chronological order.`,
    )
    assert(index !== 0 || timestamp === start, 'startTimestampNs differs from the first event.')
    assert(
      typeof value.offsetMs === 'number' &&
        Number.isFinite(value.offsetMs) &&
        value.offsetMs >= previousOffset,
      `${context}.offsetMs must be finite, non-negative and chronological.`,
    )
    assert(
      value.offsetMs === Number(timestamp - start!) / 1_000_000,
      `${context}.offsetMs disagrees with its timestamp.`,
    )
    assert(index !== 0 || value.offsetMs === 0, 'the first event must have offsetMs 0.')
    assert(
      typeof value.uid === 'string' && normalizeNodeUid(value.uid) !== undefined,
      `${context}.uid must be an unsigned decimal string.`,
    )
    assert(typeof value.nodeName === 'string', `${context}.nodeName must be a string.`)
    assert(
      isStatus(value.previousStatus) && isStatus(value.currentStatus),
      `${context} contains an unsupported execution status.`,
    )
    previousTimestamp = timestamp
    previousOffset = value.offsetMs
    return {
      index,
      timestampNs: value.timestampNs,
      offsetMs: value.offsetMs,
      uid: normalizeNodeUid(value.uid)!,
      nodeName: value.nodeName,
      previousStatus: value.previousStatus,
      currentStatus: value.currentStatus,
    }
  })
  assert(
    input.durationMs === (events.at(-1)?.offsetMs ?? 0),
    'durationMs differs from the event time range.',
  )

  const metadata: RecordingMetadata = {
    version: 1,
    sourceTopic: '/behavior_tree_log',
    startTimestampNs: input.startTimestampNs as string | null,
    durationMs: input.durationMs,
  }
  for (const key of ['messageCount', 'uniqueUidCount', 'unmatchedEventCount'] as const) {
    if (input[key] !== undefined) {
      assert(
        typeof input[key] === 'number' && Number.isSafeInteger(input[key]) && input[key] >= 0,
        `${key} must be a non-negative integer.`,
      )
      metadata[key] = input[key]
    }
  }
  if (input.unmatchedUids !== undefined) {
    assert(Array.isArray(input.unmatchedUids), 'unmatchedUids must be an array.')
    metadata.unmatchedUids = input.unmatchedUids.map((uid: unknown) => {
      assert(
        typeof uid === 'string' && normalizeNodeUid(uid) !== undefined,
        'unmatchedUids must contain decimal UID strings.',
      )
      return normalizeNodeUid(uid)!
    })
  }
  return { ...metadata, events }
}

export async function loadBehaviorTreeEvents(
  signal?: AbortSignal,
  baseUrl = '/',
): Promise<BehaviorTreeRecording> {
  const url = `${baseUrl}data/behavior-tree-events.json`
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `Recording not found at ${url}. Run the Python exporter, then reload.`
        : `Could not load the recording: HTTP ${response.status} ${response.statusText}.`,
    )
  }
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error(
      'The recording file is not valid JSON. Run the Python exporter again, then reload.',
    )
  }
  return parseBehaviorTreeEvents(data)
}
