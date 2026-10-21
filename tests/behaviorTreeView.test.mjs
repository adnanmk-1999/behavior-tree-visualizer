import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reactive, shallowRef } from 'vue'
import {
  expandBehaviorTreeFlow,
  filterBehaviorTreeFlow,
} from '../src/utils/expandBehaviorTreeFlow.ts'
import { useBehaviorTreeView } from '../src/composables/useBehaviorTreeView.ts'
import { reconstructPlayback } from '../src/utils/playbackState.ts'
import { recording } from './helpers/behaviorTreeEvents.mjs'

const node = (_uid, children = []) => ({
  tag: 'Sequence',
  _uid,
  name: 'Repeated',
  attributes: {},
  children,
})
const definition = (ID, _fullpath, children) => ({ ID, _fullpath, attributes: {}, children })
const reference = (_uid, target) => ({
  tag: 'SubTree',
  _uid,
  ID: target.ID,
  attributes: { ID: target.ID, _fullpath: target._fullpath },
  children: [],
})
const ids = (flow) => flow.nodes.map((node) => node.id)

function fixture() {
  const deep = definition('Deep', 'A/Deep', [node('30')])
  const a = definition('Worker', 'A', [node('10', [node('11'), reference('12', deep)])])
  const b = definition('Worker', 'B', [node('20', [node('21')])])
  const root = definition('RobotTree', '', [
    node('1', [reference('2', a), reference('3', b), node('4')]),
  ])
  const definitions = [root, a, b, deep]
  return { root, definitions, a, b, deep }
}

test('inline expansion preserves exact instances, UIDs, attributes and original definitions', () => {
  const { root, definitions } = fixture()
  const before = structuredClone(definitions)
  const full = expandBehaviorTreeFlow(root, definitions)
  assert.deepEqual(ids(full), ['1', '2', '3', '4', '10', '11', '12', '30', '20', '21'])
  assert.equal(new Set(ids(full)).size, full.nodes.length)
  assert.equal(full.edges.length, full.nodes.length - 1)
  assert.ok(full.edges.some((e) => e.source === '2' && e.target === '10'))
  assert.ok(full.edges.some((e) => e.source === '3' && e.target === '20'))
  assert.ok(full.edges.some((e) => e.source === '12' && e.target === '30'))
  assert.deepEqual(full.subtreeAncestors.get('30'), ['2', '12'])
  assert.equal(full.nodes.find((n) => n.id === '3').data.attributes._fullpath, 'B')
  assert.ok(full.nodes.every((n) => n.draggable === false))
  assert.deepEqual(definitions, before)
  assert.deepEqual(full.warnings, [])
})

test('subtrees start collapsed, show all on request, and can be collapsed again', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const statuses = new Map()
  for (const mode of ['hidden', 'all', 'hidden']) {
    const visible = filterBehaviorTreeFlow(full, statuses, mode, false)
    assert.deepEqual(ids(visible), mode === 'all' ? ids(full) : ['1', '2', '3', '4'])
    const visibleIds = new Set(ids(visible))
    assert.ok(visible.edges.every((e) => visibleIds.has(e.source) && visibleIds.has(e.target)))
  }
})

test('running subtrees expand through active descendants without inventing reference statuses', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const statuses = new Map([
    ['30', 'RUNNING'],
    ['2', 'IDLE'],
  ])
  assert.deepEqual(ids(filterBehaviorTreeFlow(full, statuses, 'running', false)), [
    '1',
    '2',
    '3',
    '4',
    '10',
    '11',
    '12',
    '30',
  ])
  assert.deepEqual(ids(filterBehaviorTreeFlow(full, statuses, 'running', true)), [
    '1',
    '2',
    '10',
    '12',
    '30',
  ])
  assert.deepEqual(ids(filterBehaviorTreeFlow(full, statuses, 'hidden', true)), ['1', '2'])
  assert.equal(statuses.get('2'), 'IDLE')
  statuses.set('30', 'IDLE')
  statuses.set('3', 'RUNNING')
  assert.deepEqual(ids(filterBehaviorTreeFlow(full, statuses, 'running', false)), [
    '1',
    '2',
    '3',
    '4',
    '20',
    '21',
  ])
  statuses.clear()
  assert.deepEqual(ids(filterBehaviorTreeFlow(full, statuses, 'running', true)), [])
})

