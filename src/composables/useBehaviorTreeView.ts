import { computed, ref, watch, type Ref } from 'vue'
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
  const context =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (context) {
    context.font = `700 24px ${getComputedStyle(document.documentElement).fontFamily}`
  }
  const measureLabel = context ? (label: string) => context.measureText(label).width : undefined
  const runningPathOnly = ref(false)
  const subtrees = ref<SubtreeVisibility>('hidden')
  const branchOverrides = ref(new Map<string, boolean>())
  const layoutAnchorId = ref<string | null>(null)
  watch(
    tree,
    () => {
      branchOverrides.value.clear()
      layoutAnchorId.value = null
    },
    { flush: 'sync' },
  )
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
        branchAncestors: new Map<string, readonly string[]>(),
        error: cause instanceof Error ? cause.message : 'Could not create the tree diagram.',
      }
    }
  })
  const filtered = computed(() =>
    filterBehaviorTreeFlow(
      expanded.value,
      statuses.value,
      subtrees.value,
      runningPathOnly.value,
      branchOverrides.value,
    ),
  )
  const expandedBranchIds = computed(() => filtered.value.expandedBranchIds)
  const expandableBranchIds = computed(() => filtered.value.expandableBranchIds)
  const hasSubtreeOverrides = computed(() =>
    expanded.value.nodes.some(
      (node) => node.data?.tag === 'SubTree' && branchOverrides.value.has(node.id),
    ),
  )
  const visible = computed<BehaviorTreeFlow>((previous) => {
    const next = filtered.value
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
  const graph = computed<BehaviorTreeFlow & { error: string | null }>((previous) => {
    try {
      const laidOut = layoutTree(visible.value, measureLabel)
      const anchor =
        laidOut.nodes.find((node) => node.id === layoutAnchorId.value) ?? laidOut.nodes[0]
      // Keep the toggled node in place without changing the viewport; otherwise anchor the root.
      if (anchor) {
        const before = previous?.nodes.find((node) => node.id === anchor.id)?.position ?? {
          x: 0,
          y: 0,
        }
        const offset = { x: before.x - anchor.position.x, y: before.y - anchor.position.y }
        for (const node of laidOut.nodes) {
          node.position = { x: node.position.x + offset.x, y: node.position.y + offset.y }
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

  function toggleBranch(id: string) {
    const node = graph.value.nodes.find((node) => node.id === id)
    if (!expandableBranchIds.value.has(id) || !node) return
    layoutAnchorId.value = id
    const open = !expandedBranchIds.value.has(id)
    if (
      node.data?.tag === 'SubTree' &&
      ((subtrees.value === 'hidden' && !open) || (subtrees.value === 'all' && open))
    ) {
      branchOverrides.value.delete(id)
    } else {
      branchOverrides.value.set(id, open)
    }
  }

  function setSubtreeMode(mode: SubtreeVisibility) {
    layoutAnchorId.value = null
    for (const node of expanded.value.nodes) {
      if (node.data?.tag === 'SubTree') branchOverrides.value.delete(node.id)
    }
    subtrees.value = mode
  }

  return {
    runningPathOnly,
    subtrees,
    graph,
    runningPathEdges,
    expandedBranchIds,
    expandableBranchIds,
    hasSubtreeOverrides,
    toggleBranch,
    setSubtreeMode,
  }
}
