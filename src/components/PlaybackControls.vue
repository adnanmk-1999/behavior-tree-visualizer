<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useId, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PLAYBACK_SPEEDS } from '@/types/behaviorTreeEvents'
import type { PlaybackState } from '@/types/behaviorTreeEvents'
import '@/assets/workspace.css'

const timelineId = useId()

const props = defineProps<{ state: Readonly<PlaybackState>; disabled: boolean }>()
const nextSpeed = computed(
  () => PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(props.state.speed) + 1) % PLAYBACK_SPEEDS.length]!,
)
const playLabel = computed(() =>
  props.state.isPlaying
    ? 'Pause'
    : props.state.durationMs > 0 && props.state.positionMs >= props.state.durationMs
      ? 'Replay'
      : 'Play',
)
defineEmits<{
  play: []
  pause: []
  reset: []
  stepForward: []
  stepBackward: []
  seek: [timeMs: number]
  setSpeed: [speed: number]
}>()

let repeatTimer: ReturnType<typeof setTimeout> | undefined
let activePointerId: number | null = null
let repeated = false

function stopRepeating() {
  clearTimeout(repeatTimer)
  repeatTimer = undefined
  activePointerId = null
}

function releasePointer(event: PointerEvent) {
  if (event.pointerId === activePointerId) stopRepeating()
}

function startRepeating(event: PointerEvent, emitStep: () => void) {
  if (props.disabled || !event.isPrimary || event.button !== 0 || activePointerId !== null) return
  activePointerId = event.pointerId
  repeated = false
  const startedAt = performance.now()
  function repeat() {
    repeated = true
    emitStep()
    const elapsedSeconds = Math.max(0, performance.now() - startedAt - 400) / 1000
    repeatTimer = setTimeout(repeat, Math.max(25, 100 / 2 ** elapsedSeconds))
  }
  repeatTimer = setTimeout(repeat, 400)
}

function step(event: MouseEvent, emitStep: () => void) {
  // A held pointer already stepped; its release must not add another step.
  if (!repeated || event.detail === 0) emitStep()
  repeated = false
}

watch(() => props.disabled, stopRepeating)
onMounted(() => {
  window.addEventListener('pointerup', releasePointer)
  window.addEventListener('pointercancel', releasePointer)
  window.addEventListener('blur', stopRepeating)
})
onBeforeUnmount(() => {
  stopRepeating()
  window.removeEventListener('pointerup', releasePointer)
  window.removeEventListener('pointercancel', releasePointer)
  window.removeEventListener('blur', stopRepeating)
})

function seconds(timeMs: number) {
  return (timeMs / 1000).toFixed(2)
}
</script>

<template>
  <fieldset class="playback-controls bt-theme" :disabled="disabled">
    <legend class="sr-only">Recorded execution</legend>
    <div class="playback-actions">
      <button
        type="button"
        class="ui-button transport-button step-button"
        aria-label="Previous change"
        title="Pause and jump to the previous recorded status change. Hold to step progressively faster."
        @pointerdown="startRepeating($event, () => $emit('stepBackward'))"
        @pointerleave="releasePointer"
        @click="step($event, () => $emit('stepBackward'))"
      >
        <AppIcon name="previous" />
      </button>
      <button
        type="button"
        class="ui-button button-primary transport-button"
        :aria-label="playLabel"
        :title="playLabel"
        :disabled="state.durationMs === 0"
        @click="state.isPlaying ? $emit('pause') : $emit('play')"
      >
        <AppIcon
          :name="
            state.isPlaying
              ? 'pause'
              : state.durationMs > 0 && state.positionMs >= state.durationMs
                ? 'reset'
                : 'play'
          "
        />
      </button>
      <button
        type="button"
        class="ui-button transport-button step-button"
        aria-label="Next change"
        title="Pause and jump to the next recorded status change. Hold to step progressively faster."
        @pointerdown="startRepeating($event, () => $emit('stepForward'))"
        @pointerleave="releasePointer"
        @click="step($event, () => $emit('stepForward'))"
      >
        <AppIcon name="next" />
      </button>
    </div>
    <label :for="timelineId" class="sr-only">Playback position</label>
    <input
      :id="timelineId"
      type="range"
      min="0"
      :max="state.durationMs"
      step="any"
      :value="state.positionMs"
      :disabled="state.durationMs === 0"
      :aria-valuetext="`${seconds(state.positionMs)} of ${seconds(state.durationMs)} seconds`"
      :style="{
        '--bt-progress': `${state.durationMs ? (state.positionMs / state.durationMs) * 100 : 0}%`,
      }"
      @input="$emit('seek', Number(($event.target as HTMLInputElement).value))"
    />
    <span class="playback-time" role="timer" aria-label="Playback time" aria-live="off">
      <strong>{{ seconds(state.positionMs) }} s</strong>
      <span> / {{ seconds(state.durationMs) }} s</span>
    </span>
    <div class="playback-settings">
      <button
        type="button"
        class="ui-button transport-button speed-control"
        :aria-label="`Playback speed ${state.speed}×`"
        :title="`Playback speed: ${state.speed}×. Click to change to ${nextSpeed}×`"
        @click="$emit('setSpeed', nextSpeed)"
      >
        {{ state.speed }}×
      </button>
      <button
        type="button"
        class="ui-button transport-button reset-button"
        aria-label="Reset"
        title="Reset to the beginning"
        @click="$emit('reset')"
      >
        <AppIcon name="reset" />
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.playback-controls {
  display: grid;
  grid-template-areas: 'actions timeline time settings';
  grid-template-columns: auto minmax(80px, 1fr) auto auto;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
  margin: 0;
  padding: 1px 8px;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-overlay-surface);
}
.playback-actions,
.playback-settings {
  display: flex;
  align-items: center;
  gap: 4px;
}
.playback-actions {
  grid-area: actions;
  flex-wrap: wrap;
  min-width: 0;
}
.playback-settings {
  grid-area: settings;
}
.playback-controls .transport-button {
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
}
.step-button {
  touch-action: none;
}
.playback-time {
  grid-area: time;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-family: var(--bt-font-mono);
  overflow-wrap: anywhere;
}
.playback-time strong {
  color: var(--bt-text);
  font-weight: 500;
}
.speed-control {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
input[type='range'] {
  grid-area: timeline;
  display: block;
  appearance: none;
  width: 100%;
  height: 32px;
  margin: 0;
  border-radius: 4px;
  background: transparent;
  accent-color: var(--bt-primary);
}
input[type='range']::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    var(--bt-primary) var(--bt-progress),
    var(--bt-track) var(--bt-progress)
  );
}
input[type='range']::-moz-range-track {
  height: 5px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    var(--bt-primary) var(--bt-progress),
    var(--bt-track) var(--bt-progress)
  );
}
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6.5px;
  border: 3px solid var(--bt-primary);
  border-radius: 50%;
  background: var(--bt-primary);
}
input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 3px solid var(--bt-primary);
  border-radius: 50%;
  background: var(--bt-primary);
}
input:disabled {
  opacity: 0.5;
}
@container bt-playback (max-width: 560px) {
  .playback-controls {
    grid-template-areas: 'actions actions' 'timeline timeline' 'time settings';
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 8px;
  }
}
@media (pointer: coarse) {
  .playback-controls .transport-button {
    min-width: 44px;
    min-height: 44px;
  }
  input[type='range'] {
    height: 44px;
  }
}
</style>
