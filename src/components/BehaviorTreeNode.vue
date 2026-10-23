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
  const { data, status } = props
  return `${data.label}\n${data.category} · ${data.registeredType}\nUID ${data.idSource === 'uid' ? data._uid : 'not provided'}\n${status === 'UNOBSERVED' ? 'Not observed' : status}`
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
    <NodeCategoryIcon :category="data.category" />
    <strong class="node-name">{{ data.label }}</strong>
    <span class="sr-only">{{ status === 'UNOBSERVED' ? 'Not observed' : status }}</span>
    <button
      v-if="data.collapsible"
      type="button"
      class="nodrag nopan"
      :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${data.label} ${data.tag === 'SubTree' ? 'subtree' : 'children'}`"
      :aria-expanded="expanded"
      :disabled="!expandable"
      :title="
        expandable
          ? `${expanded ? 'Collapse' : 'Expand'} ${data.tag === 'SubTree' ? 'subtree' : 'children'} here`
          : 'No resolvable subtree contents'
      "
      @pointerdown.stop
      @keydown.stop
      @click.stop="$event.detail < 2 && $emit('toggleBranch')"
      @dblclick.stop
    >
      <AppIcon :name="expanded ? 'minus' : 'plus'" />
    </button>
    <Handle type="source" :position="Position.Bottom" :connectable="false" />
  </div>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.behavior-tree-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 15px 17px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #a4b2c5;
  border-radius: 12px;
  color: #182b45;
  text-align: left;
  cursor: pointer;
}
.category-icon {
  width: 28px;
  height: 28px;
}
.node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #eaf1ff;
  border-color: #245dcc;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.behavior-tree-node:hover {
  outline: 1px solid #91a4bd;
  outline-offset: 2px;
}
.behavior-tree-node[data-status='RUNNING'] {
  box-shadow: inset 0 0 0 2px #a16207;
}
.behavior-tree-node.selected {
  outline: 2px solid #172033;
  outline-offset: 3px;
}
/* Handles must retain their geometry for edge measurement. */
:deep(.vue-flow__handle) {
  opacity: 0;
  pointer-events: none;
}
</style>
