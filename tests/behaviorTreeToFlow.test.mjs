import assert from 'node:assert/strict'
import { test } from 'node:test'
import { behaviorTreeToFlow } from '../src/utils/behaviorTreeToFlow.ts'
import { layoutTree, NODE_HEIGHT, NODE_WIDTH } from '../src/utils/layoutTree.ts'

function node(tag, uid, children = [], attributes = {}) {
  return { tag, name: tag, _uid: uid, ID: attributes.ID, attributes, children }
}

function tree(children) {
  return { ID: 'TestTree', _fullpath: '', attributes: {}, children }
}

test('conversion preserves preorder, metadata and every parent-child edge without mutating input', () => {
  const input = tree([
    node('Sequence', '1', [
      node('Script', '20', [], { code: 'x:=true' }),
      node('Sequence', '3', [node('CustomAction', '004')]),
      node('SubTree', '5', [], { ID: 'MissionBody', _fullpath: 'MissionBody::5' }),
    ]),
  ])
  const before = structuredClone(input)
  const flow = behaviorTreeToFlow(input)
  assert.deepEqual(
    flow.nodes.map((n) => n.id),
    ['1', '20', '3', '004', '5'],
  )
  assert.deepEqual(
    flow.edges.map((e) => [e.source, e.target]),
    [
      ['1', '20'],
      ['1', '3'],
      ['3', '004'],
      ['1', '5'],
    ],
  )
  assert.equal(flow.nodes[1].data.attributes.code, 'x:=true')
  assert.equal(flow.nodes[3].data._uid, '004')
  assert.equal(flow.nodes[3].data.tag, 'CustomAction')
  assert.equal(flow.nodes[4].data.ID, 'MissionBody')
  assert.equal(flow.nodes[4].data.label, 'MissionBody')
  assert.equal(flow.nodes[4].data.category, 'SubTree')
  assert.equal(flow.nodes[4].data.registeredType, 'SubTree')
  assert.ok(flow.nodes.every((n) => n.type === 'behavior-tree'))
  assert.ok(
    flow.nodes.every((n) => n.draggable === false),
    'Group keyboard movement stays disabled',
  )
  assert.equal(flow.nodes[4].data.attributes._fullpath, 'MissionBody::5')
  assert.equal(flow.nodes[4].class, 'subtree-reference')
  assert.equal(flow.nodes[4].domAttributes.title, 'Open MissionBody')
  assert.equal(flow.nodes[1].class, undefined)
  assert.ok(flow.nodes.every((n) => n.data.idSource === 'uid'))
  assert.deepEqual(flow.warnings, [])
  assert.deepEqual(behaviorTreeToFlow(input), flow)
  assert.deepEqual(input, before)
})

test('conversion passes model categories and registered generic types without changing raw attributes', () => {
  const input = tree([
    node('Action', '44', [], { ID: 'RobotCheck', name: 'Check safety', code: ' x < 3 && {goal} ' }),
    node('Unregistered', '45'),
  ])
  const models = { RobotCheck: 'Condition' }
  const before = structuredClone({ input, models })
  const [generic, unknown] = behaviorTreeToFlow(input, models).nodes
  assert.equal(generic.data.registeredType, 'RobotCheck')
  assert.equal(generic.data.category, 'Condition')
  assert.equal(generic.data.tag, 'Action')
  assert.deepEqual(generic.data.attributes, input.children[0].attributes)
  assert.notEqual(generic.data.attributes, input.children[0].attributes)
  assert.equal(unknown.data.category, 'Unknown')
  assert.deepEqual({ input, models }, before)
})

