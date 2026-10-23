<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import NodeCategoryIcon from '@/components/NodeCategoryIcon.vue'

const id = useId()
const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const popup = ref<HTMLElement | null>(null)

function positionPopup() {
  if (!open.value || !button.value || !popup.value) return
  const viewport = window.visualViewport
  const left = viewport?.offsetLeft ?? 0
  const top = viewport?.offsetTop ?? 0
  const width = viewport?.width ?? document.documentElement.clientWidth
  const height = viewport?.height ?? document.documentElement.clientHeight
  const bounds = button.value.getBoundingClientRect()
  const element = popup.value
  element.style.minWidth = `${Math.min(210, width - 16)}px`
  element.style.maxWidth = `${Math.min(280, width - 16)}px`
  element.style.maxHeight = `${height - 16}px`
  const below = Math.max(0, top + height - bounds.bottom - 8)
  const above = Math.max(0, bounds.top - top - 8)
  const flip = element.getBoundingClientRect().height > below && above > below
  element.dataset.placement = flip ? 'above' : 'below'
  element.style.maxHeight = `${flip ? above : below}px`
  const size = element.getBoundingClientRect()
  element.style.left = `${Math.max(left + 8, Math.min(bounds.right - size.width, left + width - size.width - 8))}px`
  element.style.top = `${Math.max(top + 8, Math.min(flip ? bounds.top - size.height : bounds.bottom, top + height - size.height - 8))}px`
}

watch(
  open,
  (visible) => {
    if (visible) {
      popup.value?.showPopover()
      positionPopup()
    } else {
      popup.value?.hidePopover()
    }
  },
  { flush: 'post' },
)

function leave() {
  if (!root.value?.contains(document.activeElement)) open.value = false
}

function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null) && !root.value?.matches(':hover'))
    open.value = false
}

function dismiss(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (root.value?.contains(document.activeElement)) button.value?.focus()
  open.value = false
}

