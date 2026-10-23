<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { NodeCategory } from '@/types/behaviorTree'

defineProps<{ category: NodeCategory }>()

const icons = {
  Control: 'control',
  Action: 'bolt',
  Condition: 'condition',
  Decorator: 'decorator',
  SubTree: 'tree',
  Unknown: 'unknown',
} as const
</script>

<template>
  <span class="category-icon" role="img" :aria-label="category" :title="category">
    <AppIcon :name="icons[category]" />
  </span>
</template>

<style scoped>
.category-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--category-color);
}
.app-icon {
  width: 100%;
  height: 100%;
}
</style>
