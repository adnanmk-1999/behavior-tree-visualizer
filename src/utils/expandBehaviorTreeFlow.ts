import type { BehaviorTreeDefinition, NodeCategoryMap } from '@/types/behaviorTree'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import { behaviorTreeToFlow, type BehaviorTreeFlow } from './behaviorTreeToFlow.ts'
import { resolveSubTree } from './resolveSubTree.ts'
import { getRunningPathEdges } from './getRunningPathEdges.ts'
import { getNodeStatus } from './playbackState.ts'

export type SubtreeVisibility = 'hidden' | 'all' | 'running'

export interface ExpandedBehaviorTreeFlow extends BehaviorTreeFlow {
  branchAncestors: Map<string, readonly string[]>
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
    branchAncestors: new Map(),
  }
  const usedIds = new Set<string>()

  function append(
    definition: BehaviorTreeDefinition,
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
        append(target, new Set([...ancestors, target]), id)
      } catch (cause) {
        result.warnings.push(
          cause instanceof Error ? cause.message : `Could not expand SubTree ${id}.`,
        )
      }
    }
  }

  append(tree, new Set([tree]))
  const parents = new Map(result.edges.map((edge) => [edge.target, edge.source]))
  function ancestorsOf(id: string): readonly string[] {
    const cached = result.branchAncestors.get(id)
    if (cached) return cached
    const parent = parents.get(id)
    const ancestors = parent === undefined ? [] : [...ancestorsOf(parent), parent]
    result.branchAncestors.set(id, ancestors)
    return ancestors
  }
  for (const node of result.nodes) ancestorsOf(node.id)
  return result
}

export function filterBehaviorTreeFlow(
  flow: ExpandedBehaviorTreeFlow,
  statuses: NodeStatusMap,
  subtrees: SubtreeVisibility,
  runningPathOnly: boolean,
  overrides: ReadonlyMap<string, boolean> = new Map(),
) {
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
  const parents = new Set(flow.edges.map((edge) => edge.source))
  const expandableBranchIds = new Set<string>()
  const expandedBranchIds = new Set<string>()
  const collapsed = new Set<string>()
  for (const node of flow.nodes) {
    if (!node.data?.collapsible || !parents.has(node.id)) continue
    expandableBranchIds.add(node.id)
    const defaultOpen =
      node.data.tag === 'SubTree'
        ? subtrees === 'all' || (subtrees === 'running' && onPath.has(node.id))
        : getNodeStatus(statuses, node.data._uid) !== 'SUCCESS' || onPath.has(node.id)
    if (overrides.get(node.id) ?? defaultOpen) expandedBranchIds.add(node.id)
    else collapsed.add(node.id)
  }
  const nodes = flow.nodes.filter((node) => {
    const ancestors = flow.branchAncestors.get(node.id) ?? []
    const expanded = ancestors.every((id) => !collapsed.has(id))
    return expanded && (!runningPathOnly || onPath.has(node.id))
  })
  const visible = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    edges: flow.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    warnings: flow.warnings,
    expandableBranchIds,
    expandedBranchIds,
  }
}
