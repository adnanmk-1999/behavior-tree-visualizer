<script setup lang="ts">
import { NODE_CATEGORIES } from '@/types/behaviorTree'
import { EXECUTION_STATUSES } from '@/types/behaviorTreeEvents'
</script>

<template>
  <aside class="graph-legend" aria-label="Graph legend">
    <h3>Legend</h3>
    <div class="legend-group">
      <h4>Category borders</h4>
      <ul>
        <li v-for="category in NODE_CATEGORIES" :key="category" :data-category="category">
          <span class="category-sample" aria-hidden="true"></span>{{ category }}
        </li>
      </ul>
    </div>
    <div class="legend-group">
      <h4>Recorded status</h4>
      <ul>
        <li v-for="status in [...EXECUTION_STATUSES, 'UNOBSERVED']" :key="status">
          <span class="execution-status" :data-status="status">{{
            status === 'UNOBSERVED' ? 'Not observed' : status
          }}</span>
        </li>
      </ul>
    </div>
    <div class="legend-notes">
      <span><span class="path-sample" aria-hidden="true"></span>Path to a RUNNING node</span>
      <span><span class="selection-sample" aria-hidden="true"></span>Selected node</span>
      <p>
        Ancestors keep their own recorded status. Not observed means no transition yet at this
        playback time.
      </p>
    </div>
  </aside>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.graph-legend {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem 1.5rem;
  margin-top: 0.875rem;
  padding: 0.25rem 0.25rem 0.75rem;
  color: var(--ink);
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
  font-weight: 650;
}
h4 {
  margin-bottom: 0.5rem;
  color: var(--muted);
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
.category-sample {
  flex-shrink: 0;
  width: 26px;
  height: 22px;
  border: 6px solid var(--category-color);
  border-radius: 4px;
  background: var(--surface);
}
.execution-status {
  font-size: 0.75rem;
  line-height: 1.5;
  padding: 0.125rem 0.375rem;
}
.legend-notes {
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  color: var(--muted);
  font-size: 0.75rem;
}
.legend-notes > span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.path-sample {
  width: 26px;
  border-top: 4px solid #a16207;
}
.selection-sample {
  width: 20px;
  height: 14px;
  border: 1px solid var(--line);
  border-radius: 2px;
  outline: 2px solid #172033;
  outline-offset: 2px;
  margin-inline: 3px;
  background: var(--surface);
}
.legend-notes p {
  flex-basis: 100%;
}
@media (max-width: 1150px) {
  .graph-legend {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .legend-group,
  .legend-notes {
    grid-column: 2;
  }
}
@media (max-width: 600px) {
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