function onOutsidePointer(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

onMounted(() => {
  // Other viewport controls stop Escape during bubbling.
  document.addEventListener('keydown', dismiss, true)
  document.addEventListener('pointerdown', onOutsidePointer)
  window.addEventListener('resize', positionPopup)
  window.addEventListener('scroll', positionPopup, true)
  window.visualViewport?.addEventListener('resize', positionPopup)
  window.visualViewport?.addEventListener('scroll', positionPopup)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', dismiss, true)
  document.removeEventListener('pointerdown', onOutsidePointer)
  window.removeEventListener('resize', positionPopup)
  window.removeEventListener('scroll', positionPopup, true)
  window.visualViewport?.removeEventListener('resize', positionPopup)
  window.visualViewport?.removeEventListener('scroll', positionPopup)
})
</script>

<template>
  <div
    ref="root"
    class="viewport-help"
    @pointerenter="open = $event.pointerType === 'touch' ? open : true"
    @pointerleave="leave"
    @focusout="onFocusOut"
    @keydown.space.stop
    @keydown.esc.stop.prevent="dismiss"
  >
    <button
      ref="button"
      class="help-trigger"
      type="button"
      aria-label="Node layout and shortcuts"
      :aria-expanded="open"
      :aria-controls="`${id}-help`"
      :aria-describedby="open ? `${id}-help` : undefined"
      @focus="open = button?.matches(':focus-visible') ? true : open"
      @click="open = !open"
    >
      <AppIcon name="info" />
    </button>
    <div ref="popup" :id="`${id}-help`" class="help-popover" popover="manual" role="tooltip">
      <div class="help-content">
        <h3>Node layout example</h3>
        <figure class="node-example">
          <div
            class="example-node node-status-surface"
            data-category="Control"
            data-status="RUNNING"
          >
            <span class="example-type">
              <NodeCategoryIcon category="Control" aria-hidden="true" /> Node type
            </span>
            <span class="example-status"> <AppIcon name="RUNNING" /> Node status </span>
            <strong class="example-name">Node name</strong>
          </div>
          <figcaption>
            Type shows the category; status shows the recorded execution state.
          </figcaption>
        </figure>
        <h3>Keyboard shortcuts</h3>
        <dl>
          <div class="help-row">
            <dt><kbd>↑ ↓ ← →</kbd></dt>
            <dd>Navigate nodes</dd>
          </div>
          <div class="help-row">
            <dt><kbd>Enter</kbd></dt>
            <dd>Toggle node inspector</dd>
          </div>
          <div class="help-row">
            <dt><kbd>Space</kbd></dt>
            <dd>Expand/collapse branch</dd>
          </div>
          <div class="help-row">
            <dt><kbd>W A S D</kbd></dt>
            <dd>Pan up/left/down/right</dd>
          </div>
          <div class="help-row">
            <dt><kbd>+ / −</kbd></dt>
            <dd>Zoom in/out</dd>
          </div>
          <div class="help-row">
            <dt><kbd>Esc</kbd></dt>
            <dd>Close inspector / help</dd>
          </div>
        </dl>
        <h3>Mouse shortcuts</h3>
        <dl>
          <div class="help-row">
            <dt>Click</dt>
            <dd>Inspect a node</dd>
          </div>
          <div class="help-row">
            <dt>Double-click</dt>
            <dd>Expand/collapse branch</dd>
          </div>
          <div class="help-row">
            <dt>Drag</dt>
            <dd>Pan the canvas</dd>
          </div>
          <div class="help-row">
            <dt>Scroll</dt>
            <dd>Zoom in/out</dd>
          </div>
        </dl>
        <p>
          Keyboard shortcuts work while the canvas or a node has focus. Branches include SubTrees
          and Controls with children.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped src="../assets/behaviorTreeAppearance.css"></style>

<style scoped>
.viewport-help {
  color: var(--bt-text);
  font-size: 12px;
  line-height: 16px;
}
.help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
}
.help-trigger:hover,
.help-trigger[aria-expanded='true'] {
  background: var(--bt-surface-hover);
}
.help-trigger .app-icon {
  width: 18px;
  height: 18px;
}
.help-popover {
  position: fixed;
  inset: auto;
  width: max-content;
  min-width: min(210px, calc(100vw - 16px));
  max-width: min(280px, calc(100vw - 16px));
  margin: 0;
  padding: 4px 0 0;
  border: 0;
  background: transparent;
  color: var(--bt-help-text);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.35;
  pointer-events: auto;
}
.help-popover:popover-open {
  display: flex;
  flex-direction: column;
}
.help-popover[data-placement='above'] {
  padding: 0 0 4px;
}
.help-popover::backdrop {
  background: transparent;
  pointer-events: none;
}
.help-content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 8px 10px;
  border: 1px solid var(--bt-help-border);
  border-radius: 2px;
  background: var(--bt-help-background);
}
.node-example {
  margin: 0 0 10px;
}
.example-node {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  grid-template-rows: repeat(2, minmax(28px, auto));
  border: 1px solid var(--bt-status-border);
  border-radius: 4px;
  color: var(--bt-text);
}
.example-type,
.example-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-right: 1px solid var(--bt-border);
}
.example-type {
  grid-column: 1;
  grid-row: 1;
  border-bottom: 1px solid var(--bt-border);
}
.example-status {
  grid-column: 1;
  grid-row: 2;
}
.example-type .category-icon,
.example-status .app-icon {
  width: 16px;
  height: 16px;
}
.example-status .app-icon {
  color: var(--bt-status-text);
}
.example-name {
  grid-column: 2;
  grid-row: 1 / -1;
  align-self: center;
  padding: 8px;
  font-size: 14px;
}
figcaption {
  margin-top: 6px;
}
h3,
dl,
dd {
  margin: 0;
}
h3 {
  margin-bottom: 6px;
  color: var(--bt-text);
  font-size: inherit;
  font-weight: 600;
}
dl + h3 {
  margin-top: 10px;
}
.help-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  column-gap: 12px;
  min-height: 17px;
  align-items: center;
}
kbd {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--bt-text);
  font-family: var(--bt-font-mono);
  font-size: inherit;
  font-weight: 600;
}
p {
  margin: 8px 0 0;
}
</style>
