import type { BehaviorTreeDefinition, NodeCategoryMap } from '@/types/behaviorTree'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import { behaviorTreeToFlow, type BehaviorTreeFlow } from './behaviorTreeToFlow.ts'
import { resolveSubTree } from './resolveSubTree.ts'
import { getRunningPathEdges } from './getRunningPathEdges.ts'
import { getNodeStatus } from './playbackState.ts'

export type SubtreeVisibility = 'hidden' | 'all' | 'running'

export interface ExpandedBehaviorTreeFlow extends BehaviorTreeFlow {
  subtreeAncestors: Map<string, readonly string[]>
}

const edgeId = (source: string, target: string) =>
  `edge:${encodeURIComponent(source)}:${encodeURIComponent(target)}`

export function expandBehaviorTreeFlow(
  tree: BehaviorTreeDefinition,
  definitions: readonly BehaviorTreeDefinition[],
  nodeModels: NodeCategoryMap = {},
): ExpandedBehaviorTreeFlow {
  const result: ExpandedBehaviorTreeFlow = {
    nodes: [],
    edges: [],
    warnings: [],
    subtreeAncestors: new Map(),
  }
  const usedIds = new Set<string>()

  function append(
    definition: BehaviorTreeDefinition,
    subtreeAncestors: readonly string[],
    ancestors: ReadonlySet<BehaviorTreeDefinition>,
    parentId?: string,
  ) {
    const local = behaviorTreeToFlow(definition, nodeModels)
    const ids = new Map(
      local.nodes.map((node) => [
        node.id,
        parentId && node.data?.idSource === 'fallback'
          ? `fallback:${encodeURIComponent(parentId)}:${node.id.slice('fallback:'.length)}`
          : node.id,
      ]),
    )
    const incomingIds = new Set<string>()
    for (const id of ids.values()) {
      if (usedIds.has(id) || incomingIds.has(id))
        throw new Error(
          `Cannot expand "${definition.ID}": duplicate node ID "${id}" across tree instances.`,
        )
      incomingIds.add(id)
    }
    for (const warning of local.warnings) {
      let message = warning
      for (const [from, to] of ids) message = message.replaceAll(`"${from}"`, `"${to}"`)
      result.warnings.push(`${definition.ID}: ${message}`)
    }
    const children = new Set(local.edges.map((edge) => edge.target))
    for (const node of local.nodes) {
      const id = ids.get(node.id)!
      usedIds.add(id)
      result.nodes.push({ ...node, id })
      result.subtreeAncestors.set(id, subtreeAncestors)
      if (parentId && !children.has(node.id)) {
        result.edges.push({ id: edgeId(parentId, id), source: parentId, target: id })
      }
    }
    result.edges.push(
      ...local.edges.map((edge) => {
        const source = ids.get(edge.source)!
        const target = ids.get(edge.target)!
        return { ...edge, id: edgeId(source, target), source, target }
      }),
    )

    for (const node of local.nodes) {
      if (node.data?.tag !== 'SubTree') continue
      const id = ids.get(node.id)!
      try {
        const target = resolveSubTree(node.data, definitions)
        if (ancestors.has(target))
          throw new Error(`Recursive SubTree "${target.ID}" was left collapsed.`)
        append(target, [...subtreeAncestors, id], new Set([...ancestors, target]), id)
      } catch (cause) {
        result.warnings.push(
          cause instanceof Error ? cause.message : `Could not expand SubTree ${id}.`,
        )
      }
    }
  }

  append(tree, [], new Set([tree]))
  return result
}

export function filterBehaviorTreeFlow(
  flow: ExpandedBehaviorTreeFlow,
  statuses: NodeStatusMap,
  subtrees: SubtreeVisibility,
  runningPathOnly: boolean,
): BehaviorTreeFlow {
  const runningEdges = getRunningPathEdges(flow, statuses)
  const onPath = new Set(
    flow.nodes
      .filter((node) => getNodeStatus(statuses, node.data?._uid) === 'RUNNING')
      .map((node) => node.id),
  )
  for (const edge of flow.edges) {
    if (runningEdges.has(edge.id)) {
      onPath.add(edge.source)
      onPath.add(edge.target)
    }
  }
  const nodes = flow.nodes.filter((node) => {
    const ancestors = flow.subtreeAncestors.get(node.id) ?? []
    const expanded =
      subtrees === 'all' || ancestors.every((id) => subtrees === 'running' && onPath.has(id))
    return expanded && (!runningPathOnly || onPath.has(node.id))
  })
  const visible = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    edges: flow.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    warnings: flow.warnings,
  }
}