test('seeking switches active subtree instances and reconstructs earlier visibility', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const { events } = recording([
    [0, '30', 'RUNNING'],
    [10, '30', 'IDLE'],
    [10, '21', 'RUNNING'],
  ])
  for (const [time, expected] of [
    [10, ['1', '3', '20', '21']],
    [0, ['1', '2', '10', '12', '30']],
    [10, ['1', '3', '20', '21']],
  ]) {
    assert.deepEqual(
      ids(
        filterBehaviorTreeFlow(full, reconstructPlayback(events, time).statuses, 'running', true),
      ),
      expected,
    )
  }
})

test('missing, ambiguous, recursive and UID-conflicting expansions remain leaf references with warnings', () => {
  const { root, definitions, a, b } = fixture()
  root.children[0].children.push(
    reference('99', definition('Missing', 'missing', [])),
    reference('98', root),
  )
  a.children[0]._uid = '1'
  definitions.push({ ...b })
  const full = expandBehaviorTreeFlow(root, definitions)
  assert.equal(new Set(ids(full)).size, full.nodes.length)
  assert.deepEqual(ids(full), ['1', '2', '3', '4', '99', '98'])
  assert.match(full.warnings.join('\n'), /duplicate node ID/)
  assert.match(full.warnings.join('\n'), /Ambiguous/)
  assert.match(full.warnings.join('\n'), /Could not resolve/)
  assert.match(full.warnings.join('\n'), /Recursive/)
})

test('fallback IDs stay distinct between definitions and never become recording UIDs', () => {
  const a = definition('Worker', 'A', [node(undefined)])
  const b = definition('Worker', 'B', [node(undefined)])
  const root = definition('RobotTree', '', [reference('2', a), reference('3', b)])
  const full = expandBehaviorTreeFlow(root, [root, a, b])
  assert.deepEqual(ids(full), ['2', '3', 'fallback:2:0', 'fallback:3:0'])
  assert.equal(full.nodes[2].data._uid, undefined)
  assert.match(full.warnings.join('\n'), /fallback:2:0/)
  assert.match(full.warnings.join('\n'), /fallback:3:0/)
  a.children.push(node('fallback:2:0'))
  const collision = expandBehaviorTreeFlow(root, [root, a, b])
  assert.match(collision.warnings.join('\n'), /duplicate node ID/)
  assert.equal(new Set(ids(collision)).size, collision.nodes.length)
})

test('view state retains graph objects and positions unless the visible structure changes', () => {
  const { root, definitions } = fixture()
  const statuses = reactive(new Map())
  const view = useBehaviorTreeView(
    shallowRef(root),
    shallowRef(definitions),
    shallowRef(undefined),
    shallowRef(statuses),
  )
  assert.equal(view.subtrees.value, 'hidden')
  assert.equal(view.runningPathOnly.value, false)
  const original = view.graph.value
  assert.deepEqual(original.nodes[0].position, { x: 0, y: 0 })
  statuses.set('30', 'RUNNING')
  assert.equal(view.graph.value, original, 'Hidden descendants must not cause relayout')
  view.subtrees.value = 'running'
  const running = view.graph.value
  assert.deepEqual(running.nodes[0].position, original.nodes[0].position)
  assert.ok(ids(running).includes('30'))
  statuses.set('11', 'SUCCESS')
  assert.equal(view.graph.value, running, 'Status-only updates retain the same graph')
  view.runningPathOnly.value = true
  assert.deepEqual(ids(view.graph.value), ['1', '2', '10', '12', '30'])
  statuses.set('30', 'IDLE')
  assert.deepEqual(ids(view.graph.value), [])
  statuses.set('30', 'RUNNING')
  assert.deepEqual(ids(view.graph.value), ['1', '2', '10', '12', '30'])
  view.runningPathOnly.value = false
  view.subtrees.value = 'all'
  const all = view.graph.value
  assert.deepEqual(all.nodes[0].position, original.nodes[0].position)
  statuses.clear()
  assert.equal(view.graph.value, all, 'Show all does not relayout during playback')
})
