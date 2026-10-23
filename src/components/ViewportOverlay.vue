<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { SubtreeVisibility } from '@/utils/expandBehaviorTreeFlow'

defineProps<{
  nodeCount: number
  edgeCount: number
  zoom: number
  runningPathOnly: boolean
  subtrees: SubtreeVisibility
  hasSubtreeOverrides: boolean
}>()
defineEmits<{
  zoomIn: []
  zoomOut: []
  readableView: []
  fitTree: []
  toggleRunningPath: []
  setSubtrees: [mode: SubtreeVisibility]
}>()

const id = useId()
const statusExpanded = ref(true)
const tooltipsDismissed = ref(false)
const subtreeModes = [
  { value: 'hidden', label: 'Collapse subtrees', status: 'Collapsed', icon: 'collapse-tree' },
  {
    value: 'running',
    label: 'Expand running subtrees',
    status: 'Running only',
    icon: 'running-tree',
  },
  { value: 'all', label: 'Expand all subtrees', status: 'All expanded', icon: 'tree' },
] as const

function dismissTooltips(event: KeyboardEvent) {
  if (event.key === 'Escape') tooltipsDismissed.value = true
}
onMounted(() => document.addEventListener('keydown', dismissTooltips))
onBeforeUnmount(() => document.removeEventListener('keydown', dismissTooltips))
</script>

