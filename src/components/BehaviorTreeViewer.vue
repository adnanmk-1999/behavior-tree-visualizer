<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { VueFlow, useVueFlow, type NodeMouseEvent } from '@vue-flow/core'
import type {
  BehaviorTreeDefinition,
  BehaviorTreeNode,
  NodeCategoryMap,
} from '@/types/behaviorTree'
import BehaviorTreeNodeView from '@/components/BehaviorTreeNode.vue'
import BehaviorTreeLegend from '@/components/BehaviorTreeLegend.vue'
import NodeInspector from '@/components/NodeInspector.vue'
import AppIcon from '@/components/AppIcon.vue'
import ViewportOverlay from '@/components/ViewportOverlay.vue'
import { NODE_MAX_WIDTH } from '@/utils/layoutTree'
import { getNodeStatus } from '@/utils/playbackState'
import { useBehaviorTreeView } from '@/composables/useBehaviorTreeView'
import type { SubtreeVisibility } from '@/utils/expandBehaviorTreeFlow'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import '@vue-flow/core/dist/style.css'
import '@/assets/workspace.css'

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
const {
  graph,
  runningPathOnly,
  subtrees,
  runningPathEdges,
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

const displayEdges = computed(() =>
  graph.value.edges.map((edge) => ({
    ...edge,
    type: 'step',
    // Vue Flow evaluates this callback reactively without rebuilding edge geometry.
    class: () => (runningPathEdges.value.has(edge.id) ? 'running-path' : ''),
  })),
)

function closeInspector() {
  selectedNodeId.value = null
  removeSelectedNodes(getSelectedNodes.value)
}

function inspectNode(id: string) {
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
  if (!event.target.matches(':focus-visible')) return
  const node = event.target.closest('.vue-flow__node')
  if (!node) return
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

function activateNode(id: string) {
  const data = graph.value.nodes.find((node) => node.id === id)?.data
  if (expandableBranchIds.value.has(id)) toggleInlineBranch(id)
  else if (data) inspectNode(id)
}

function onNodeClick({ node }: NodeMouseEvent) {
  inspectNode(node.id)
}

function toggleInlineBranch(id: string) {
  if (!expandableBranchIds.value.has(id)) return
  pendingView = false
  toggleBranch(id)
}

function onNodeDoubleClick({ node }: NodeMouseEvent) {
  toggleInlineBranch(node.id)
}

function onGraphKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.repeat || !(event.target instanceof Element)) return
  const node = event.target.closest('.vue-flow__node')
  if (node) {
    event.preventDefault()
    activateNode(node.getAttribute('data-id') ?? '')
  }
}

onNodesInitialized(applyPendingView)
watch(
  graph,
  async (_, __, onCleanup) => {
    if (selectedNodeId.value && !graph.value.nodes.some((node) => node.id === selectedNodeId.value))
      closeInspector()
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    await nextTick()
    if (!cancelled) await applyPendingView()
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="bt-viewer bt-theme">
    <p v-if="graph.error" class="notice notice-error" role="alert">{{ graph.error }}</p>
    <template v-else>
      <ul v-if="graph.warnings.length" class="notice" role="status">
        <li v-for="warning in graph.warnings" :key="warning">{{ warning }}</li>
      </ul>
      <section class="graph-panel" :aria-label="`${tree.ID} behavior tree diagram`">
        <div class="viewer-workspace">
          <div class="graph-container">
            <div class="graph-canvas" @keydown="onGraphKeydown" @focusin="onGraphFocus">
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
                :nodes="graph.nodes"
                :edges="displayEdges"
                :nodes-draggable="false"
                :nodes-connectable="false"
                :edges-updatable="false"
                :connect-on-click="false"
                :delete-key-code="null"
                :elements-selectable="true"
                :min-zoom="0.05"
                :max-zoom="2"
                :zoom-on-double-click="false"
                @node-click="onNodeClick"
                @node-double-click="onNodeDoubleClick"
                @pane-click="closeInspector"
              >
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
              />
            </div>
            <div class="graph-footer">
              <span class="canvas-hint"
                >Drag to pan <span aria-hidden="true">·</span> Scroll to zoom</span
              >
              <details class="graph-help">
                <summary><AppIcon name="info" /> How to explore</summary>
                <p>
                  Click any node to inspect it. Double-click a SubTree or a Control with children to
                  expand or collapse its branch, use its plus/minus button, or focus it and press
                  Enter. Successful Controls collapse automatically unless they lead to a RUNNING
                  node; manual choices take priority. The inspector can open a subtree separately.
                  Expanding or collapsing keeps your zoom and the toggled node in place. Choosing a
                  Subtrees mode resets only subtree toggles; Running path only still filters what is
                  visible. Fit tree shows the overview; Readable view zooms in at the root.
                </p>
              </details>
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
      <BehaviorTreeLegend />
    </template>
  </div>
</template>

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
.graph-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  min-height: 32px;
  padding: 0.375rem 0.875rem;
  border-top: 1px solid var(--bt-border);
  border-radius: 0 0 4px 4px;
  color: var(--bt-text-secondary);
  background: var(--bt-surface);
  font-size: 0.75rem;
}
.canvas-hint > span {
  padding-inline: 0.375rem;
}
.canvas-hint {
  margin-right: auto;
}
.graph-help summary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 24px;
  list-style: none;
  color: var(--bt-primary);
  border-radius: 4px;
}
.graph-help summary::-webkit-details-marker {
  display: none;
}
.graph-help summary .app-icon {
  width: 16px;
  height: 16px;
}
.graph-help summary:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.graph-help[open] {
  width: 100%;
}
.graph-help p {
  max-width: 80ch;
  margin: 0.25rem 0 0.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
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
@container bt-viewer (max-width: 600px) {
  .canvas-hint {
    display: none;
  }
  .graph-help {
    margin-left: auto;
  }
}
</style>
