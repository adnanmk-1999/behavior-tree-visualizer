<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, useId, watch } from 'vue'
import { VueFlow, useVueFlow, type NodeMouseEvent } from '@vue-flow/core'
import type {
  BehaviorTreeDefinition,
  BehaviorTreeNode,
  NodeCategoryMap,
} from '../types/behaviorTree'
import BehaviorTreeNodeView from '@/components/BehaviorTreeNode.vue'
import NodeInspector from '@/components/NodeInspector.vue'
import AppIcon from '@/components/AppIcon.vue'
import ViewportOverlay from '@/components/ViewportOverlay.vue'
import { NODE_MAX_WIDTH } from '@/utils/layoutTree'
import { getNodeStatus } from '@/utils/playbackState'
import { useBehaviorTreeView } from '@/composables/useBehaviorTreeView'
import type { SubtreeVisibility } from '@/utils/expandBehaviorTreeFlow'
import type { NodeStatusMap } from '../types/behaviorTreeEvents'

const props = withDefaults(
  defineProps<{
    tree: BehaviorTreeDefinition
    definitions: readonly BehaviorTreeDefinition[]
    nodeModels?: NodeCategoryMap
    statuses?: NodeStatusMap
  }>(),
  { statuses: () => new Map() },
)
const emit = defineEmits<{ openSubtree: [reference: Omit<BehaviorTreeNode, 'children'>] }>()
const {
  fitView,
  zoomIn,
  zoomOut,
  setViewport,
  dimensions,
  viewport,
  onNodesInitialized,
  findNode,
  getSelectedNodes,
  addSelectedNodes,
  removeSelectedNodes,
} = useVueFlow()
const selectedNodeId = ref<string | null>(null)
let inspectionTimer: ReturnType<typeof setTimeout> | undefined
let inspectorBeforeClick: string | null = null
const canvas = ref<HTMLElement | null>(null)
const focusedNodeId = ref<string | null>(null)
const keyboardHelpId = useId()
const showSubtreeBoundaries = ref(true)
const {
  graph,
  runningPathOnly,
  subtrees,
  runningPathEdges,
  branchBoundaries,
  showControlBoundaries,
  expandedBranchIds,
  expandableBranchIds,
  hasSubtreeOverrides,
  toggleBranch,
  setSubtreeMode,
} = useBehaviorTreeView(
  toRef(props, 'tree'),
  toRef(props, 'definitions'),
  toRef(props, 'nodeModels'),
  toRef(props, 'statuses'),
)
const visibleBoundaries = computed(() =>
  branchBoundaries.value.filter((boundary) =>
    boundary.kind === 'SubTree' ? showSubtreeBoundaries.value : showControlBoundaries.value,
  ),
)
let pendingView = true

function applyPendingView() {
  if (!pendingView || !graph.value.nodes.length) return
  if (
    graph.value.nodes.some((node) => {
      const rendered = findNode(node.id)
      return !rendered || !rendered.dimensions.width || !rendered.dimensions.height
    })
  )
    return
  pendingView = false
  return fitTree()
}

async function changeView(change: () => void) {
  cancelPendingInspection()
  pendingView = true
  change()
  await nextTick()
  await applyPendingView()
}

function setSubtrees(mode: SubtreeVisibility) {
  if (subtrees.value === mode && !hasSubtreeOverrides.value) return
  return changeView(() => {
    setSubtreeMode(mode)
  })
}

const selectedNode = computed(
  () => graph.value.nodes.find((node) => node.id === selectedNodeId.value)?.data,
)

const keyboardNodeId = computed(
  () =>
    graph.value.nodes.find((node) => node.id === focusedNodeId.value)?.id ??
    graph.value.nodes[0]?.id,
)
const displayNodes = computed(() =>
  graph.value.nodes.map((node) => ({
    ...node,
    domAttributes: {
      ...node.domAttributes,
      tabindex: node.id === keyboardNodeId.value ? 0 : -1,
      'aria-describedby': keyboardHelpId,
    },
  })),
)

const displayEdges = computed(() =>
  graph.value.edges.map((edge) => ({
    ...edge,
    type: 'step',
    // Vue Flow evaluates this callback reactively without rebuilding edge geometry.
    class: () => (runningPathEdges.value.has(edge.id) ? 'running-path' : ''),
  })),
)

function cancelPendingInspection() {
  clearTimeout(inspectionTimer)
  inspectionTimer = undefined
}

function closeInspector() {
  cancelPendingInspection()
  selectedNodeId.value = null
  removeSelectedNodes(getSelectedNodes.value)
}

