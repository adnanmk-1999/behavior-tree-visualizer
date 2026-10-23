<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import NodeCategoryIcon from '@/components/NodeCategoryIcon.vue'
import type { BehaviorTreeFlowNodeData } from '@/utils/behaviorTreeToFlow'
import type { DisplayStatus } from '@/types/behaviorTreeEvents'

withDefaults(defineProps<{ node: BehaviorTreeFlowNodeData; status?: DisplayStatus }>(), {
  status: 'UNOBSERVED',
})
defineEmits<{ close: []; openSubtree: [] }>()
</script>

<template>
  <aside class="node-inspector" aria-label="Node inspector">
    <header class="inspector-header">
      <h3><AppIcon name="inspect" /> Node inspector</h3>
      <button
        class="ui-button button-quiet icon-button"
        type="button"
        aria-label="Close node inspector"
        title="Close inspector"
        @click="$emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </header>
    <div class="inspector-content">
      <div class="node-summary">
        <span class="node-category" :data-category="node.category">
          <NodeCategoryIcon :category="node.category" aria-hidden="true" />{{ node.category }}
        </span>
        <strong>{{ node.name || node.label }}</strong>
        <span class="execution-status" :data-status="status">
          <AppIcon :name="status" />{{ status === 'UNOBSERVED' ? 'Not observed' : status }}
        </span>
        <button
          v-if="node.tag === 'SubTree'"
          type="button"
          class="ui-button"
          @click="$emit('openSubtree')"
        >
          <AppIcon name="tree" /> Open subtree separately
        </button>
      </div>
      <h4>Node identity</h4>
      <dl class="details">
        <dt>Name</dt>
        <dd>{{ node.name || node.label }}</dd>
        <dt>XML tag</dt>
        <dd>{{ node.tag }}</dd>
        <dt>Registered type</dt>
        <dd>{{ node.registeredType }}</dd>
        <dt>Category</dt>
        <dd>{{ node.category }}</dd>
        <dt>UID</dt>
        <dd>
          <code>{{ node.idSource === 'uid' ? node._uid : 'Not provided' }}</code>
        </dd>
        <template v-if="node.tag === 'SubTree'">
          <dt>Referenced tree</dt>
          <dd>{{ node.ID || 'Not provided' }}</dd>
          <dt>Full path</dt>
          <dd>
            <code>{{
              node.attributes._fullpath === ''
                ? '(empty)'
                : (node.attributes._fullpath ?? 'Not provided')
            }}</code>
          </dd>
        </template>
      </dl>
      <h4 class="attributes-heading">
        XML attributes <span>{{ Object.keys(node.attributes).length }}</span>
      </h4>
      <dl v-if="Object.keys(node.attributes).length" class="attributes">
        <div v-for="(value, key) in node.attributes" :key="key">
          <dt>
            <code>{{ key }}</code>
          </dt>
          <dd>
            <code>{{ value === '' ? '(empty)' : value }}</code>
          </dd>
        </div>
      </dl>
      <p v-else class="empty-attributes">This node has no XML attributes.</p>
    </div>
  </aside>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.node-inspector {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--bt-surface);
  color: var(--bt-text);
  font-size: 14px;
  scrollbar-color: var(--bt-track) var(--bt-surface);
  scrollbar-width: thin;
}
.inspector-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--bt-primary) 50%, transparent);
  background: color-mix(in srgb, var(--bt-primary) 3.5%, var(--bt-surface));
}
h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}
h3 .app-icon {
  color: var(--bt-primary);
}
.inspector-header .icon-button {
  color: var(--bt-primary);
  background: var(--bt-primary-soft);
}
.inspector-content {
  padding: 16px;
}
.node-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--bt-border);
}
.node-category {
  color: var(--bt-category-color);
  font-size: 0.875rem;
  font-weight: 500;
}
.node-category,
.execution-status {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
}
.node-category .category-icon,
.execution-status .app-icon {
  width: 16px;
  height: 16px;
}
.node-summary > strong {
  overflow-wrap: anywhere;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
}
h4 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
}
dl {
  margin: 0;
}
dt {
  color: var(--bt-text-secondary);
  font-size: 0.8125rem;
}
dd {
  min-width: 0;
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.details {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.75rem;
}
.attributes-heading {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
.attributes-heading > span {
  color: var(--bt-text-secondary);
  font-variant-numeric: tabular-nums;
}
.attributes > div {
  padding-block: 0.75rem;
  border-top: 1px solid var(--bt-border);
}
.attributes dt {
  color: var(--bt-text-secondary);
  font-weight: 500;
}
.attributes dt code {
  font-size: 0.8125rem;
}
.attributes dd {
  margin-top: 0.375rem;
}
code {
  font-size: 14px;
}
.empty-attributes {
  color: var(--bt-text-secondary);
  font-size: 0.875rem;
}
</style>
