<script setup lang="ts">
import { NODE_CATEGORIES } from '@/types/behaviorTree'
import { EXECUTION_STATUSES } from '@/types/behaviorTreeEvents'
import NodeCategoryIcon from '@/components/NodeCategoryIcon.vue'
import AppIcon from '@/components/AppIcon.vue'

const statuses = [...EXECUTION_STATUSES, 'UNOBSERVED'] as const

const categories = NODE_CATEGORIES.filter((category) => category !== 'Unknown')
</script>

<template>
  <aside class="graph-legend" aria-label="Graph legend">
    <h3>Legend</h3>
    <div class="legend-group">
      <h4>Category icons</h4>
      <ul>
        <li v-for="category in categories" :key="category" :data-category="category">
          <NodeCategoryIcon :category="category" aria-hidden="true" />{{ category }}
        </li>
      </ul>
    </div>
    <div class="legend-group">
      <h4>Recorded status · fill and symbol</h4>
      <ul>
        <li v-for="status in statuses" :key="status">
          <span class="status-sample node-status-surface" :data-status="status" aria-hidden="true"
            ><AppIcon :name="status"
          /></span>
          {{ status === 'UNOBSERVED' ? 'Not observed' : status }}
        </li>
      </ul>
    </div>
    <div class="legend-notes">
      <span><span class="path-sample" aria-hidden="true"></span>Path to a RUNNING node</span>
      <span><span class="selection-sample" aria-hidden="true"></span>Selected node</span>
      <p>
        Double-click a SubTree or Control with children to expand or collapse it. Plus shows hidden
        contents; minus hides them. Successful Controls collapse by default, except on a RUNNING
        path. Hover or inspect for exact status and UID. Not observed means no transition yet;
        hidden children retain their recorded statuses.
      </p>
    </div>
  </aside>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.graph-legend {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem 1.5rem;
  margin-top: 8px;
  padding: 4px 4px 8px;
  color: var(--bt-text);
  font-size: 0.8125rem;
  line-height: 1.5;
}
h3,
h4,
p,
ul {
  margin: 0;
}
h3 {
  padding-top: 0.125rem;
  font-size: 0.875rem;
  font-weight: 500;
}
h4 {
  margin-bottom: 0.5rem;
  color: var(--bt-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}
ul {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.875rem;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.category-icon {
  width: 20px;
  height: 20px;
}
.status-sample {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 18px;
  color: var(--bt-status-text);
  border: 1px solid var(--bt-border);
  border-radius: 4px;
}
.status-sample .app-icon {
  width: 14px;
  height: 14px;
}
.status-sample[data-status='RUNNING'] {
  box-shadow: inset 0 0 0 2px var(--bt-primary);
}
.legend-notes {
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  color: var(--bt-text-secondary);
  font-size: 0.75rem;
}
.legend-notes > span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.path-sample {
  width: 26px;
  border-top: 4px solid var(--bt-primary);
}
.selection-sample {
  width: 20px;
  height: 14px;
  border-radius: 2px;
  outline: 2px solid var(--bt-selection);
  outline-offset: 2px;
  margin-inline: 3px;
  background: var(--bt-surface);
}
.legend-notes p {
  flex-basis: 100%;
}
@container bt-viewer (max-width: 1150px) {
  .graph-legend {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .legend-group,
  .legend-notes {
    grid-column: 2;
  }
}
@container bt-viewer (max-width: 600px) {
  .graph-legend {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.25rem;
  }
  .legend-group,
  .legend-notes {
    grid-column: 1;
  }
}
</style>
