import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  parseBehaviorTreeEvents,
  loadBehaviorTreeEvents,
} from '../src/utils/parseBehaviorTreeEvents.ts'
import {
  applyEventsThrough,
  getNodeStatus,
  reconstructPlayback,
} from '../src/utils/playbackState.ts'
import { recording } from './helpers/behaviorTreeEvents.mjs'

test('reconstruction is independent of seek order and uses currentStatus including IDLE', () => {
  const { events } = recording([
    [0, '1', 'SUCCESS'],
    [1000, '44', 'RUNNING'],
    [1300, '44', 'SUCCESS'],
    [2800, '44', 'IDLE'],
  ])
  const before = structuredClone(events)
  for (const [time, expected] of [
    [1500, 'SUCCESS'],
    [1100, 'RUNNING'],
    [2800, 'IDLE'],
    [999, 'UNOBSERVED'],
    [1300, 'SUCCESS'],
  ]) {
    const { statuses } = reconstructPlayback(events, time)
    assert.equal(getNodeStatus(statuses, '44'), expected)
    assert.equal(
      getNodeStatus(statuses, '900'),
      'UNOBSERVED',
      'No inference for unrecorded parents',
    )
  }
  assert.equal(getNodeStatus(reconstructPlayback(events, 0).statuses, '1'), 'SUCCESS')
  assert.equal(getNodeStatus(reconstructPlayback(events, -1).statuses, '1'), 'UNOBSERVED')
  assert.deepEqual(events, before)
})

test('every equal-time event is retained and the last transition per UID wins', () => {
  const input = recording([
    [0, '1', 'RUNNING'],
    [10, '44', 'RUNNING'],
    [10, '44', 'FAILURE'],
    [10, '44', 'IDLE'],
    [10, '45', 'SKIPPED'],
  ])
  const parsed = parseBehaviorTreeEvents(input)
  assert.deepEqual(parsed.events, input.events)
  const { statuses, nextEventIndex } = reconstructPlayback(parsed.events, 10)
  assert.equal(nextEventIndex, 5)
  assert.equal(statuses.get('44'), 'IDLE')
  assert.equal(statuses.get('45'), 'SKIPPED')
})

test('forward application resumes at its cursor and does not rescan old events', () => {
  const { events } = recording([
    [0, '1', 'IDLE'],
    [100, '2', 'RUNNING'],
    [200, '2', 'SUCCESS'],
  ])
  const statuses = new Map()
  let cursor = applyEventsThrough(events, 0, 50, statuses)
  assert.equal(cursor, 1)
  const guarded = new Proxy(events, {
    get(target, key) {
      assert.notEqual(key, '0', 'Previously applied events must not be read again')
      return Reflect.get(target, key)
    },
  })
  cursor = applyEventsThrough(guarded, cursor, 99, statuses)
  assert.equal(cursor, 1)
  cursor = applyEventsThrough(guarded, cursor, 200, statuses)
  assert.equal(cursor, 3)
  assert.deepEqual(statuses, reconstructPlayback(events, 200).statuses)
})

test('UID lookup normalizes decimal strings without using names or fallback IDs', () => {
  const statuses = new Map([
    ['3', 'RUNNING'],
    ['9007199254740993', 'FAILURE'],
  ])
  assert.equal(getNodeStatus(statuses, ' 0003 '), 'RUNNING')
  assert.equal(getNodeStatus(statuses, '9007199254740993'), 'FAILURE')
  for (const uid of [undefined, '', 'fallback:3', 'Repeated node name', '-3', '9007199254740992']) {
    assert.equal(getNodeStatus(statuses, uid), 'UNOBSERVED')
  }
})

test('loader validates exact integer timestamps and preserves nanosecond-separated events', () => {
  const input = recording([
    [0, '0003', 'IDLE'],
    [0.000001, '3', 'RUNNING'],
  ])
  const parsed = parseBehaviorTreeEvents(input)
  assert.equal(parsed.events[1].timestampNs, '1000000000000000001')
  assert.equal(parsed.events[0].uid, '3')
  assert.equal(getNodeStatus(reconstructPlayback(parsed.events, 0).statuses, '3'), 'IDLE')
  assert.equal(getNodeStatus(reconstructPlayback(parsed.events, 0.000001).statuses, '3'), 'RUNNING')
  const collapsed = structuredClone(input)
  collapsed.events[1].offsetMs = 0
  collapsed.durationMs = 0
  assert.throws(() => parseBehaviorTreeEvents(collapsed), /offsetMs disagrees/)
  assert.equal(parseBehaviorTreeEvents(recording()).startTimestampNs, null)
})

