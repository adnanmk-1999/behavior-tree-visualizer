import type { BehaviorTreeNode, NodeCategory, NodeCategoryMap } from '@/types/behaviorTree'

const genericCategories: NodeCategoryMap = {
  Action: 'Action',
  Condition: 'Condition',
  Control: 'Control',
  Decorator: 'Decorator',
}

// Registered built-ins from BehaviorTree.CPP; custom types come from TreeNodesModel.
const builtInCategories: NodeCategoryMap = {
  Sequence: 'Control',
  AsyncSequence: 'Control',
  SequenceWithMemory: 'Control',
  SequenceStar: 'Control',
  Fallback: 'Control',
  AsyncFallback: 'Control',
  ReactiveSequence: 'Control',
  ReactiveFallback: 'Control',
  Parallel: 'Control',
  ParallelAll: 'Control',
  IfThenElse: 'Control',
  WhileDoElse: 'Control',
  TryCatch: 'Control',
  Switch2: 'Control',
  Switch3: 'Control',
  Switch4: 'Control',
  Switch5: 'Control',
  Switch6: 'Control',
  Inverter: 'Decorator',
  RetryUntilSuccessful: 'Decorator',
  KeepRunningUntilFailure: 'Decorator',
  Repeat: 'Decorator',
  Timeout: 'Decorator',
  Delay: 'Decorator',
  RunOnce: 'Decorator',
  ForceSuccess: 'Decorator',
  ForceFailure: 'Decorator',
  Precondition: 'Decorator',
  LoopInt: 'Decorator',
  LoopBool: 'Decorator',
  LoopDouble: 'Decorator',
  LoopString: 'Decorator',
  SkipUnlessUpdated: 'Decorator',
  WaitValueUpdate: 'Decorator',
  AlwaysSuccess: 'Action',
  AlwaysFailure: 'Action',
  Script: 'Action',
  SetBlackboard: 'Action',
  Sleep: 'Action',
  UnsetBlackboard: 'Action',
  WasEntryUpdated: 'Action',
  ScriptCondition: 'Condition',
}

type NodeType = Pick<BehaviorTreeNode, 'tag' | 'ID'>

export function getRegisteredNodeType(node: NodeType): string {
  return Object.hasOwn(genericCategories, node.tag) ? node.ID || node.tag : node.tag
}

export function getNodeCategory(node: NodeType, nodeModels: NodeCategoryMap = {}): NodeCategory {
  if (node.tag === 'SubTree') return 'SubTree'

  const registeredType = getRegisteredNodeType(node)
  for (const [mapping, key] of [
    [nodeModels, registeredType],
    [genericCategories, node.tag],
    [builtInCategories, registeredType],
  ] as const) {
    if (Object.hasOwn(mapping, key)) return mapping[key] ?? 'Unknown'
  }
  return 'Unknown'
}
