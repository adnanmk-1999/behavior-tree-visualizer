<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@/components/AppIcon.vue'
import type { BehaviorTreeFlowNodeData } from '@/utils/behaviorTreeToFlow'
import type { DisplayStatus } from '@/types/behaviorTreeEvents'

withDefaults(
  defineProps<{ data: BehaviorTreeFlowNodeData; selected: boolean; status?: DisplayStatus }>(),
  {
    status: 'UNOBSERVED',
  },
)
defineEmits<{ inspect: [] }>()
</script>

<template>
  <div
    class="behavior-tree-node"
    :class="{ selected }"
    :data-category="data.category"
    :data-status="status"
  >
    <Handle type="target" :position="Position.Top" :connectable="false" />
    <div class="node-heading">
      <div class="category">
        <AppIcon v-if="data.tag === 'SubTree'" name="folder" />
        {{ data.category }}
      </div>
      <span class="execution-status" :data-status="status" title="Recorded execution status">
        {{ status === 'UNOBSERVED' ? 'Not observed' : status }}
      </span>
    </div>
    <strong class="node-name" :title="data.label">{{ data.label }}</strong>
    <span class="node-type" :title="data.registeredType">{{ data.registeredType }}</span>
    <div class="node-footer">
      <span class="uid" :title="data._uid">
        UID {{ data.idSource === 'uid' ? data._uid : 'not provided' }}
      </span>
      <template v-if="data.tag === 'SubTree'">
        <span class="open-subtree">Open subtree <AppIcon name="chevron" /></span>
        <button
          type="button"
          class="nodrag nopan"
          :aria-label="`Inspect ${data.label} reference`"
          title="Inspect reference attributes"
          @pointerdown.stop
          @keydown.stop
          @click.stop="$emit('inspect')"
        >
          Inspect
        </button>
      </template>
    </div>
    <Handle type="source" :position="Position.Bottom" :connectable="false" />
  </div>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.behavior-tree-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 7px 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 8px solid var(--category-color);
  border-radius: 12px;
  background: #fff;
  color: #182b45;
  text-align: left;
  cursor: pointer;
}

.category {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--category-color);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.category .app-icon,
.open-subtree .app-icon {
  width: 16px;
  height: 16px;
}

.node-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  height: 30px;
  flex-shrink: 0;
}

.node-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  height: 60px;
  flex-shrink: 0;
  font-size: 24px;
  line-height: 30px;
}

.node-type,
.uid {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.node-type {
  color: #475569;
  font-size: 18px;
  line-height: 24px;
}

.node-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  min-height: 36px;
  font-size: 16px;
  line-height: 24px;
  border-top: 1px solid #d7e0ea;
}

.uid {
  margin-right: auto;
}
.open-subtree {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

button {
  flex-shrink: 0;
  min-height: 36px;
  padding: 2px 6px;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  background: #f8fafc;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

button:hover {
  background: #eaf1ff;
  border-color: #245dcc;
}

.behavior-tree-node:hover {
  outline: 1px solid var(--category-color);
  outline-offset: 2px;
}
.behavior-tree-node[data-status='RUNNING'] {
  background: #fffbeb;
  box-shadow: inset 0 0 0 2px #a16207;
}
.behavior-tree-node[data-status='RUNNING'] .node-type {
  color: #713f12;
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
