<script setup lang="ts">
import { NODE_CATEGORIES } from '@/types/behaviorTree'
import { EXECUTION_STATUSES } from '@/types/behaviorTreeEvents'
import NodeCategoryIcon from '@/components/NodeCategoryIcon.vue'
import AppIcon from '@/components/AppIcon.vue'

const statuses = [...EXECUTION_STATUSES, 'UNOBSERVED'] as const

const categories = NODE_CATEGORIES.filter((category) => category !== 'Unknown')
</script>

<template>
  <aside class="graph-legend" aria-label="Category and status legend">
    <section class="legend-column" aria-label="Category">
      <h3>Category</h3>
      <ul>
        <li v-for="category in categories" :key="category" :data-category="category">
          <NodeCategoryIcon :category="category" aria-hidden="true" />{{ category }}
        </li>
      </ul>
    </section>
    <section class="legend-column" aria-label="Status">
      <h3>Status</h3>
      <ul>
        <li v-for="status in statuses" :key="status">
          <span class="status-sample" :data-status="status" aria-hidden="true">
            <AppIcon :name="status" />
          </span>
          {{ status === 'UNOBSERVED' ? 'Not observed' : status }}
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.graph-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  align-self: flex-start;
  width: max-content;
  min-width: 160px;
  max-width: 100%;
  min-height: 40px;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px 10px;
  border: 1px solid var(--bt-help-border);
  border-radius: 2px;
  background: var(--bt-category-surface);
  color: var(--bt-help-text);
  font-size: 12px;
  line-height: 20px;
}
.legend-column {
  min-width: 0;
}
h3,
ul {
  margin: 0;
}
h3 {
  margin-bottom: 4px;
  color: var(--bt-text);
  font-size: 15px;
  font-weight: 600;
}
ul {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 17px;
}
.category-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}
.status-sample {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 18px;
  color: var(--bt-status-text);
  background: var(--bt-status-background);
  border: 1px solid var(--bt-status-border);
  border-radius: 4px;
}
.status-sample .app-icon {
  width: 14px;
  height: 14px;
}
</style>
