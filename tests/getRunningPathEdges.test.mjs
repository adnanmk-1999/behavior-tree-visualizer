import assert from 'node:assert/strict'
import { test } from 'node:test'
import { behaviorTreeToFlow } from '../src/utils/behaviorTreeToFlow.ts'
import { getRunningPathEdges } from '../src/utils/getRunningPathEdges.ts'
import { reconstructPlayback } from '../src/utils/playbackState.ts'
import { recording } from './helpers/behaviorTreeEvents.mjs'

function node(uid, children = [], tag = 'Action', attributes = {}) {
  return { tag, name: 'Repeated name', _uid: uid, ID: attributes.ID, attributes, children }
}

function flow(children = [node('1', [node('2', [node('3'), node('4')]), node('5')])]) {
  return behaviorTreeToFlow({ ID: 'TestTree', attributes: {}, children })
}

test('a running leaf highlights its entire ancestor route without inventing parent statuses', () => {
  const tree = flow()
  const statuses = new Map([
    ['1', 'IDLE'],
    ['2', 'SUCCESS'],
    ['3', 'FAILURE'],
    ['4', 'RUNNING'],
  ])
  const beforeTree = structuredClone(tree)
  const beforeStatuses = new Map(statuses)
  assert.deepEqual(getRunningPathEdges(tree, statuses), new Set(['edge:2:4', 'edge:1:2']))
  assert.deepEqual(tree, beforeTree)
  assert.deepEqual(statuses, beforeStatuses)
})

test('parallel routes share ancestors and disappear only when no running node needs them', () => {
  const tree = flow()
  const statuses = new Map([
    ['3', 'RUNNING'],
    ['4', 'RUNNING'],
    ['5', 'RUNNING'],
  ])
  assert.deepEqual(
    getRunningPathEdges(tree, statuses),
    new Set(['edge:1:2', 'edge:2:3', 'edge:2:4', 'edge:1:5']),
  )
  statuses.set('3', 'IDLE')
  assert.deepEqual(
    getRunningPathEdges(tree, statuses),
    new Set(['edge:1:2', 'edge:2:4', 'edge:1:5']),
  )
  statuses.set('4', 'SUCCESS')
  assert.deepEqual(getRunningPathEdges(tree, statuses), new Set(['edge:1:5']))
  statuses.set('5', 'SKIPPED')
  statuses.set('1', 'RUNNING')
  assert.deepEqual(
    getRunningPathEdges(tree, statuses),
    new Set(),
    'A running root does not imply running children',
  )
  assert.deepEqual(getRunningPathEdges(flow([]), statuses), new Set())
})

test('paths use normalized XML UIDs and stop at the current definition', () => {
  const tree = flow([
    node('1', [node(undefined, [node('0003')]), node('5', [], 'SubTree', { ID: 'HiddenTree' })]),
  ])
  const statuses = new Map([
    ['3', 'RUNNING'],
    ['99', 'RUNNING'],
    ['fallback:0.0', 'RUNNING'],
  ])
  assert.deepEqual(
    getRunningPathEdges(tree, statuses),
    new Set(['edge:1:fallback%3A0.0', 'edge:fallback%3A0.0:0003']),
  )
  statuses.set('3', 'IDLE')
  assert.deepEqual(
    getRunningPathEdges(tree, statuses),
    new Set(),
    'Hidden UIDs and fallback identities cannot light a route',
  )
  statuses.set('5', 'RUNNING')
  assert.deepEqual(getRunningPathEdges(tree, statuses), new Set(['edge:1:5']))
})

test('seeking backward and equal-time transitions restore the correct paths', () => {
  const tree = flow()
  const { events } = recording([
    [0, '3', 'RUNNING'],
    [10, '3', 'IDLE'],
    [10, '4', 'RUNNING'],
    [20, '4', 'SUCCESS'],
  ])
  for (const [time, edges] of [
    [10, ['edge:1:2', 'edge:2:4']],
    [5, ['edge:1:2', 'edge:2:3']],
    [20, []],
    [0, ['edge:1:2', 'edge:2:3']],
  ]) {
    assert.deepEqual(
      getRunningPathEdges(tree, reconstructPlayback(events, time).statuses),
      new Set(edges),
    )
  }
})
