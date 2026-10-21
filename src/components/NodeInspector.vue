<script setup lang="ts">
import type { BehaviorTreeFlowNodeData } from '@/utils/behaviorTreeToFlow'
import type { DisplayStatus } from '@/types/behaviorTreeEvents'

withDefaults(defineProps<{ node: BehaviorTreeFlowNodeData; status?: DisplayStatus }>(), {
  status: 'UNOBSERVED',
})
defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="node-inspector" aria-label="Node inspector">
    <header>
      <h3>Node details</h3>
      <button type="button" @click="$emit('close')">Close</button>
    </header>
    <div class="inspector-content">
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
        <dd>{{ node.idSource === 'uid' ? node._uid : 'Not provided' }}</dd>
        <dt>Execution status</dt>
        <dd>{{ status === 'UNOBSERVED' ? 'Not observed' : status }}</dd>
        <template v-if="node.tag === 'SubTree'">
          <dt>Referenced tree</dt>
          <dd>{{ node.ID || 'Not provided' }}</dd>
          <dt>Full path</dt>
          <dd>
            {{
              node.attributes._fullpath === ''
                ? '(empty)'
                : (node.attributes._fullpath ?? 'Not provided')
            }}
          </dd>
        </template>
      </dl>
      <h4>XML attributes</h4>
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
      <p v-else>No XML attributes.</p>
    </div>
  </aside>
</template>

<style scoped>
.node-inspector {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid #94a3b8;
  background: #fff;
  color: #172033;
  font-size: 18px;
}

header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

h3,
h4 {
  margin: 0;
  font-size: 1.125rem;
}
h4 {
  margin-top: 1.5rem;
}
button {
  padding: 0.5rem 0.75rem;
  font: inherit;
}
.inspector-content {
  padding: 1rem;
}
dl {
  margin: 0;
}
dt {
  font-weight: 600;
}
dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.details {
  display: grid;
  grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
  gap: 0.5rem 0.75rem;
}

.attributes > div {
  padding-block: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.attributes dd {
  margin-top: 0.25rem;
}
code {
  font-size: 1rem;
}
</style>
