import type { BehaviorTreeFlow } from './behaviorTreeToFlow'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import { getNodeStatus } from './playbackState.ts'

export function getRunningPathEdges(
  flow: Pick<BehaviorTreeFlow, 'nodes' | 'edges'>,
  statuses: NodeStatusMap,
): Set<string> {
  const parentEdges = new Map(flow.edges.map((edge) => [edge.target, edge]))
  const highlighted = new Set<string>()

  for (const node of flow.nodes) {
    if (getNodeStatus(statuses, node.data?._uid) !== 'RUNNING') continue
    let edge = parentEdges.get(node.id)
    while (edge && !highlighted.has(edge.id)) {
      highlighted.add(edge.id)
      edge = parentEdges.get(edge.source)
    }
  }
  return highlighted
}