test('invalid metadata, fields, ordering and time ranges fail instead of being silently repaired', () => {
  const good = recording([
    [0, '1', 'IDLE'],
    [1, '2', 'SUCCESS'],
  ])
  for (const bad of [
    null,
    [],
    {},
    { ...good, version: 2 },
    { ...good, events: {} },
    { ...good, sourceTopic: '/other' },
    { ...good, durationMs: Infinity },
    { ...good, durationMs: 0.9999999 },
    { ...good, startTimestampNs: 1000 },
    { ...good, startTimestampNs: null },
    { ...good, messageCount: -1 },
    { ...good, uniqueUidCount: '2' },
    { ...good, unmatchedUids: [3] },
  ]) {
    assert.throws(() => parseBehaviorTreeEvents(bad), /Invalid recording/)
  }
  for (const patch of [
    { index: 0 },
    { timestampNs: '999999999999999999' },
    { timestampNs: 1000000 },
    { offsetMs: NaN },
    { offsetMs: -1 },
    { offsetMs: 0.5 },
    { uid: 2 },
    { uid: 'fallback:2' },
    { nodeName: null },
    { currentStatus: 'BROKEN' },
    { previousStatus: undefined },
  ]) {
    const bad = structuredClone(good)
    Object.assign(bad.events[1], patch)
    assert.throws(() => parseBehaviorTreeEvents(bad), /Invalid recording/)
  }
  const tie = recording([
    [0, '1', 'IDLE'],
    [0, '2', 'SUCCESS'],
  ])
  tie.events[1].offsetMs = 0.0000001
  tie.durationMs = 0.0000001
  assert.throws(() => parseBehaviorTreeEvents(tie), /offsetMs disagrees/)
})

test('fetch reports missing files and invalid JSON while passing cancellation through', async (t) => {
  const controller = new AbortController()
  const input = recording([[0, '1', 'IDLE']])
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/data/behavior-tree-events.json')
    assert.equal(options.signal, controller.signal)
    return new Response(JSON.stringify(input))
  })
  assert.deepEqual(await loadBehaviorTreeEvents(controller.signal), input)
  fetch.mock.mockImplementation(async () => new Response('', { status: 404 }))
  await assert.rejects(loadBehaviorTreeEvents(), /Recording not found.*Python exporter/)
  fetch.mock.mockImplementation(async () => new Response('', { status: 500 }))
  await assert.rejects(loadBehaviorTreeEvents(), /HTTP 500/)
  fetch.mock.mockImplementation(async () => new Response('<html>not JSON</html>'))
  await assert.rejects(loadBehaviorTreeEvents(), /not valid JSON/)
})

test('recording loads from the repository base path on GitHub Pages', async (t) => {
  const input = recording([[0, '1', 'IDLE']])
  const fetch = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/behavior-tree-visualizer/data/behavior-tree-events.json')
    return new Response(JSON.stringify(input))
  })
  assert.deepEqual(await loadBehaviorTreeEvents(undefined, '/behavior-tree-visualizer/'), input)
  fetch.mock.mockImplementation(async () => new Response('', { status: 404 }))
  await assert.rejects(
    loadBehaviorTreeEvents(undefined, '/behavior-tree-visualizer/'),
    /Recording not found at \/behavior-tree-visualizer\/data\/behavior-tree-events.json/,
  )
})

const realFile = new URL('../public/data/behavior-tree-events.json', import.meta.url)
test(
  'real recording retains all events and yields identical incremental and reconstructed states',
  { skip: !existsSync(realFile) },
  () => {
    const input = JSON.parse(readFileSync(realFile, 'utf8'))
    const parsed = parseBehaviorTreeEvents(input)
    assert.equal(parsed.events.length, 14802)
    assert.equal(new Set(parsed.events.map((event) => event.uid)).size, 217)
    assert.deepEqual(parsed.events, input.events)
    let cursor = 0
    const statuses = new Map()
    for (let time = 0; time < parsed.durationMs; time += 1000 / 60) {
      cursor = applyEventsThrough(parsed.events, cursor, time, statuses)
    }
    cursor = applyEventsThrough(parsed.events, cursor, parsed.durationMs, statuses)
    assert.equal(cursor, parsed.events.length)
    assert.deepEqual(statuses, reconstructPlayback(parsed.events, parsed.durationMs).statuses)
    for (const time of [18000, 1000, 35000, 0, 1100, 1500, parsed.durationMs]) {
      const expected = new Map(
        parsed.events
          .filter((event) => event.offsetMs <= time)
          .map((event) => [event.uid, event.currentStatus]),
      )
      assert.deepEqual(reconstructPlayback(parsed.events, time).statuses, expected)
    }
  },
)
