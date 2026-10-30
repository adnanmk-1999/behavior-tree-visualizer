export const EXECUTION_STATUSES = ['IDLE', 'RUNNING', 'SUCCESS', 'FAILURE', 'SKIPPED'] as const
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number]
export type DisplayStatus = ExecutionStatus | 'UNOBSERVED'
export type NodeStatusMap = ReadonlyMap<string, ExecutionStatus>
export type PlaybackMode = 'live' | 'replay'

export interface BehaviorTreeEvent {
  index: number
  timestampNs: string
  offsetMs: number
  uid: string
  nodeName: string
  previousStatus: ExecutionStatus
  currentStatus: ExecutionStatus
}

export interface RecordingMetadata {
  version: 1
  sourceTopic: '/behavior_tree_log'
  startTimestampNs: string | null
  durationMs: number
  messageCount?: number
  uniqueUidCount?: number
  unmatchedUids?: string[]
  unmatchedEventCount?: number
}

export interface BehaviorTreeRecording extends RecordingMetadata {
  events: readonly BehaviorTreeEvent[]
}

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export interface PlaybackState {
  positionMs: number
  durationMs: number
  isPlaying: boolean
  speed: PlaybackSpeed
}
