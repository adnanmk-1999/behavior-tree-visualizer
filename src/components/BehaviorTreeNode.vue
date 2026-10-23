<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@/components/AppIcon.vue'
import NodeCategoryIcon from '@/components/NodeCategoryIcon.vue'
import type { BehaviorTreeFlowNodeData } from '@/utils/behaviorTreeToFlow'
import type { DisplayStatus } from '@/types/behaviorTreeEvents'

const props = withDefaults(
  defineProps<{
    data: BehaviorTreeFlowNodeData
    selected: boolean
    status?: DisplayStatus
    expanded?: boolean
    expandable?: boolean
  }>(),
  { status: 'UNOBSERVED', expanded: false, expandable: false },
)
defineEmits<{ toggleBranch: [] }>()

const description = computed(() => {
  const { data, status, expandable, expanded } = props
  const branch = expandable
    ? `\n${expanded ? 'Expanded' : 'Collapsed'} · Double-click or press Space to toggle`
    : ''
  return `${data.label}\n${data.category} · ${data.registeredType}\nUID ${data.idSource === 'uid' ? data._uid : 'not provided'}\n${status === 'UNOBSERVED' ? 'Not observed' : status}${branch}`
})
</script>

<template>
  <div
    class="behavior-tree-node node-status-surface"
    :class="{ selected }"
    :data-category="data.category"
    :data-status="status"
    :title="description"
  >
    <Handle type="target" :position="Position.Top" :connectable="false" />
    <span class="node-type-cell">
      <NodeCategoryIcon :category="data.category" />
    </span>
    <span class="node-status-cell" :title="status === 'UNOBSERVED' ? 'Not observed' : status">
      <AppIcon class="status-indicator" :name="status" />
      <span class="sr-only">{{ status === 'UNOBSERVED' ? 'Not observed' : status }}</span>
    </span>
    <strong class="node-name">{{ data.label }}</strong>
    <AppIcon v-if="expandable" class="branch-indicator" :name="expanded ? 'minus' : 'plus'" />
    <Handle type="source" :position="Position.Bottom" :connectable="false" />
  </div>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.behavior-tree-node {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--bt-edge);
  border-radius: 4px;
  color: var(--bt-text);
  text-align: left;
  cursor: pointer;
}
.node-type-cell,
.node-status-cell {
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--bt-border);
}
.node-type-cell {
  grid-row: 1;
  border-bottom: 1px solid var(--bt-border);
}
.node-status-cell {
  grid-row: 2;
}
.category-icon {
  width: 24px;
  height: 24px;
}
.node-name {
  grid-column: 2;
  grid-row: 1 / -1;
  align-self: center;
  min-width: 0;
  padding: 0 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
}
.behavior-tree-node:hover {
  outline: 1px solid var(--bt-border-hover);
  outline-offset: 2px;
}
.behavior-tree-node.selected {
  outline: 2px solid var(--bt-selection);
  outline-offset: 3px;
}
.status-indicator {
  width: 20px;
  height: 20px;
  color: var(--bt-status-text);
}
.branch-indicator {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 16px;
  height: 16px;
  color: var(--bt-text-secondary);
  pointer-events: none;
}
/* Handles must retain their geometry for edge measurement. */
:deep(.vue-flow__handle) {
  width: 6px;
  height: 6px;
  border: 1px solid transparent;
  opacity: 0;
  pointer-events: none;
}
</style>
