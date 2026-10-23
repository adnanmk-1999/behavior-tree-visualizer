import { graphlib, layout } from '@dagrejs/dagre'
import { Position } from '@vue-flow/core'
import type { BehaviorTreeFlow } from './behaviorTreeToFlow'

export const NODE_MIN_WIDTH = 160
export const NODE_MAX_WIDTH = 360
export const NODE_HEIGHT = 76

export function layoutTree(
  flow: BehaviorTreeFlow,
  // Browser callers measure the rendered font; headless callers use a deterministic estimate.
  measureLabel: (label: string) => number = (label) => [...label].length * 14,
): BehaviorTreeFlow {
  const graph = new graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 20, ranksep: 160 })
  graph.setDefaultEdgeLabel(() => ({}))

  // Prefix internal keys so numeric UIDs cannot reorder siblings in Dagre's lookup objects.
  flow.nodes.forEach((node) => {
    // Reserve the branch toggle even when children are hidden so node width stays stable.
    const chromeWidth = 36 + 28 + 10 + (node.data?.collapsible ? 36 + 10 : 0)
    const width = Math.min(
      NODE_MAX_WIDTH,
      Math.max(NODE_MIN_WIDTH, Math.ceil(measureLabel(node.data?.label ?? node.id)) + chromeWidth),
    )
    graph.setNode(`node:${node.id}`, { width, height: NODE_HEIGHT })
  })
  flow.edges.forEach((edge) => graph.setEdge(`node:${edge.source}`, `node:${edge.target}`))
  // Keep the XML traversal order instead of optimizing sibling order for edge crossings.
  layout(graph, { disableOptimalOrderHeuristic: true })

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const { x, y, width } = graph.node(`node:${node.id}`)
      return {
        ...node,
        position: { x: x - width / 2, y: y - NODE_HEIGHT / 2 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        width,
        height: NODE_HEIGHT,
        style: { boxSizing: 'border-box' },
      }
    }),
  }
}