function dismissInspector(event: KeyboardEvent) {
  cancelPendingInspection()
  if (event.defaultPrevented || selectedNodeId.value === null) return
  const id = selectedNodeId.value
  const returnFocus = event.target instanceof Element && event.target.closest('.node-inspector')
  event.preventDefault()
  event.stopPropagation()
  closeInspector()
  if (returnFocus) void nextTick(() => focusNode(id))
}

function inspectNode(id: string) {
  cancelPendingInspection()
  if (!graph.value.nodes.some((node) => node.id === id)) return
  const node = findNode(id)
  if (!node) return
  removeSelectedNodes(getSelectedNodes.value)
  addSelectedNodes([node])
  selectedNodeId.value = id
}

function fitTree() {
  return fitView({
    nodes: graph.value.nodes.map((node) => node.id),
    padding: 0.15,
    minZoom: 0.05,
    maxZoom: 1,
  })
}

function readableView() {
  const root = graph.value.nodes[0]
  if (!root) return
  const width = findNode(root.id)?.dimensions.width || NODE_MAX_WIDTH
  const zoom = Math.min(1, Math.max(0.05, (dimensions.value.width - 32) / width))
  return setViewport({
    x: dimensions.value.width / 2 - (root.position.x + width / 2) * zoom,
    y: 24 - root.position.y * zoom,
    zoom,
  })
}

function onGraphFocus(event: FocusEvent) {
  if (!(event.target instanceof Element) || !(event.currentTarget instanceof Element)) return
  const node = event.target.closest('.vue-flow__node')
  if (!node) return
  focusedNodeId.value = node.getAttribute('data-id')
  if (!event.target.matches(':focus-visible')) return
  const bounds = node.getBoundingClientRect()
  const container = event.currentTarget.getBoundingClientRect()
  if (
    bounds.left < container.left ||
    bounds.right > container.right ||
    bounds.top < container.top ||
    bounds.bottom > container.bottom
  ) {
    void fitView({
      nodes: [node.getAttribute('data-id')!],
      padding: 0.15,
      maxZoom: viewport.value.zoom,
    })
  }
}

function focusNode(id: string | undefined) {
  if (id === undefined) return
  canvas.value
    ?.querySelector<HTMLElement>(`.vue-flow__node[data-id="${CSS.escape(id)}"]`)
    ?.focus({ preventScroll: true })
}

function navigateNode(id: string, key: string) {
  const { nodes, edges } = graph.value
  const parents = new Map(edges.map((edge) => [edge.target, edge.source]))
  if (key === 'ArrowUp') {
    focusNode(parents.get(id))
  } else if (key === 'ArrowDown') {
    focusNode(edges.find((edge) => edge.source === id)?.target)
  } else {
    const siblings = nodes.filter((node) => parents.get(node.id) === parents.get(id))
    const index = siblings.findIndex((node) => node.id === id)
    focusNode(siblings[index + (key === 'ArrowRight' ? 1 : -1)]?.id)
  }
}

function onNodeClick({ event, node }: NodeMouseEvent) {
  cancelPendingInspection()
  if (event.detail > 1) return
  inspectorBeforeClick = selectedNodeId.value
  if (event.detail === 0 || !expandableBranchIds.value.has(node.id)) {
    inspectNode(node.id)
    return
  }
  // A double-click must get a chance to cancel inspection before the sidebar changes layout.
  inspectionTimer = setTimeout(() => inspectNode(node.id), 500)
}

function toggleInlineBranch(id: string) {
  cancelPendingInspection()
  if (!expandableBranchIds.value.has(id)) return
  pendingView = false
  toggleBranch(id)
}

function onNodeDoubleClick({ node }: NodeMouseEvent) {
  cancelPendingInspection()
  if (!expandableBranchIds.value.has(node.id)) return
  // Restore the previous inspector if a slower native double-click outlasted the delay.
  if (selectedNodeId.value === node.id && inspectorBeforeClick !== node.id) {
    closeInspector()
    if (inspectorBeforeClick !== null) inspectNode(inspectorBeforeClick)
  }
  toggleInlineBranch(node.id)
}

function onPaneClick() {
  closeInspector()
  canvas.value?.focus({ preventScroll: true })
}

