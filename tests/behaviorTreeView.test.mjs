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
  assert.deepEqual(full.branchAncestors.get('30'), ['1', '2', '10', '12'])
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

test('individual expansion preserves exact instances, nested choices, and visible connections', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const before = structuredClone(full)
  const overrides = new Map([['2', true]])
  const visible = () => filterBehaviorTreeFlow(full, new Map(), 'hidden', false, overrides)
  assert.deepEqual(ids(visible()), ['1', '2', '3', '4', '10', '11', '12'])
  assert.ok(!ids(visible()).includes('20'), 'Same-named instance B must remain collapsed')
  assert.ok(visible().edges.some((e) => e.source === '2' && e.target === '10'))
  overrides.set('12', true)
  assert.ok(ids(visible()).includes('30'))
  overrides.set('2', false)
  assert.deepEqual(ids(visible()), ['1', '2', '3', '4'])
  overrides.set('2', true)
  const restored = visible()
  assert.ok(ids(restored).includes('30'), 'Nested toggle survives closing its ancestor')
  const visibleIds = new Set(ids(restored))
  assert.ok(restored.edges.every((e) => visibleIds.has(e.source) && visibleIds.has(e.target)))
  assert.deepEqual(full, before)
})

test('manual toggles override bulk modes while the running-path filter remains independent', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const statuses = new Map([['30', 'RUNNING']])
  const overrides = new Map([
    ['2', false],
    ['3', true],
  ])
  const all = filterBehaviorTreeFlow(full, statuses, 'all', false, overrides)
  assert.deepEqual(ids(all), ['1', '2', '3', '4', '20', '21'])
  const running = filterBehaviorTreeFlow(full, statuses, 'running', false, overrides)
  assert.deepEqual(ids(running), ids(all))
  const path = filterBehaviorTreeFlow(full, statuses, 'running', true, overrides)
  assert.deepEqual(ids(path), ['1', '2'])
  assert.ok(path.expandedBranchIds.has('3'), 'Expansion state is independent of path filtering')
  assert.ok(!path.expandedBranchIds.has('2'))
})

test('view toggles stay inline, cache unchanged layouts, and bulk modes reset overrides', () => {
  const { root, definitions } = fixture()
  const tree = shallowRef(root)
  const statuses = shallowRef(new Map())
  const view = useBehaviorTreeView(tree, shallowRef(definitions), shallowRef(undefined), statuses)
  const original = view.graph.value
  view.toggleBranch('4') // Leaf Controls have no branch to toggle.
  view.toggleBranch('missing')
  view.toggleBranch('12') // A reference hidden under a collapsed ancestor cannot be clicked.
  assert.equal(view.graph.value, original)
  view.toggleBranch('2')
  assert.equal(tree.value, root, 'Inline expansion must not navigate to another definition')
  assert.ok(view.expandedBranchIds.value.has('2'))
  assert.ok(view.hasSubtreeOverrides.value)
  const open = view.graph.value
  statuses.value = new Map([['10', 'RUNNING']])
  assert.equal(view.graph.value, open, 'Status-only changes retain layout')
  view.toggleBranch('12')
  assert.ok(ids(view.graph.value).includes('30'))
  view.toggleBranch('2')
  assert.deepEqual(ids(view.graph.value), ['1', '2', '3', '4'])
  view.toggleBranch('2')
  assert.ok(ids(view.graph.value).includes('30'))
  view.setSubtreeMode('hidden')
  assert.equal(view.hasSubtreeOverrides.value, false)
  assert.deepEqual(ids(view.graph.value), ['1', '2', '3', '4'])
  view.setSubtreeMode('all')
  view.toggleBranch('2')
  assert.ok(!ids(view.graph.value).includes('10'))
  view.toggleBranch('2')
  assert.equal(view.hasSubtreeOverrides.value, false)
  view.toggleBranch('2')
  view.setSubtreeMode('all')
  assert.ok(ids(view.graph.value).includes('10'), 'Choosing the current bulk mode resets overrides')
  view.toggleBranch('2')
  tree.value = definitions[1]
  assert.equal(
    view.hasSubtreeOverrides.value,
    false,
    'Changing definitions clears manual overrides',
  )
})

test('unresolved or empty references cannot pretend to expand', () => {
  const empty = definition('Empty', 'empty', [])
  const root = definition('RobotTree', '', [
    reference('1', empty),
    reference('2', definition('Missing', 'missing', [])),
  ])
  const view = useBehaviorTreeView(
    shallowRef(root),
    shallowRef([root, empty]),
    shallowRef(undefined),
    shallowRef(new Map()),
  )
  const before = view.graph.value
  view.toggleBranch('1')
  view.toggleBranch('2')
  assert.equal(view.graph.value, before)
  assert.equal(view.hasSubtreeOverrides.value, false)
  assert.equal(view.expandableBranchIds.value.size, 0)
  assert.match(view.graph.value.warnings.join('\n'), /Could not resolve/)
})

