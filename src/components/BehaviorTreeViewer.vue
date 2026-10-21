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
import { NODE_WIDTH } from '@/utils/layoutTree'
import { getNodeStatus } from '@/utils/playbackState'
import { useBehaviorTreeView } from '@/composables/useBehaviorTreeView'
import type { SubtreeVisibility } from '@/utils/expandBehaviorTreeFlow'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

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
const { graph, runningPathOnly, subtrees, runningPathEdges } = useBehaviorTreeView(
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
  if (subtrees.value === mode) return
  return changeView(() => {
    subtrees.value = mode
  })
}

const selectedNode = computed(
  () => graph.value.nodes.find((node) => node.id === selectedNodeId.value)?.data,
)

const displayEdges = computed(() =>
  graph.value.edges.map((edge) => ({
    ...edge,
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
  const zoom = Math.min(1, Math.max(0.05, (dimensions.value.width - 32) / NODE_WIDTH))
  return setViewport({
    x: dimensions.value.width / 2 - (root.position.x + NODE_WIDTH / 2) * zoom,
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

function openNode(id: string) {
  const data = graph.value.nodes.find((node) => node.id === id)?.data
  if (data?.tag === 'SubTree') emit('openSubtree', data)
  else if (data) inspectNode(id)
}

function onNodeClick({ node }: NodeMouseEvent) {
  openNode(node.id)
}

function onGraphKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.repeat || !(event.target instanceof Element)) return
  const node = event.target.closest('.vue-flow__node')
  if (node) {
    event.preventDefault()
    openNode(node.getAttribute('data-id') ?? '')
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
  <p v-if="graph.error" class="notice notice-error" role="alert">{{ graph.error }}</p>
  <template v-else>
    <ul v-if="graph.warnings.length" class="notice" role="status">
      <li v-for="warning in graph.warnings" :key="warning">{{ warning }}</li>
    </ul>
    <section class="graph-panel" :aria-label="`${tree.ID} behavior tree diagram`">
      <div class="graph-toolbar">
        <div class="visibility-controls" role="group" aria-label="Tree visibility">
          <button
            class="ui-button path-filter"
            type="button"
            :aria-pressed="runningPathOnly"
            @click="
              changeView(() => {
                runningPathOnly = !runningPathOnly
              })
            "
          >
            <AppIcon name="route" /> Running path only
          </button>
          <label class="subtree-control">
            Subtrees
            <select
              class="ui-select"
              :value="subtrees"
              @change="setSubtrees(($event.target as HTMLSelectElement).value as SubtreeVisibility)"
            >
              <option value="hidden">Collapsed</option>
              <option value="running">Running only</option>
              <option value="all">All expanded</option>
            </select>
          </label>
        </div>
        <div class="view-controls" role="group" aria-label="Diagram controls">
          <div class="zoom-controls">
            <button
              class="ui-button button-quiet icon-button"
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              @click="zoomOut()"
            >
              <AppIcon name="minus" />
            </button>
            <span class="zoom-value" aria-label="Zoom level"
              >{{ Math.round(viewport.zoom * 100) }}%</span
            >
            <button
              class="ui-button button-quiet icon-button"
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              @click="zoomIn()"
            >
              <AppIcon name="plus" />
            </button>
          </div>
          <button class="ui-button button-quiet" type="button" @click="readableView()">
            <AppIcon name="readable" /> Readable view
          </button>
          <button class="ui-button" type="button" @click="fitTree()">
            <AppIcon name="fit" /> Fit tree
          </button>
        </div>
      </div>
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
              @node-click="onNodeClick"
              @pane-click="closeInspector"
            >
              <template #node-behavior-tree="nodeProps">
                <BehaviorTreeNodeView
                  :data="nodeProps.data"
                  :selected="nodeProps.selected"
                  :status="getNodeStatus(props.statuses, nodeProps.data._uid)"
                  @inspect="inspectNode(nodeProps.id)"
                />
              </template>
            </VueFlow>
          </div>
          <div class="graph-footer">
            <span class="graph-counts"
              >{{ graph.nodes.length }} nodes <span aria-hidden="true">·</span>
              {{ graph.edges.length }} connections</span
            >
            <span class="canvas-hint"
              >Drag to pan <span aria-hidden="true">·</span> Scroll to zoom</span
            >
            <details class="graph-help">
              <summary><AppIcon name="info" /> How to explore</summary>
              <p>
                Click a node to inspect its attributes and recorded status. Click a folder node to
                open its subtree; use its Inspect button to inspect the reference instead. Keyboard:
                focus a node and press Enter. Fit tree shows the overview; Readable view zooms in at
                the root. Subtree contents start collapsed.
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
        />
      </div>
    </section>
    <BehaviorTreeLegend />
  </template>
</template>

<style scoped>
.graph-panel {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}
.graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--line);
  border-radius: 12px 12px 0 0;
  background: var(--surface);
}
.visibility-controls,
.view-controls,
.subtree-control,
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.visibility-controls {
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}
.subtree-control {
  color: var(--muted);
  font-size: 0.875rem;
}
.subtree-control select {
  min-width: 9rem;
}
.path-filter[aria-pressed='true'] {
  color: #704508;
  background: #fff3ca;
  border-color: #b98224;
}
.path-filter[aria-pressed='true']:hover {
  background: #ffe9a3;
}
.view-controls {
  flex-wrap: wrap;
}
.zoom-controls {
  gap: 0;
  padding-right: 0.5rem;
  border-right: 1px solid var(--line);
}
.zoom-value {
  min-width: 3.25rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
.viewer-workspace {
  display: flex;
  height: clamp(26rem, calc(100dvh - 350px), 64rem);
  min-width: 0;
}
.graph-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.graph-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: #f5f8fc;
  background-image: radial-gradient(#cbd6e5 0.75px, transparent 0.75px);
  background-size: 20px 20px;
}
.empty-view {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  width: min(28rem, calc(100% - 2rem));
  padding: 1.5rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  text-align: center;
  pointer-events: none;
}
.empty-view > .app-icon {
  display: block;
  margin: 0 auto 0.75rem;
  width: 28px;
  height: 28px;
  color: var(--muted);
}
.empty-view strong {
  font-size: 1rem;
}
.empty-view p {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}
.inspector-panel {
  flex: 0 0 23rem;
  border-left: 1px solid var(--line);
  border-radius: 0 0 12px 0;
}
.graph-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  min-height: 40px;
  padding: 0.375rem 0.875rem;
  border-top: 1px solid var(--line);
  border-radius: 0 0 12px 12px;
  color: var(--muted);
  background: var(--surface);
  font-size: 0.75rem;
}
.graph-counts {
  font-variant-numeric: tabular-nums;
}
.graph-counts > span,
.canvas-hint > span {
  padding-inline: 0.375rem;
}
.canvas-hint {
  margin-left: auto;
}
.graph-help summary {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 32px;
  list-style: none;
  color: var(--accent);
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
  outline: 3px solid var(--ink);
  outline-offset: 4px;
}
:deep(.vue-flow__edge-path) {
  stroke: #a4b2c5;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
:deep(.vue-flow__edge.running-path .vue-flow__edge-path) {
  stroke: #a16207;
  stroke-width: 4;
  stroke-linecap: round;
}
:deep(.vue-flow__edge:focus-visible .vue-flow__edge-path),
:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #172033;
}
@media (max-width: 1000px) {
  .viewer-workspace {
    flex-direction: column;
    height: auto;
  }
  .graph-canvas {
    flex: none;
    height: 60svh;
    min-height: 24rem;
  }
  .inspector-panel {
    flex: auto;
    max-height: 30rem;
    border-left: 0;
    border-top: 1px solid var(--line);
    border-radius: 0 0 12px 12px;
  }
}
@media (max-width: 600px) {
  .graph-toolbar {
    padding: 0.625rem;
    gap: 0.5rem;
  }
  .visibility-controls,
  .view-controls {
    width: 100%;
  }
  .view-controls {
    gap: 0.25rem;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid var(--line);
  }
  .view-controls .ui-button {
    padding-inline: 0.5rem;
  }
  .view-controls > .ui-button .app-icon {
    display: none;
  }
  .zoom-controls {
    border: 0;
    padding: 0;
  }
  .zoom-value {
    min-width: 2.5rem;
  }
  .canvas-hint {
    display: none;
  }
  .graph-help {
    margin-left: auto;
  }
}
</style>