function onGraphKeydown(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    !(event.target instanceof Element)
  )
    return
  const node = event.target.closest('.vue-flow__node')
  if (!node && event.target !== canvas.value) return
  const id = node?.getAttribute('data-id') ?? keyboardNodeId.value
  const key = event.key
  if (event.target.closest('button') && (key === 'Enter' || key === ' ')) return
  const panOffsets: Record<string, { x: number; y: number }> = {
    w: { x: 0, y: 64 },
    a: { x: 64, y: 0 },
    s: { x: 0, y: -64 },
    d: { x: -64, y: 0 },
  }
  const pan = panOffsets[key.toLowerCase()]
  const arrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
  if (!arrow && !pan && !['Enter', ' ', '+', '=', '-'].includes(key)) return
  cancelPendingInspection()
  event.preventDefault()
  event.stopPropagation()
  if (arrow && id !== undefined) {
    navigateNode(id, key)
  } else if (key === 'Enter' && id !== undefined && !event.repeat) {
    if (selectedNodeId.value === id) closeInspector()
    else inspectNode(id)
  } else if (key === ' ' && id !== undefined && !event.repeat) {
    toggleInlineBranch(id)
  } else if (pan) {
    void setViewport({
      ...viewport.value,
      x: viewport.value.x + pan.x,
      y: viewport.value.y + pan.y,
    })
  } else if (key === '+' || key === '=') {
    void zoomIn()
  } else if (key === '-') {
    void zoomOut()
  }
}

onNodesInitialized(applyPendingView)
onBeforeUnmount(cancelPendingInspection)
watch(() => props.tree, cancelPendingInspection)
watch(graph, async (_, __, onCleanup) => {
  const restoreFocus =
    document.activeElement?.matches('.vue-flow__node') &&
    canvas.value?.contains(document.activeElement) &&
    focusedNodeId.value !== null &&
    !graph.value.nodes.some((node) => node.id === focusedNodeId.value)
  if (selectedNodeId.value && !graph.value.nodes.some((node) => node.id === selectedNodeId.value))
    closeInspector()
  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })
  await nextTick()
  if (!cancelled) {
    if (restoreFocus) {
      if (keyboardNodeId.value !== undefined) focusNode(keyboardNodeId.value)
      else canvas.value?.focus({ preventScroll: true })
    }
    await applyPendingView()
  }
})
</script>

<template>
  <div class="bt-viewer bt-theme" @keydown.esc.capture="dismissInspector">
    <p v-if="graph.error" class="notice notice-error" role="alert">{{ graph.error }}</p>
    <template v-else>
      <ul v-if="graph.warnings.length" class="notice" role="status">
        <li v-for="warning in graph.warnings" :key="warning">{{ warning }}</li>
      </ul>
      <section class="graph-panel" :aria-label="`${tree.ID} behavior tree diagram`">
        <div class="viewer-workspace">
          <div class="graph-container">
            <div
              ref="canvas"
              class="graph-canvas"
              tabindex="-1"
              role="group"
              aria-label="Behavior tree canvas"
              :aria-describedby="keyboardHelpId"
              @keydown.capture="onGraphKeydown"
              @focusin="onGraphFocus"
            >
              <span :id="keyboardHelpId" class="sr-only">
                Arrow keys navigate nodes: up to parent, down to first child, left and right between
                siblings. Enter toggles the node inspector; Escape closes it. Space expands or
                collapses its branch. W, A, S, D pan the view; plus and minus zoom. Tab leaves the
                graph for other controls.
              </span>
              <div v-if="!graph.nodes.length" class="empty-view" role="status">
                <AppIcon name="route" />
                <strong>{{
                  runningPathOnly ? 'No running path at this moment' : 'No execution nodes'
                }}</strong>
                <p>
                  {{
                    runningPathOnly
                      ? 'Play or seek to another time, or turn off Running path only to explore the whole tree.'
                      : 'This definition does not contain executable nodes.'
                  }}
                </p>
              </div>
              <VueFlow
                :nodes="displayNodes"
                :edges="displayEdges"
                :nodes-draggable="false"
                :nodes-connectable="false"
                :edges-updatable="false"
                :edges-focusable="false"
                :connect-on-click="false"
                :delete-key-code="null"
                :pan-activation-key-code="null"
                :elements-selectable="true"
                :min-zoom="0.05"
                :max-zoom="2"
                :zoom-on-double-click="false"
                @node-click="onNodeClick"
                @node-double-click="onNodeDoubleClick"
                @pane-click="onPaneClick"
              >
                <template #zoom-pane>
                  <svg
                    v-if="showSubtreeBoundaries || showControlBoundaries"
                    class="branch-boundaries"
                    aria-hidden="true"
                  >
                    <g
                      v-for="boundary in visibleBoundaries"
                      :key="boundary.id"
                      :data-subtree-id="boundary.kind === 'SubTree' ? boundary.id : undefined"
                      :data-control-id="boundary.kind === 'Control' ? boundary.id : undefined"
                      :style="{ '--bt-subtree-accent': `var(--bt-subtree-tone-${boundary.tone})` }"
                    >
                      <path class="branch-boundary" :d="boundary.path" />
                    </g>
                  </svg>
                </template>
                <template #node-behavior-tree="nodeProps">
                  <BehaviorTreeNodeView
                    :data="nodeProps.data"
                    :selected="nodeProps.selected"
                    :status="getNodeStatus(props.statuses, nodeProps.data._uid)"
                    :expanded="expandedBranchIds.has(nodeProps.id)"
                    :expandable="expandableBranchIds.has(nodeProps.id)"
                    @toggle-branch="toggleInlineBranch(nodeProps.id)"
                  />
                </template>
              </VueFlow>
              <ViewportOverlay
                :node-count="graph.nodes.length"
                :edge-count="graph.edges.length"
                :zoom="viewport.zoom"
                :running-path-only="runningPathOnly"
                :subtrees="subtrees"
                :has-subtree-overrides="hasSubtreeOverrides"
                :show-subtree-boundaries="showSubtreeBoundaries"
                :show-control-boundaries="showControlBoundaries"
                @zoom-in="zoomIn()"
                @zoom-out="zoomOut()"
                @readable-view="readableView()"
                @fit-tree="fitTree()"
                @toggle-running-path="
                  changeView(() => {
                    runningPathOnly = !runningPathOnly
                  })
                "
                @set-subtrees="setSubtrees"
                @toggle-subtree-boundaries="showSubtreeBoundaries = !showSubtreeBoundaries"
                @toggle-control-boundaries="showControlBoundaries = !showControlBoundaries"
              />
            </div>
          </div>
          <NodeInspector
            v-if="selectedNode"
            class="inspector-panel"
            :node="selectedNode"
            :status="getNodeStatus(props.statuses, selectedNode._uid)"
            @close="closeInspector"
            @open-subtree="emit('openSubtree', selectedNode)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style src="@vue-flow/core/dist/style.css"></style>
