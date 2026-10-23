<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PLAYBACK_SPEEDS } from '@/types/behaviorTreeEvents'
import type { PlaybackState } from '@/types/behaviorTreeEvents'
import '@/assets/workspace.css'

const timelineId = useId()

defineProps<{ state: Readonly<PlaybackState>; disabled: boolean; eventCount?: number }>()
defineEmits<{ play: []; pause: []; reset: []; seek: [timeMs: number]; setSpeed: [speed: number] }>()

function seconds(timeMs: number) {
  return (timeMs / 1000).toFixed(3)
}
</script>

<template>
  <fieldset class="playback-controls bt-theme" :disabled="disabled">
    <legend class="sr-only">Recorded execution</legend>
    <div class="recording-heading">
      <div class="recording-label">
        <strong>Recorded execution</strong>
        <span v-if="eventCount !== undefined">{{ eventCount.toLocaleString() }} transitions</span>
      </div>
      <span class="transport-status" :class="{ playing: state.isPlaying }">
        {{
          disabled
            ? 'Unavailable'
            : state.isPlaying
              ? 'Playing'
              : state.durationMs > 0 && state.positionMs >= state.durationMs
                ? 'Finished'
                : 'Paused'
        }}
      </span>
    </div>
    <div class="transport-strip">
      <div class="playback-actions">
        <button
          type="button"
          class="ui-button button-primary play-button"
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
          {{
            state.isPlaying
              ? 'Pause'
              : state.durationMs > 0 && state.positionMs >= state.durationMs
                ? 'Replay'
                : 'Play'
          }}
        </button>
        <button
          type="button"
          class="ui-button button-quiet"
          title="Reset to the beginning"
          @click="$emit('reset')"
        >
          <AppIcon name="reset" /> Reset
        </button>
      </div>
      <div class="timeline-area">
        <div class="timeline-labels">
          <label :for="timelineId">Playback position</label>
          <span class="playback-time" role="timer" aria-label="Playback time" aria-live="off">
            <strong>{{ seconds(state.positionMs) }} s</strong>
            <span> / {{ seconds(state.durationMs) }} s</span>
          </span>
        </div>
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
      </div>
      <label class="speed-control">
        Speed
        <select
          class="ui-select"
          aria-label="Playback speed"
          :value="state.speed"
          @change="$emit('setSpeed', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="speed in PLAYBACK_SPEEDS" :key="speed" :value="speed">{{ speed }}×</option>
        </select>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.playback-controls {
  container: bt-playback / inline-size;
  min-width: 0;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-surface);
}
.recording-heading,
.recording-label,
.timeline-labels,
.playback-actions,
.speed-control {
  display: flex;
  align-items: center;
}
.recording-heading {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}
.recording-label {
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 12px;
  line-height: 16px;
}
.recording-label strong {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}
.recording-label > span,
.timeline-labels,
.speed-control {
  color: var(--bt-text-secondary);
}
.transport-status {
  color: var(--bt-text-secondary);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
}
.transport-status.playing {
  color: var(--bt-primary);
}
.transport-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}
.playback-actions {
  gap: 0.25rem;
}
.play-button {
  min-width: 6rem;
}
.timeline-area {
  min-width: 0;
}
.timeline-labels {
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
}
.playback-time {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-family: var(--bt-font-mono);
  min-width: 21ch;
  text-align: right;
}
.playback-time strong {
  color: var(--bt-text);
  font-weight: 500;
}
.speed-control {
  gap: 0.5rem;
  font-size: 0.875rem;
}
.speed-control select {
  min-width: 4.5rem;
}
input[type='range'] {
  display: block;
  appearance: none;
  width: 100%;
  height: 30px;
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
@container bt-playback (max-width: 700px) {
  .transport-strip {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
  }
  .timeline-area {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .recording-label {
    gap: 0.125rem 0.5rem;
  }
  .recording-label > span {
    font-size: 0.75rem;
  }
  input[type='range'] {
    height: 40px;
  }
}
@container bt-playback (max-width: 380px) {
  .speed-control {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }
  .timeline-labels {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
