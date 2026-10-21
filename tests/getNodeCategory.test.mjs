import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getNodeCategory, getRegisteredNodeType } from '../src/utils/getNodeCategory.ts'

test('registered model categories take precedence over built-ins and generic tags', () => {
  const models = {
    MissionServer: 'Action',
    FollowPath: 'Action',
    IsLaserFrontHealthy: 'Condition',
    RecordDuringExecution: 'Decorator',
    Switch10: 'Control',
    Sequence: 'Decorator',
    ConflictingRegistration: 'Unknown',
  }
  for (const [tag, category] of Object.entries(models)) {
    assert.equal(getNodeCategory({ tag }, models), category)
  }
  assert.equal(getNodeCategory({ tag: 'Action', ID: 'IsLaserFrontHealthy' }, models), 'Condition')
  assert.equal(getNodeCategory({ tag: 'Action', ID: 'ConflictingRegistration' }, models), 'Unknown')
})

test('known built-ins classify without model metadata', () => {
  for (const tag of [
    'Sequence',
    'Fallback',
    'ReactiveSequence',
    'Parallel',
    'Switch2',
    'Switch5',
    'Switch6',
  ]) {
    assert.equal(getNodeCategory({ tag }), 'Control')
  }
  for (const tag of [
    'ForceSuccess',
    'RetryUntilSuccessful',
    'KeepRunningUntilFailure',
    'Inverter',
  ]) {
    assert.equal(getNodeCategory({ tag }), 'Decorator')
  }
  assert.equal(getNodeCategory({ tag: 'ScriptCondition' }), 'Condition')
  assert.equal(getNodeCategory({ tag: 'Script' }), 'Action')
})

test('generic syntax supplies both category and registered type, while SubTree IDs remain targets', () => {
  for (const tag of ['Action', 'Condition', 'Control', 'Decorator']) {
    assert.equal(getNodeCategory({ tag, ID: 'CustomNode' }), tag)
    assert.equal(getRegisteredNodeType({ tag, ID: 'CustomNode' }), 'CustomNode')
    assert.equal(getRegisteredNodeType({ tag }), tag)
  }
  const reference = { tag: 'SubTree', ID: 'MissionBody' }
  assert.equal(getNodeCategory(reference, { MissionBody: 'Action' }), 'SubTree')
  assert.equal(getRegisteredNodeType(reference), 'SubTree')
  assert.equal(getRegisteredNodeType({ tag: 'FollowPath', ID: 'unrelated-port' }), 'FollowPath')
})

test('names, child counts, prefixes and inherited keys cannot invent a category', () => {
  for (const tag of [
    'CustomNode',
    'IsHealthy',
    'SwitchRobot',
    'Switch99',
    'toString',
    '__proto__',
  ]) {
    assert.equal(
      getNodeCategory({ tag, name: 'Sequence', children: [{ tag: 'Action' }] }),
      'Unknown',
    )
  }
  assert.equal(
    getNodeCategory({ tag: 'RobotAction' }, Object.create({ RobotAction: 'Action' })),
    'Unknown',
  )
  assert.equal(
    getNodeCategory({ tag: '__proto__' }, JSON.parse('{"__proto__":"Action"}')),
    'Action',
  )
})
