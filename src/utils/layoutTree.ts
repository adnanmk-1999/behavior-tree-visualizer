import { graphlib, layout } from '@dagrejs/dagre'
import { Position } from '@vue-flow/core'
import type { BehaviorTreeFlow } from './behaviorTreeToFlow'

export const NODE_WIDTH = 360
export const NODE_HEIGHT = 208

export function layoutTree(flow: BehaviorTreeFlow): BehaviorTreeFlow {
  const graph = new graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 })
  graph.setDefaultEdgeLabel(() => ({}))

  // Prefix internal keys so numeric UIDs cannot reorder siblings in Dagre's lookup objects.
  flow.nodes.forEach((node) => {
    graph.setNode(`node:${node.id}`, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  flow.edges.forEach((edge) => graph.setEdge(`node:${edge.source}`, `node:${edge.target}`))
  // Keep the XML traversal order instead of optimizing sibling order for edge crossings.
  layout(graph, { disableOptimalOrderHeuristic: true })

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const { x, y } = graph.node(`node:${node.id}`)
      return {
        ...node,
        position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        style: { boxSizing: 'border-box' },
      }
    }),
  }
}
