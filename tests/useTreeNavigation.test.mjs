import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, shallowRef } from 'vue'
import { useTreeNavigation } from '../src/composables/useTreeNavigation.ts'

function tree(ID, path) {
  return { ID, _fullpath: path, attributes: {}, children: [] }
}

function reference(target) {
  return { tag: 'SubTree', ID: target.ID, attributes: { _fullpath: target._fullpath } }
}

function setup(t) {
  const root = tree('RobotTree', '')
  const mission = tree('MissionBody', 'MissionBody::34')
  const dispatch = tree('ActionDispatchSwitch', 'MissionBody::34/ActionDispatchSwitch::120')
  const first = tree('Repeated', 'one/Repeated::1')
  const second = tree('Repeated', 'two/Repeated::2')
  const definitions = [tree('RobotTree', 'nested'), root, mission, dispatch, first, second]
  const document = shallowRef(null)
  const scope = effectScope()
  const navigation = scope.run(() => useTreeNavigation(document))
  t.after(() => scope.stop())
  return { ...navigation, document, definitions, root, mission, dispatch, first, second }
}

test('navigation starts at the root instance and supports Back, breadcrumbs and Home', (t) => {
  const nav = setup(t)
  assert.deepEqual(nav.history.value, [])
  nav.document.value = { attributes: {}, behaviorTrees: nav.definitions }
  assert.equal(nav.currentTree.value, nav.root)
  nav.openSubTree(reference(nav.mission))
  nav.openSubTree(reference(nav.dispatch))
  assert.deepEqual(nav.history.value, [nav.root, nav.mission, nav.dispatch])
  nav.goTo(nav.history.value.length - 2)
  assert.equal(nav.currentTree.value, nav.mission)
  nav.openSubTree(reference(nav.dispatch))
  nav.goTo(0)
  assert.deepEqual(nav.history.value, [nav.root])
  const unchanged = nav.history.value
  nav.goTo(0)
  assert.equal(
    nav.history.value,
    unchanged,
    'Current breadcrumb should not trigger a diagram update',
  )
})

test('ancestor and self-references trim history instead of introducing cycles', (t) => {
  const nav = setup(t)
  nav.document.value = { attributes: {}, behaviorTrees: nav.definitions }
  nav.openSubTree(reference(nav.mission))
  nav.openSubTree(reference(nav.dispatch))
  nav.openSubTree(reference(nav.mission))
  assert.deepEqual(nav.history.value, [nav.root, nav.mission])
  const unchanged = nav.history.value
  nav.openSubTree(reference(nav.mission))
  assert.equal(nav.history.value, unchanged)
  nav.openSubTree(reference(nav.root))
  assert.deepEqual(nav.history.value, [nav.root])
})

test('repeated tree IDs retain distinct instance identities in history', (t) => {
  const nav = setup(t)
  nav.document.value = { attributes: {}, behaviorTrees: nav.definitions }
  nav.openSubTree(reference(nav.first))
  nav.openSubTree(reference(nav.second))
  assert.deepEqual(nav.history.value, [nav.root, nav.first, nav.second])
  nav.goTo(1)
  assert.equal(nav.currentTree.value, nav.first)
})

test('bad references, ordinary nodes and invalid history indexes preserve the current graph', (t) => {
  const nav = setup(t)
  nav.document.value = { attributes: {}, behaviorTrees: nav.definitions }
  const unchanged = nav.history.value
  nav.openSubTree({ tag: 'SubTree', ID: 'Missing', attributes: {} })
  assert.match(nav.navigationError.value, /Could not resolve/)
  assert.equal(nav.history.value, unchanged)
  nav.openSubTree({ tag: 'SubTree', ID: 'Repeated', attributes: {} })
  assert.match(nav.navigationError.value, /Ambiguous/)
  assert.equal(nav.history.value, unchanged)
  nav.openSubTree({ tag: 'Action', ID: 'MissionBody', attributes: {} })
  for (const index of [-1, 5, 0.5, NaN]) nav.goTo(index)
  assert.equal(nav.history.value, unchanged)
  nav.openSubTree(reference(nav.mission))
  assert.equal(nav.navigationError.value, null)
  nav.document.value = { attributes: {}, behaviorTrees: [] }
  assert.equal(nav.currentTree.value, undefined)
  assert.deepEqual(nav.history.value, [])
  nav.openSubTree(reference(nav.mission))
  assert.deepEqual(nav.history.value, [])
})
