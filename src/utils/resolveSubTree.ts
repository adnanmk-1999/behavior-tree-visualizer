import type { BehaviorTreeDefinition, BehaviorTreeNode } from '@/types/behaviorTree'

export type SubTreeTarget = Pick<BehaviorTreeNode, 'tag' | 'ID' | 'attributes'>

export function resolveSubTree(
  reference: SubTreeTarget,
  definitions: readonly BehaviorTreeDefinition[],
): BehaviorTreeDefinition {
  if (reference.tag !== 'SubTree' || !reference.ID) {
    throw new Error('Expected a SubTree reference with an ID.')
  }

  const path = reference.attributes._fullpath
  const matches = definitions.filter(
    (tree) => tree.ID === reference.ID && (path === undefined || tree._fullpath === path),
  )
  const description = `SubTree "${reference.ID}"${path === undefined ? ' without _fullpath' : ` at _fullpath "${path}"`}`

  if (matches.length === 0) {
    throw new Error(`Could not resolve ${description}. No matching BehaviorTree definition exists.`)
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous ${description}: ${matches.length} matching definitions.`)
  }

  return matches[0]!
}