test('inline toggles anchor the clicked node through layout changes without needing a viewport move', () => {
  const { root, definitions } = fixture()
  const view = useBehaviorTreeView(
    shallowRef(root),
    shallowRef(definitions),
    shallowRef(undefined),
    shallowRef(new Map()),
  )
  for (const id of ['2', '12', '10', '10', '2', '2', '3', '3', '1', '1']) {
    const before = view.graph.value.nodes.find((n) => n.id === id)
    view.toggleBranch(id)
    const after = view.graph.value.nodes.find((n) => n.id === id)
    assert.deepEqual(after.position, before.position, `Toggling ${id} must not move its anchor`)
    assert.equal(after.width, before.width)
    for (const zoom of [0.2, 0.75, 1.5]) {
      const screenPosition = (node) => ({
        x: -125 + node.position.x * zoom,
        y: 63 + node.position.y * zoom,
      })
      assert.deepEqual(screenPosition(after), screenPosition(before), 'Same pan/zoom keeps focus')
    }
    const nodes = view.graph.value.nodes
    for (let i = 0; i < nodes.length; i++) {
      for (const b of nodes.slice(i + 1)) {
        const a = nodes[i]
        assert.ok(
          a.position.x + a.width <= b.position.x ||
            b.position.x + b.width <= a.position.x ||
            a.position.y + a.height <= b.position.y ||
            b.position.y + b.height <= a.position.y,
          `Anchored nodes ${a.id} and ${b.id} overlap`,
        )
      }
    }
  }
})

test('successful Controls hide descendants by default and seeking restores earlier visibility', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const { events } = recording([
    [0, '10', 'RUNNING'],
    [10, '10', 'SUCCESS'],
    [20, '10', 'IDLE'],
    [30, '10', 'FAILURE'],
    [40, '10', 'SKIPPED'],
  ])
  for (const time of [0, 10, 20, 30, 40, 10, 0]) {
    const statuses = reconstructPlayback(events, time).statuses
    const before = new Map(statuses)
    const visible = filterBehaviorTreeFlow(full, statuses, 'all', false)
    assert.ok(ids(visible).includes('10'), 'The successful parent stays visible')
    for (const child of ['11', '12', '30']) {
      assert.equal(ids(visible).includes(child), time !== 10)
    }
    const visibleIds = new Set(ids(visible))
    assert.ok(visible.edges.every((e) => visibleIds.has(e.source) && visibleIds.has(e.target)))
    assert.deepEqual(statuses, before, 'Folding must not change recorded execution statuses')
  }
  assert.deepEqual(
    ids(filterBehaviorTreeFlow(full, new Map([['1', 'SUCCESS']]), 'all', false)),
    ['1'],
    'A successful root remains available for reopening',
  )
})

test('Control toggles preserve nested choices and take priority over playback defaults', () => {
  const { root, definitions } = fixture()
  const statuses = shallowRef(new Map([['10', 'SUCCESS']]))
  const tree = shallowRef(root)
  const view = useBehaviorTreeView(tree, shallowRef(definitions), shallowRef(undefined), statuses)
  view.setSubtreeMode('all')
  assert.ok(!ids(view.graph.value).includes('11'))
  const closed = view.graph.value.nodes.find((n) => n.id === '10')
  view.toggleBranch('10')
  assert.ok(ids(view.graph.value).includes('30'))
  assert.equal(
    view.hasSubtreeOverrides.value,
    false,
    'Control choices are separate from Subtrees mode',
  )
  const opened = view.graph.value
  assert.equal(opened.nodes.find((n) => n.id === '10').width, closed.width)
  statuses.value = new Map([['10', 'RUNNING']])
  assert.equal(view.graph.value, opened)
  statuses.value = new Map([['10', 'SUCCESS']])
  assert.equal(view.graph.value, opened, 'A manually opened branch stays open at SUCCESS')
  view.toggleBranch('1')
  assert.deepEqual(ids(view.graph.value), ['1'])
  view.toggleBranch('1')
  assert.ok(
    ids(view.graph.value).includes('30'),
    'Nested choices survive closing a Control ancestor',
  )
  view.setSubtreeMode('hidden')
  view.setSubtreeMode('all')
  assert.ok(ids(view.graph.value).includes('30'), 'Subtrees mode does not reset Control choices')
  view.toggleBranch('10')
  statuses.value = new Map([['10', 'FAILURE']])
  assert.ok(!ids(view.graph.value).includes('11'), 'Manual closing also takes priority')
  tree.value = definitions[1]
  assert.ok(ids(view.graph.value).includes('11'), 'Changing trees resets Control choices')
})

test('automatic folding keeps RUNNING descendants visible without inferring ancestor status', () => {
  const { root, definitions } = fixture()
  const full = expandBehaviorTreeFlow(root, definitions)
  const statuses = new Map([
    ['10', 'SUCCESS'],
    ['30', 'RUNNING'],
  ])
  for (const onlyRunning of [false, true]) {
    assert.ok(ids(filterBehaviorTreeFlow(full, statuses, 'running', onlyRunning)).includes('30'))
  }
  statuses.set('30', 'IDLE')
  assert.ok(!ids(filterBehaviorTreeFlow(full, statuses, 'all', false)).includes('30'))
  assert.equal(statuses.get('10'), 'SUCCESS')
})

test('only registered Controls with execution children gain a child toggle', () => {
  const root = definition('RobotTree', '', [
    { ...node('1', [node('2')]), tag: 'Sequence' },
    { ...node('3', [node('4')]), tag: 'RobotControl' },
    { ...node('5', [node('6')]), tag: 'Action' },
    { ...node('7', [node('8')]), tag: 'Condition' },
    { ...node('9', [node('10')]), tag: 'ForceSuccess' },
    { ...node('11', [node('12')]), tag: 'Unregistered' },
    node('13'),
  ])
  const full = expandBehaviorTreeFlow(root, [root], { Sequence: 'Action', RobotControl: 'Control' })
  const statuses = new Map(full.nodes.map((node) => [node.id, 'SUCCESS']))
  const visible = filterBehaviorTreeFlow(full, statuses, 'all', false)
  assert.deepEqual([...visible.expandableBranchIds], ['3'])
  assert.deepEqual(
    ids(visible),
    ids(full).filter((id) => id !== '4'),
  )
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
