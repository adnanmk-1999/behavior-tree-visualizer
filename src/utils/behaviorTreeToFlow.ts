import type { Edge, Node } from '@vue-flow/core'
import type {
  BehaviorTreeDefinition,
  BehaviorTreeNode,
  NodeCategory,
  NodeCategoryMap,
} from '@/types/behaviorTree'
import { getNodeCategory, getRegisteredNodeType } from './getNodeCategory.ts'

export interface BehaviorTreeFlowNodeData extends Omit<BehaviorTreeNode, 'children'> {
  label: string
  registeredType: string
  category: NodeCategory
  idSource: 'uid' | 'fallback'
}

export interface BehaviorTreeFlow {
  nodes: Node<BehaviorTreeFlowNodeData>[]
  edges: Edge[]
  warnings: string[]
}

export function behaviorTreeToFlow(
  tree: BehaviorTreeDefinition,
  nodeModels: NodeCategoryMap = {},
): BehaviorTreeFlow {
  const nodes: BehaviorTreeFlow['nodes'] = []
  const edges: Edge[] = []
  const warnings: string[] = []
  const ids = new Set<string>()

  function visit(node: BehaviorTreeNode, path: string, parentId?: string) {
    if (node.tag === 'TreeNodesModel') return

    const hasUid = node._uid !== undefined && node._uid.trim() !== ''
    const id = hasUid ? node._uid! : `fallback:${path}`
    if (ids.has(id)) {
      throw new Error(`Duplicate node ID "${id}" in tree "${tree.ID}" at ${path}.`)
    }
    ids.add(id)

    if (!hasUid) {
      warnings.push(
        `${node.tag} at ${path} has no _uid. "${id}" is a display ID and cannot match recording UIDs.`,
      )
    }

    const name = node.tag === 'SubTree' ? node.ID || 'SubTree' : node.name || node.tag
    nodes.push({
      id,
      type: 'behavior-tree',
      draggable: false,
      ariaLabel: `${name}, ${getNodeCategory(node, nodeModels)}, UID ${hasUid ? node._uid : 'not provided'}`,
      position: { x: 0, y: 0 },
      class: node.tag === 'SubTree' ? 'subtree-reference' : undefined,
      domAttributes: node.tag === 'SubTree' ? { title: `Open ${name}` } : undefined,
      data: {
        tag: node.tag,
        name: node.name,
        _uid: node._uid,
        ID: node.ID,
        attributes: { ...node.attributes },
        idSource: hasUid ? 'uid' : 'fallback',
        label: name,
        registeredType: getRegisteredNodeType(node),
        category: getNodeCategory(node, nodeModels),
      },
    })

    if (parentId !== undefined) {
      edges.push({
        id: `edge:${encodeURIComponent(parentId)}:${encodeURIComponent(id)}`,
        source: parentId,
        target: id,
      })
    }

    if (node.tag !== 'SubTree') {
      node.children.forEach((child, index) => visit(child, `${path}.${index}`, id))
    }
  }

  tree.children.forEach((node, index) => visit(node, String(index)))
  return { nodes, edges, warnings }
}
