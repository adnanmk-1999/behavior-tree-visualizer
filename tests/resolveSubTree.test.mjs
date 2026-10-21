import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveSubTree } from '../src/utils/resolveSubTree.ts'

function tree(ID, path) {
  return { ID, _fullpath: path, attributes: {}, children: [] }
}

function reference(ID, path) {
  return {
    tag: 'SubTree',
    ID,
    _uid: '047',
    attributes: path === undefined ? {} : { _fullpath: path },
  }
}

const mission = tree('RefreshFaultRegistry', 'MissionBody::34/RefreshFaultRegistry::47')
const emergency = tree('RefreshFaultRegistry', 'EmergencyRideBody::227/RefreshFaultRegistry::236')

test('exact paths resolve different instances of the same ID without changing input', () => {
  const definitions = [mission, emergency]
  const target = reference('RefreshFaultRegistry', mission._fullpath)
  const before = structuredClone({ definitions, target })
  assert.equal(resolveSubTree(target, definitions), mission)
  assert.equal(
    resolveSubTree(reference('RefreshFaultRegistry', emergency._fullpath), definitions),
    emergency,
  )
  assert.deepEqual({ definitions, target }, before)
})

test('a present path must match exactly and cannot fall back to a unique ID', () => {
  assert.throws(
    () => resolveSubTree(reference('RefreshFaultRegistry', 'wrong-path'), [mission]),
    /Could not resolve/,
  )
  assert.throws(
    () => resolveSubTree(reference('WrongID', mission._fullpath), [mission]),
    /Could not resolve/,
  )
  assert.throws(
    () => resolveSubTree(reference('RefreshFaultRegistry', ''), [mission]),
    /Could not resolve/,
  )
  const root = tree('RobotTree', '')
  assert.equal(
    resolveSubTree(reference('RobotTree', ''), [root, tree('RobotTree', 'nested')]),
    root,
  )
})

test('an absent path resolves by ID only when exactly one definition matches', () => {
  assert.equal(resolveSubTree(reference('RefreshFaultRegistry'), [mission]), mission)
  assert.throws(
    () => resolveSubTree(reference('RefreshFaultRegistry'), [mission, emergency]),
    /Ambiguous.*2 matching/,
  )
  assert.throws(() => resolveSubTree(reference('Missing'), [mission]), /Could not resolve/)
})

test('duplicate exact identities, missing IDs and non-SubTree nodes fail explicitly', () => {
  assert.throws(
    () =>
      resolveSubTree(reference('RefreshFaultRegistry', mission._fullpath), [
        mission,
        { ...mission },
      ]),
    /Ambiguous/,
  )
  assert.throws(() => resolveSubTree(reference(undefined), [mission]), /Expected a SubTree/)
  assert.throws(
    () => resolveSubTree({ ...reference('RefreshFaultRegistry'), tag: 'Action' }, [mission]),
    /Expected a SubTree/,
  )
})
