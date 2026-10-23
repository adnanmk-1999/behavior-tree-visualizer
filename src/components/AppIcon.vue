<script setup lang="ts">
const paths = {
  // Pictogrammers mdi-sitemap-outline; license and source in public/licenses/material-design-icons.txt.
  tree: 'M21 16V13C21 11.89 20.11 11 19 11H13V8H15V2H9V8H11V11H5C3.89 11 3 11.89 3 13V16H1V22H7V16H5V13H11V16H9V22H15V16H13V13H19V16H17V22H23V16H21M11 4H13V6H11V4M5 20H3V18H5V20M13 20H11V18H13V20M21 20H19V18H21V20Z',
  control: 'M12 3v6M12 9l-7 7M12 9l7 7M5 11v5h5M14 16h5v-5',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-7Z',
  condition: 'm12 2 10 10-10 10L2 12Z M8 12l3 3 5-5',
  decorator: 'M5 8a8 8 0 1 1-1 8M5 3v5h5M9 10h6v6H9Z',
  unknown: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01',
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  SUCCESS: 'm5 12 4 4L19 6',
  FAILURE: 'm6 6 12 12M18 6 6 18',
  RUNNING: 'm8 5 11 7-11 7Z',
  IDLE: 'M6 6h12v12H6Z',
  SKIPPED: 'm5 5 10 7-10 7ZM19 5v14',
  UNOBSERVED: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  back: 'm10 5-7 7 7 7M3 12h18',
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  chevron: 'm9 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  'collapse-tree': 'M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4M9 9h6v6H9Z',
  'running-tree': 'M5 3v18M5 7h7M5 17h7M15 3l6 4-6 4ZM15 14h6v6h-6Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M8 8h8v8H8z',
  readable: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6M10 7v6M7 10h6',
  close: 'm6 6 12 12M6 18 18 6',
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
    :fill="name === 'play' || name === 'tree' ? 'currentColor' : 'none'"
    :stroke="name === 'tree' ? 'none' : 'currentColor'"
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
