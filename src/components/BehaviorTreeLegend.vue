<script setup lang="ts">
import { NODE_CATEGORIES } from '@/types/behaviorTree'
import { EXECUTION_STATUSES } from '@/types/behaviorTreeEvents'
</script>

<template>
  <aside class="graph-legend" aria-label="Graph legend">
    <h3>Legend</h3>
    <div class="legend-group">
      <h4>Node category · border</h4>
      <ul>
        <li v-for="category in NODE_CATEGORIES" :key="category" :data-category="category">
          <span class="category-sample" aria-hidden="true"></span>
          {{ category }}
        </li>
      </ul>
    </div>
    <div class="legend-group">
      <h4>Execution status · badge</h4>
      <ul>
        <li v-for="status in [...EXECUTION_STATUSES, 'UNOBSERVED']" :key="status">
          <span class="execution-status" :data-status="status">
            {{ status === 'UNOBSERVED' ? 'Not observed' : status }}
          </span>
        </li>
      </ul>
    </div>
    <ul>
      <li><span class="path-sample" aria-hidden="true"></span>Path to a RUNNING node</li>
      <li><span class="selection-sample" aria-hidden="true"></span>Selected node</li>
    </ul>
    <p>
      Gold connections trace paths to RUNNING nodes; ancestors keep their recorded status. Not
      observed means no recorded transition yet at the current playback time.
    </p>
  </aside>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.graph-legend {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #172033;
  font-size: 1rem;
  line-height: 1.5;
}

h3,
h4,
p,
ul {
  margin: 0;
}

h3 {
  font-size: 1.125rem;
}

h4 {
  font-size: 1rem;
}

.legend-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-sample,
.selection-sample {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2rem;
  border: 8px solid var(--category-color);
  border-radius: 4px;
  background: #fff;
}

.selection-sample {
  border: 1px solid #cbd5e1;
  outline: 2px solid #172033;
  outline-offset: 3px;
  margin: 5px;
}

.path-sample {
  width: 2.5rem;
  border-top: 4px solid #a16207;
}
</style>