<style src="../assets/workspace.css"></style>

<style scoped>
.bt-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: auto;
  container: bt-viewer / inline-size;
}

.graph-panel {
  display: flex;
  flex-direction: column;
  flex: 1 0 360px;
  min-height: 360px;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-surface);
}
.viewer-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.graph-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.graph-canvas {
  container: bt-canvas / size;
  position: relative;
  flex: 1;
  min-height: 200px;
  background-color: var(--bt-background);
}
.branch-boundaries {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
  z-index: -1;
  pointer-events: none;
}
.branch-boundary {
  fill: color-mix(in srgb, var(--bt-subtree-accent) 14%, var(--bt-background));
  stroke: color-mix(in srgb, var(--bt-subtree-accent) 45%, var(--bt-background));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.empty-view {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  width: min(28rem, calc(100% - 2rem));
  padding: 1.5rem;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-surface);
  text-align: center;
  pointer-events: none;
}
.empty-view > .app-icon {
  display: block;
  margin: 0 auto 0.75rem;
  width: 28px;
  height: 28px;
  color: var(--bt-text-secondary);
}
.empty-view strong {
  font-size: 1rem;
}
.empty-view p {
  color: var(--bt-text-secondary);
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}
.inspector-panel {
  flex: 0 0 23rem;
  border-left: 1px solid var(--bt-border);
  border-radius: 0 0 4px 0;
}
:deep(.vue-flow__node:focus-visible) {
  outline: 3px dashed var(--bt-primary);
  outline-offset: 4px;
}
:deep(.vue-flow__selection),
:deep(.vue-flow__nodesselection-rect) {
  background: var(--bt-primary-soft);
  border: 1px dashed var(--bt-primary);
}
:deep(.vue-flow__edge-path) {
  stroke: var(--bt-edge);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
:deep(.vue-flow__edge.running-path .vue-flow__edge-path) {
  stroke: var(--bt-primary);
  stroke-width: 4;
  stroke-linecap: round;
}
:deep(.vue-flow__edge:focus-visible .vue-flow__edge-path),
:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--bt-selection);
  stroke-dasharray: 6 3;
}
@container bt-viewer (max-width: 1000px) {
  .viewer-workspace {
    flex-direction: column;
    min-height: 240px;
  }
  .graph-container {
    min-height: 240px;
  }
  .graph-panel:has(.inspector-panel) {
    min-height: 560px;
  }
  .inspector-panel {
    flex: 0 1 280px;
    max-height: 280px;
    border-left: 0;
    border-top: 1px solid var(--bt-border);
    border-radius: 0 0 4px 4px;
  }
}
</style>
