<script setup lang="ts">
const paths = {
  tree: 'M9 3h6v5H9z M3 16h6v5H3z M15 16h6v5h-6z M12 8v4M6 16v-4h12v4',
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  back: 'm10 5-7 7 7 7M3 12h18',
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  chevron: 'm9 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 8h8v8H8z',
  readable: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6M10 7v6M7 10h6',
  close: 'm6 6 12 12M6 18 18 6',
  folder: 'M3 7V4h6l2 3h10v13H3Z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7v.5',
  lock: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  file: 'M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5',
  route: 'M5 3v12a4 4 0 0 0 4 4h10M5 7h10a4 4 0 0 1 4 4v2M2 3h6M16 16l3 3-3 3',
  inspect: 'M8 3H4v18h4M16 3h4v18h-4M10 8l-3 4 3 4M14 8l3 4-3 4',
} as const

defineProps<{ name: keyof typeof paths }>()
</script>

<template>
  <svg
    class="app-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    :fill="name === 'play' ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
