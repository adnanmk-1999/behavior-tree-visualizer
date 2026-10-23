<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
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
        <span class="node-category" :data-category="node.category">{{ node.category }}</span>
        <strong>{{ node.name || node.label }}</strong>
        <div class="inspector-status">
          <span class="execution-status" :data-status="status">{{
            status === 'UNOBSERVED' ? 'Not observed' : status
          }}</span>
          <span>at playback position</span>
        </div>
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
  background: var(--surface);
  color: var(--ink);
  font-size: 1rem;
  scrollbar-color: #a4b2c5 var(--surface-soft);
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
  min-height: 60px;
  padding: 0.5rem 0.75rem 0.5rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
h3 .app-icon {
  color: var(--muted);
}
.inspector-content {
  padding: 1.25rem;
}
.node-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--line);
}
.node-category {
  color: var(--category-color);
  font-size: 0.875rem;
  font-weight: 650;
}
.node-summary > strong {
  overflow-wrap: anywhere;
  font-size: 1.25rem;
  font-weight: 650;
  line-height: 1.4;
}
.inspector-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.75rem;
}
h4 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 650;
}
dl {
  margin: 0;
}
dt {
  color: var(--muted);
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
  margin-top: 1.75rem;
}
.attributes-heading > span {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.attributes > div {
  padding-block: 0.75rem;
  border-top: 1px solid var(--line);
}
.attributes dt {
  color: #3d5270;
  font-weight: 600;
}
.attributes dt code {
  font-size: 0.8125rem;
}
.attributes dd {
  margin-top: 0.375rem;
}
code {
  font-size: 1rem;
}
.empty-attributes {
  color: var(--muted);
  font-size: 0.875rem;
}
</style>
