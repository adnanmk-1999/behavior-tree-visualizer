<script setup lang="ts">
import { computed, toRef, useId, watch } from 'vue'
import BehaviorTreeViewer from './BehaviorTreeViewer.vue'
import PlaybackControls from './PlaybackControls.vue'
import AppIcon from './AppIcon.vue'
import { useBehaviorTreePlayback } from '../composables/useBehaviorTreePlayback'
import type {
  BehaviorTreeDefinition,
  BehaviorTreeNode,
  NodeCategoryMap,
} from '../types/behaviorTree'
import type {
  BehaviorTreeRecording,
  NodeStatusMap,
  PlaybackMode,
} from '../types/behaviorTreeEvents'

const props = withDefaults(
  defineProps<{
    tree: BehaviorTreeDefinition
    definitions: readonly BehaviorTreeDefinition[]
    nodeModels?: NodeCategoryMap
    statuses?: NodeStatusMap
    recording?: BehaviorTreeRecording | null
    showModeSwitch?: boolean
  }>(),
  { statuses: () => new Map(), recording: null, showModeSwitch: false },
)
const mode = defineModel<PlaybackMode>('mode', { required: true })
const emit = defineEmits<{ openSubtree: [reference: Omit<BehaviorTreeNode, 'children'>] }>()
const playback = useBehaviorTreePlayback(toRef(props, 'recording'))
const displayedStatuses = computed(() =>
  mode.value === 'replay' ? playback.statuses : props.statuses,
)
const modeId = useId()
const modes = [
  { value: 'live', label: 'Live', icon: 'live' },
  { value: 'replay', label: 'Replay', icon: 'reset' },
] as const

watch(
  mode,
  (value) => {
    if (value === 'live') playback.pause()
  },
  { flush: 'sync' },
)

function onModeKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const nextMode =
    event.key === 'Home'
      ? 'live'
      : event.key === 'End'
        ? 'replay'
        : mode.value === 'live'
          ? 'replay'
          : 'live'
  mode.value = nextMode
  const tablist = event.currentTarget as HTMLElement
  tablist.querySelector<HTMLButtonElement>(`#${CSS.escape(`${modeId}-${nextMode}`)}`)?.focus()
}
</script>

<template>
  <div class="bt-player bt-theme">
    <div v-if="showModeSwitch" class="player-toolbar">
      <div
        class="playback-mode"
        role="tablist"
        aria-label="Execution source"
        @keydown="onModeKeydown"
      >
        <button
          v-for="option in modes"
          :id="`${modeId}-${option.value}`"
          :key="option.value"
          class="mode-tab"
          type="button"
          role="tab"
          :aria-selected="mode === option.value"
          :aria-controls="`${modeId}-panel`"
          :tabindex="mode === option.value ? 0 : -1"
          @click="mode = option.value"
        >
          <AppIcon :name="option.icon" /> {{ option.label }}
        </button>
      </div>
    </div>
    <div
      :id="`${modeId}-panel`"
      class="player-viewer"
      :role="showModeSwitch ? 'tabpanel' : undefined"
      :aria-labelledby="showModeSwitch ? `${modeId}-${mode}` : undefined"
    >
      <BehaviorTreeViewer
        :key="JSON.stringify([tree.ID, tree._fullpath])"
        :tree="tree"
        :definitions="definitions"
        :node-models="nodeModels"
        :statuses="displayedStatuses"
        @open-subtree="emit('openSubtree', $event)"
      >
        <template v-if="mode === 'replay'" #playback>
          <section class="player-playback" aria-label="Recording playback">
            <PlaybackControls
              :state="playback.state"
              :disabled="!recording?.events.length"
              @play="playback.play"
              @pause="playback.pause"
              @reset="playback.reset"
              @step-forward="playback.stepForward"
              @step-backward="playback.stepBackward"
              @seek="playback.seek"
              @set-speed="playback.setSpeed"
            />
            <p v-if="!recording?.events.length" class="player-message" role="status">
              No recorded status changes available. You can still explore the tree.
            </p>
            <p v-if="recording?.unmatchedUids?.length" class="notice" role="status">
              {{ recording.unmatchedUids.length }} recorded UIDs are missing from this XML. Their
              events are retained but cannot highlight a matching node.
            </p>
          </section>
        </template>
      </BehaviorTreeViewer>
    </div>
  </div>
</template>

<style scoped>
.bt-player {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-width: 0;
  overflow: auto;
}
.player-toolbar {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
.player-message {
  margin: 8px 0 0;
  color: var(--bt-text-secondary);
  font-size: 12px;
  line-height: 20px;
}
.player-viewer {
  flex: 1 0 360px;
  min-height: 360px;
  min-width: 0;
}
.playback-mode {
  display: inline-flex;
  padding: 2px;
  border-radius: 4px;
  background: var(--bt-overlay-surface);
}
.mode-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 32px;
  padding: 4px 12px;
  border: 0;
  border-radius: 4px;
  color: var(--bt-text);
  background: transparent;
  font-size: 14px;
  line-height: 20px;
}
.mode-tab:hover {
  background: var(--bt-surface-hover);
}
.mode-tab[aria-selected='true'] {
  color: var(--bt-primary);
  background: var(--bt-primary-soft);
}
.mode-tab:focus-visible {
  outline-offset: -2px;
}
.mode-tab .app-icon {
  width: 16px;
  height: 16px;
}
</style>