<template>
  <div
    class="viewport-overlay"
    :data-tooltips-dismissed="tooltipsDismissed || undefined"
    @keydown.esc.stop.prevent="tooltipsDismissed = true"
    @pointerover="tooltipsDismissed = false"
    @focusin="tooltipsDismissed = false"
  >
    <section class="viewport-status" aria-label="Tree status">
      <button
        class="status-header"
        type="button"
        :aria-expanded="statusExpanded"
        :aria-controls="`${id}-status`"
        @click="statusExpanded = !statusExpanded"
      >
        <span>Tree status</span>
        <AppIcon name="down" class="status-chevron" />
      </button>
      <div
        :id="`${id}-status`"
        class="status-expansion"
        :class="{ expanded: statusExpanded }"
        :aria-hidden="!statusExpanded"
        :inert="!statusExpanded"
      >
        <div class="status-content">
          <div class="status-lines">
            <div>{{ nodeCount }} nodes</div>
            <div>{{ edgeCount }} connections</div>
            <div>
              Zoom: <span aria-label="Zoom level">{{ Math.round(zoom * 100) }}%</span>
            </div>
            <div>Path: {{ runningPathOnly ? 'Running only' : 'All nodes' }}</div>
            <div>
              Subtrees:
              {{
                hasSubtreeOverrides
                  ? 'Custom'
                  : subtreeModes.find((mode) => mode.value === subtrees)?.status
              }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="viewport-actions" aria-label="Viewport controls">
      <div class="button-group" role="group" aria-label="Zoom controls">
        <button
          class="overlay-button"
          type="button"
          aria-label="Zoom out"
          :disabled="zoom <= 0.05"
          @click="$emit('zoomOut')"
        >
          <AppIcon name="minus" />
        </button>
        <button
          class="overlay-button"
          type="button"
          aria-label="Zoom in"
          :disabled="zoom >= 2"
          @click="$emit('zoomIn')"
        >
          <AppIcon name="plus" />
        </button>
      </div>

      <div
        class="button-group visibility-controls"
        role="group"
        aria-label="Tree visibility options"
      >
        <button
          class="overlay-button"
          type="button"
          aria-label="Running path only"
          :aria-pressed="runningPathOnly"
          @click="$emit('toggleRunningPath')"
        >
          <AppIcon name="route" />
        </button>
        <button
          v-for="mode in subtreeModes"
          :key="mode.value"
          class="overlay-button"
          type="button"
          :aria-label="mode.label"
          :aria-pressed="!hasSubtreeOverrides && subtrees === mode.value"
          @click="$emit('setSubtrees', mode.value)"
        >
          <AppIcon :name="mode.icon" />
        </button>
      </div>

      <div class="button-group" role="group" aria-label="Tree view actions">
        <button
          class="overlay-button"
          type="button"
          aria-label="Readable view"
          @click="$emit('readableView')"
        >
          <AppIcon name="readable" />
        </button>
        <button
          class="overlay-button"
          type="button"
          aria-label="Fit tree"
          @click="$emit('fitTree')"
        >
          <AppIcon name="fit" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  color: var(--bt-text);
}
.viewport-status,
.viewport-actions {
  position: absolute;
}
.viewport-status,
.button-group {
  pointer-events: auto;
}
.viewport-status {
  top: 8px;
  left: 8px;
  width: min(280px, calc(100% - 16px));
  border-radius: 4px;
  background: var(--bt-overlay-surface);
  box-shadow: var(--bt-overlay-shadow);
  overflow: hidden;
}
.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 36px;
  padding: 0 24px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 15px;
  font-weight: 400;
  line-height: 20px;
  text-align: left;
}
.status-header:hover {
  background: var(--bt-surface-hover);
}
.status-header:focus-visible {
  outline-offset: -3px;
}
.status-chevron {
  width: 18px;
  height: 18px;
  transition: transform 160ms ease;
}
.status-header[aria-expanded='true'] .status-chevron {
  transform: rotate(180deg);
}
.status-expansion {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 160ms ease;
}
.status-expansion.expanded {
  grid-template-rows: 1fr;
}
.status-content {
  min-height: 0;
  overflow: hidden;
}
.status-lines {
  max-height: calc(100cqh - 96px);
  overflow: auto;
  padding: 8px 24px 16px;
  font-size: 16px;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.viewport-actions {
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.button-group {
  position: relative;
  display: flex;
  gap: 4px;
}
.button-group + .button-group {
  padding-left: 8px;
  border-left: 1px solid var(--bt-border);
}
.overlay-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: var(--bt-text);
  background: var(--bt-overlay-button-surface);
  box-shadow: var(--bt-overlay-shadow);
}
.overlay-button .app-icon {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}
.overlay-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--bt-text) 12%, var(--bt-overlay-button-surface));
}
.overlay-button:active:not(:disabled) {
  background: color-mix(in srgb, var(--bt-text) 20%, var(--bt-overlay-button-surface));
}
.overlay-button[aria-pressed='true'] {
  color: var(--bt-primary);
  background: var(--bt-primary-soft);
  box-shadow: inset 0 0 0 1px var(--bt-primary);
}
.overlay-button:disabled {
  opacity: 0.4;
}
.overlay-button::after {
  content: attr(aria-label);
  position: absolute;
  z-index: 1;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  width: max-content;
  max-width: min(240px, calc(100cqw - 72px));
  padding: 5px 16px;
  border-radius: 4px;
  background: var(--bt-tooltip-surface);
  color: var(--bt-tooltip-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  text-align: left;
  pointer-events: none;
  visibility: hidden;
}
.overlay-button:focus-visible::after {
  visibility: visible;
}
.visibility-controls .overlay-button:nth-child(n + 3)::after,
.button-group:last-child .overlay-button::after {
  left: auto;
  right: calc(100% + 10px);
}
@media (hover: hover) {
  .overlay-button:hover::after {
    visibility: visible;
  }
}
[data-tooltips-dismissed] .overlay-button::after {
  visibility: hidden;
}
@container bt-canvas (max-width: 600px) {
  .overlay-button {
    position: static;
  }
  .overlay-button::after,
  .visibility-controls .overlay-button:nth-child(n + 3)::after,
  .button-group:last-child .overlay-button::after {
    top: auto;
    bottom: calc(100% + 10px);
    left: auto;
    right: 0;
    transform: none;
  }
  .button-group:first-child .overlay-button::after {
    left: 0;
    right: auto;
  }
}
@container bt-canvas (max-width: 360px) {
  .viewport-actions {
    gap: 4px;
  }
  .button-group {
    gap: 2px;
  }
  .button-group + .button-group {
    padding-left: 4px;
  }
  .overlay-button {
    flex-basis: 32px;
    width: 32px;
  }
}
</style>
