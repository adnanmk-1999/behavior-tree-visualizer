export interface BehaviorTreeNode {
  tag: string
  name?: string
  _uid?: string
  ID?: string
  attributes: Record<string, string>
  children: BehaviorTreeNode[]
}

export interface SubTreeReference extends BehaviorTreeNode {
  tag: 'SubTree'
  ID: string
  children: []
}

export interface BehaviorTreeDefinition {
  ID: string
  _fullpath?: string
  attributes: Record<string, string>
  children: BehaviorTreeNode[]
}

export interface BehaviorTreeDocument {
  attributes: Record<string, string>
  nodeModels: NodeCategoryMap
  // IDs may repeat; retain each definition and its instance path in document order.
  behaviorTrees: BehaviorTreeDefinition[]
}

export const NODE_CATEGORIES = [
  'Control',
  'Action',
  'Condition',
  'Decorator',
  'SubTree',
  'Unknown',
] as const

export type NodeCategory = (typeof NODE_CATEGORIES)[number]
export type NodeCategoryMap = Record<string, NodeCategory>
