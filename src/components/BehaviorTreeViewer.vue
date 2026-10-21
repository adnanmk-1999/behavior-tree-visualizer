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

function toggleSubtrees(mode: SubtreeVisibility) {
  return changeView(() => {
    subtrees.value = subtrees.value === mode ? 'hidden' : mode
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
  <p v-if="graph.error" role="alert">{{ graph.error }}</p>
  <template v-else>
    <ul v-if="graph.warnings.length" role="status">
      <li v-for="warning in graph.warnings" :key="warning">{{ warning }}</li>
    </ul>
    <p>
      Click a node to inspect it. SubTree nodes with a folder icon open a tree; their Inspect button
      shows the reference details. Focus a node and press Enter for the same action. Trees open in
      Fit tree view; Readable view zooms in at the root. Drag the background to pan; scroll or pinch
      to zoom. Subtree contents start hidden.
    </p>
    <div class="viewer-workspace">
      <div class="graph-container" role="region" :aria-label="`${tree.ID} behavior tree diagram`">
        <div class="graph-toolbar">
          <div class="graph-controls" role="group" aria-label="Tree visibility">
            <button
              type="button"
              :aria-pressed="runningPathOnly"
              @click="
                changeView(() => {
                  runningPathOnly = !runningPathOnly
                })
              "
            >
              Running path only
            </button>
            <button type="button" :aria-pressed="subtrees === 'all'" @click="toggleSubtrees('all')">
              Show subtrees
            </button>
            <button
              type="button"
              :aria-pressed="subtrees === 'running'"
              @click="toggleSubtrees('running')"
            >
              Running subtrees only
            </button>
          </div>
          <div class="graph-controls" role="group" aria-label="Diagram controls">
            <button type="button" @click="zoomIn()">Zoom in</button>
            <button type="button" @click="zoomOut()">Zoom out</button>
            <button type="button" @click="readableView()">Readable view</button>
            <button type="button" @click="fitTree()">Fit tree</button>
          </div>
          <p class="view-summary">
            Subtree contents:
            {{
              subtrees === 'hidden'
                ? 'hidden'
                : subtrees === 'all'
                  ? 'all'
                  : 'running branches only'
            }}.
          </p>
        </div>
        <div class="graph-canvas" @keydown="onGraphKeydown" @focusin="onGraphFocus">
          <p v-if="!graph.nodes.length" class="empty-view" role="status">
            {{
              runningPathOnly
                ? 'No RUNNING nodes at this time. Play, seek, or turn off Running path only.'
                : 'This tree has no execution nodes.'
            }}
          </p>
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
      </div>
      <NodeInspector
        v-if="selectedNode"
        class="inspector-panel"
        :node="selectedNode"
        :status="getNodeStatus(props.statuses, selectedNode._uid)"
        @close="closeInspector"
      />
    </div>
    <BehaviorTreeLegend />
  </template>
</template>

<style scoped>
.viewer-workspace {
  display: flex;
  gap: 1rem;
  height: 70vh;
  min-height: 32rem;
}

.graph-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  border: 1px solid #767676;
}

.graph-toolbar {
  padding: 0.75rem;
  border-bottom: 1px solid #cbd5e1;
  background: #f8fafc;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.view-summary {
  width: 100%;
  margin: 0;
  font-size: 0.875rem;
}

.graph-canvas {
  position: relative;
  flex: 1;
  min-height: 16rem;
}

.empty-view {
  position: absolute;
  inset: 1rem 1rem auto;
  z-index: 5;
  padding: 1rem;
  background: #fff;
  pointer-events: none;
}

.inspector-panel {
  flex: 0 0 21rem;
}

.graph-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 0.75rem;
  font: inherit;
  border: 1px solid #94a3b8;
  border-radius: 3px;
  background: #fff;
  color: #172033;
  cursor: pointer;
}

button[aria-pressed='true'] {
  color: #fff;
  background: #334155;
  border-color: #334155;
}

button:hover {
  border-color: #172033;
}

button:focus-visible {
  outline: 2px solid #172033;
  outline-offset: 2px;
}

:deep(.vue-flow__node:focus-visible) {
  outline: 2px solid #172033;
  outline-offset: 3px;
}

:deep(.vue-flow__edge.running-path .vue-flow__edge-path) {
  stroke: #a16207;
  stroke-width: 4;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

:deep(.vue-flow__edge.running-path:focus-visible .vue-flow__edge-path),
:deep(.vue-flow__edge.running-path.selected .vue-flow__edge-path) {
  stroke: #172033;
}

@media (max-width: 800px) {
  .viewer-workspace {
    flex-direction: column;
    height: auto;
  }
  .graph-container {
    flex: auto;
    height: auto;
  }
  .graph-canvas {
    flex: none;
    height: 65vh;
    min-height: 24rem;
  }
  .inspector-panel {
    flex: auto;
    max-height: 28rem;
  }
}
</style>
