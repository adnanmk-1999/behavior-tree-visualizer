import { computed, ref, type Ref } from 'vue'
import type { BehaviorTreeDefinition, NodeCategoryMap } from '@/types/behaviorTree'
import type { NodeStatusMap } from '@/types/behaviorTreeEvents'
import {
  expandBehaviorTreeFlow,
  filterBehaviorTreeFlow,
  type SubtreeVisibility,
} from '../utils/expandBehaviorTreeFlow.ts'
import { getRunningPathEdges } from '../utils/getRunningPathEdges.ts'
import { layoutTree } from '../utils/layoutTree.ts'
import type { BehaviorTreeFlow } from '@/utils/behaviorTreeToFlow'

export function useBehaviorTreeView(
  tree: Ref<BehaviorTreeDefinition>,
  definitions: Ref<readonly BehaviorTreeDefinition[]>,
  nodeModels: Ref<NodeCategoryMap | undefined>,
  statuses: Ref<NodeStatusMap>,
) {
  const runningPathOnly = ref(false)
  const subtrees = ref<SubtreeVisibility>('hidden')
  const expanded = computed(() => {
    try {
      return {
        ...expandBehaviorTreeFlow(tree.value, definitions.value, nodeModels.value),
        error: null,
      }
    } catch (cause) {
      return {
        nodes: [],
        edges: [],
        warnings: [],
        subtreeAncestors: new Map<string, readonly string[]>(),
        error: cause instanceof Error ? cause.message : 'Could not create the tree diagram.',
      }
    }
  })
  const visible = computed<BehaviorTreeFlow>((previous) => {
    const next = filterBehaviorTreeFlow(
      expanded.value,
      statuses.value,
      subtrees.value,
      runningPathOnly.value,
    )
    // Status changes only trigger layout when the visible structure actually changes.
    if (
      previous &&
      next.warnings === previous.warnings &&
      next.nodes.length === previous.nodes.length &&
      next.nodes.every((node, i) => node === previous.nodes[i]) &&
      next.edges.length === previous.edges.length &&
      next.edges.every((edge, i) => edge === previous.edges[i])
    )
      return previous
    return next
  })
  const graph = computed(() => {
    try {
      const laidOut = layoutTree(visible.value)
      const origin = laidOut.nodes[0]?.position
      // Anchor the root so changing active branches does not move it outside the current view.
      if (origin) {
        for (const node of laidOut.nodes) {
          node.position = { x: node.position.x - origin.x, y: node.position.y - origin.y }
        }
      }
      return { ...laidOut, error: expanded.value.error }
    } catch (cause) {
      return {
        nodes: [],
        edges: [],
        warnings: visible.value.warnings,
        error: cause instanceof Error ? cause.message : 'Could not lay out the tree diagram.',
      }
    }
  })
  const runningPathEdges = computed(() => getRunningPathEdges(expanded.value, statuses.value))

  return { runningPathOnly, subtrees, graph, runningPathEdges }
}
