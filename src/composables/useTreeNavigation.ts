import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import type { BehaviorTreeDefinition, BehaviorTreeDocument } from '@/types/behaviorTree'
import { resolveSubTree, type SubTreeTarget } from '../utils/resolveSubTree.ts'

export function useTreeNavigation(document: Ref<BehaviorTreeDocument | null>) {
  const history = shallowRef<BehaviorTreeDefinition[]>([])
  const navigationError = ref<string | null>(null)
  const currentTree = computed(() => history.value.at(-1))

  watch(
    document,
    (parsed) => {
      const trees = parsed?.behaviorTrees
      const root =
        trees?.find((tree) => tree.ID === 'RobotTree' && tree._fullpath === '') ??
        trees?.find((tree) => tree.ID === 'RobotTree')
      history.value = root ? [root] : []
      navigationError.value = null
    },
    { immediate: true, flush: 'sync' },
  )

  function goTo(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= history.value.length) return
    navigationError.value = null
    if (index < history.value.length - 1) {
      history.value = history.value.slice(0, index + 1)
    }
  }

  function openSubTree(reference: SubTreeTarget) {
    if (reference.tag !== 'SubTree' || !currentTree.value) return
    try {
      const target = resolveSubTree(reference, document.value?.behaviorTrees ?? [])
      const ancestorIndex = history.value.indexOf(target)
      if (ancestorIndex >= 0) {
        goTo(ancestorIndex)
      } else {
        history.value = [...history.value, target]
        navigationError.value = null
      }
    } catch (cause) {
      navigationError.value =
        cause instanceof Error ? cause.message : 'Could not open this SubTree.'
    }
  }

  return { history, currentTree, navigationError, openSubTree, goTo }
}
