<script setup lang="ts">
import { PLAYBACK_SPEEDS } from '@/types/behaviorTreeEvents'
import type { PlaybackState } from '@/types/behaviorTreeEvents'

defineProps<{ state: Readonly<PlaybackState>; disabled: boolean }>()
defineEmits<{ play: []; pause: []; reset: []; seek: [timeMs: number]; setSpeed: [speed: number] }>()

function seconds(timeMs: number) {
  return (timeMs / 1000).toFixed(3)
}
</script>

<template>
  <fieldset class="playback-controls" :disabled="disabled">
    <legend>Recorded execution</legend>
    <div class="playback-actions">
      <button
        type="button"
        class="play-button"
        :disabled="state.durationMs === 0"
        @click="state.isPlaying ? $emit('pause') : $emit('play')"
      >
        {{
          state.isPlaying
            ? 'Pause'
            : state.durationMs > 0 && state.positionMs >= state.durationMs
              ? 'Replay'
              : 'Play'
        }}
      </button>
      <button type="button" @click="$emit('reset')">Reset</button>
      <label class="speed-control">
        Speed
        <select
          :value="state.speed"
          @change="$emit('setSpeed', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="speed in PLAYBACK_SPEEDS" :key="speed" :value="speed">{{ speed }}×</option>
        </select>
      </label>
      <span class="playback-time" role="timer" aria-label="Playback time" aria-live="off">
        {{ seconds(state.positionMs) }} s / {{ seconds(state.durationMs) }} s
      </span>
    </div>
    <label class="timeline">
      Playback position
      <input
        type="range"
        min="0"
        :max="state.durationMs"
        step="any"
        :value="state.positionMs"
        :disabled="state.durationMs === 0"
        :aria-valuetext="`${seconds(state.positionMs)} of ${seconds(state.durationMs)} seconds`"
        @input="$emit('seek', Number(($event.target as HTMLInputElement).value))"
      />
    </label>
  </fieldset>
</template>

<style scoped>
.playback-controls {
  min-width: 0;
  margin: 0;
  padding: 0.75rem 1rem 1rem;
  border: 1px solid #94a3b8;
}

legend {
  padding-inline: 0.25rem;
  font-weight: 600;
}
.playback-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
button,
select {
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
}
.play-button {
  min-width: 5rem;
}
.speed-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-inline: 0.5rem;
}
.playback-time {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.timeline {
  display: grid;
  gap: 0.25rem;
  margin-top: 0.75rem;
}
input {
  width: 100%;
  margin: 0;
  min-height: 2rem;
  accent-color: #334155;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid #172033;
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .playback-time {
    width: 100%;
    margin: 0;
  }
}
</style>
