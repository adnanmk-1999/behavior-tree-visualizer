import { onScopeDispose, reactive, readonly, watch, type Ref } from 'vue'
import { PLAYBACK_SPEEDS } from '../types/behaviorTreeEvents.ts'
import type {
  BehaviorTreeRecording,
  ExecutionStatus,
  PlaybackState,
} from '@/types/behaviorTreeEvents'
import { applyEventsThrough, reconstructPlayback } from '../utils/playbackState.ts'

export function useBehaviorTreePlayback(recording: Ref<BehaviorTreeRecording | null>) {
  const state = reactive<PlaybackState>({
    positionMs: 0,
    durationMs: 0,
    isPlaying: false,
    speed: 1,
  })
  const statuses = reactive(new Map<string, ExecutionStatus>())
  let snapshot = new Map<string, ExecutionStatus>()
  let nextEventIndex = 0
  let frame: number | undefined
  let anchorClock = 0
  let anchorPosition = 0

  function stop() {
    state.isPlaying = false
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }

  function moveTo(timeMs: number) {
    const events = recording.value?.events ?? []
    const previousIndex = nextEventIndex
    const backwards = timeMs < state.positionMs
    if (backwards) {
      const rebuilt = reconstructPlayback(events, timeMs)
      snapshot = rebuilt.statuses
      nextEventIndex = rebuilt.nextEventIndex
    } else {
      nextEventIndex = applyEventsThrough(events, nextEventIndex, timeMs, snapshot)
    }
    state.positionMs = timeMs
    if (backwards || nextEventIndex !== previousIndex) {
      // Commit only the final changed values for this frame, even if a UID changed many times.
      for (const uid of statuses.keys()) if (!snapshot.has(uid)) statuses.delete(uid)
      for (const [uid, status] of snapshot) {
        if (statuses.get(uid) !== status) statuses.set(uid, status)
      }
    }
  }

  function advance(now: number) {
    moveTo(
      Math.min(state.durationMs, anchorPosition + Math.max(0, now - anchorClock) * state.speed),
    )
    if (state.positionMs >= state.durationMs) stop()
  }

  function tick(now: number) {
    frame = undefined
    if (!state.isPlaying) return
    advance(now)
    if (state.isPlaying) frame = requestAnimationFrame(tick)
  }

  function play() {
    if (state.isPlaying || !recording.value?.events.length || state.durationMs === 0) return
    if (state.positionMs >= state.durationMs) moveTo(0)
    anchorClock = performance.now()
    anchorPosition = state.positionMs
    state.isPlaying = true
    frame = requestAnimationFrame(tick)
  }

  function pause() {
    if (state.isPlaying) advance(performance.now())
    stop()
  }

  function seek(timeMs: number) {
    if (!Number.isFinite(timeMs)) return
    moveTo(Math.max(0, Math.min(state.durationMs, timeMs)))
    anchorClock = performance.now()
    anchorPosition = state.positionMs
    if (state.positionMs >= state.durationMs) stop()
  }

  function reset() {
    stop()
    seek(0)
  }

  function setSpeed(value: number) {
    const speed = PLAYBACK_SPEEDS.find((candidate) => candidate === value)
    if (speed === undefined || speed === state.speed) return
    const now = performance.now()
    if (state.isPlaying) advance(now)
    state.speed = speed
    anchorClock = now
    anchorPosition = state.positionMs
  }

  watch(
    recording,
    (loaded) => {
      stop()
      state.positionMs = 0
      state.durationMs = loaded?.durationMs ?? 0
      state.speed = 1
      snapshot = new Map()
      nextEventIndex = 0
      statuses.clear()
      moveTo(0)
    },
    { immediate: true, flush: 'sync' },
  )
  onScopeDispose(stop)

  return {
    state: readonly(state),
    statuses: readonly(statuses),
    play,
    pause,
    seek,
    reset,
    setSpeed,
  }
}