test('missing and blank UIDs get deterministic display IDs and warnings, never fabricated UIDs', () => {
  const input = tree([node('Sequence', undefined, [node('Script', ''), node('Script', '  ')])])
  const flow = behaviorTreeToFlow(input)
  assert.deepEqual(
    flow.nodes.map((n) => n.id),
    ['fallback:0', 'fallback:0.0', 'fallback:0.1'],
  )
  assert.deepEqual(
    flow.nodes.map((n) => n.data._uid),
    [undefined, '', '  '],
  )
  assert.ok(flow.nodes.every((n) => n.data.idSource === 'fallback'))
  assert.equal(flow.warnings.length, 3)
  assert.ok(flow.warnings.every((warning) => warning.includes('cannot match recording UIDs')))
  assert.deepEqual(behaviorTreeToFlow(input), flow)
})

test('duplicate UIDs and collisions with fallback IDs fail explicitly', () => {
  assert.throws(
    () => behaviorTreeToFlow(tree([node('A', '1'), node('B', '1')])),
    /Duplicate node ID "1"/,
  )
  for (const nodes of [
    [node('A', undefined), node('B', 'fallback:0')],
    [node('A', 'fallback:1'), node('B', undefined)],
  ]) {
    assert.throws(() => behaviorTreeToFlow(tree(nodes)), /Duplicate node ID/)
  }
})

test('edge IDs cannot collide when UIDs contain delimiters', () => {
  const flow = behaviorTreeToFlow(
    tree([node('A', 'a:b', [node('B', 'c')]), node('A', 'a', [node('B', 'b:c')])]),
  )
  assert.equal(new Set(flow.edges.map((edge) => edge.id)).size, 2)
})

test('SubTrees stay leaf references and TreeNodesModel metadata is excluded', () => {
  const flow = behaviorTreeToFlow(
    tree([
      node('SubTree', '1', [node('Action', '2')], { ID: 'TestTree' }),
      node('TreeNodesModel', '3', [node('Action', '4')]),
    ]),
  )
  assert.deepEqual(
    flow.nodes.map((n) => n.id),
    ['1'],
  )
  assert.deepEqual(flow.edges, [])
})

test('Dagre positions are deterministic, top-down, non-overlapping and retain XML sibling order', () => {
  const input = behaviorTreeToFlow(
    tree([
      node('Sequence', '90', [
        node('Sequence', '20', [node('Action', '50'), node('Action', '4')]),
        node('Action', '3'),
        node('Sequence', '11', [node('Action', '5')]),
      ]),
    ]),
  )
  const before = structuredClone(input)
  const result = layoutTree(input)
  const byId = new Map(result.nodes.map((n) => [n.id, n]))
  assert.deepEqual(input, before)
  assert.deepEqual(layoutTree(input), result)
  assert.deepEqual(result.edges, input.edges)
  assert.deepEqual(
    result.nodes.map((n) => n.id),
    input.nodes.map((n) => n.id),
  )
  for (const n of result.nodes) {
    assert.equal(n.width, NODE_WIDTH)
    assert.equal(n.height, NODE_HEIGHT)
    assert.equal(n.sourcePosition, 'bottom')
    assert.equal(n.targetPosition, 'top')
    assert.ok(Number.isFinite(n.position.x) && Number.isFinite(n.position.y))
    const children = result.edges.filter((e) => e.source === n.id).map((e) => byId.get(e.target))
    children.forEach((child, index) => {
      assert.ok(child.position.y >= n.position.y + NODE_HEIGHT)
      if (index > 0) assert.ok(child.position.x > children[index - 1].position.x)
    })
  }
  for (let i = 0; i < result.nodes.length; i++) {
    for (const other of result.nodes.slice(i + 1)) {
      const current = result.nodes[i]
      assert.ok(
        Math.abs(current.position.x - other.position.x) >= NODE_WIDTH ||
          Math.abs(current.position.y - other.position.y) >= NODE_HEIGHT,
        `${current.id} overlaps ${other.id}`,
      )
    }
  }
  const single = layoutTree(behaviorTreeToFlow(tree([node('Action', '0')]))).nodes[0]
  assert.deepEqual(single.position, { x: 0, y: 0 }, 'Dagre centers must become top-left positions')
  assert.deepEqual(layoutTree(behaviorTreeToFlow(tree([]))).nodes, [])
})
