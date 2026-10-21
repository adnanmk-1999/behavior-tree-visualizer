import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectScope, shallowRef, watch } from 'vue'
import { useBehaviorTreePlayback } from '../src/composables/useBehaviorTreePlayback.ts'
import { useTreeNavigation } from '../src/composables/useTreeNavigation.ts'
import { recording } from './helpers/behaviorTreeEvents.mjs'

function setup(
  t,
  input = recording([
    [0, '1', 'IDLE'],
    [500, '44', 'RUNNING'],
    [1000, '44', 'SUCCESS'],
  ]),
) {
  let now = 0
  let nextId = 1
  const frames = new Map()
  const previousRequest = globalThis.requestAnimationFrame
  const previousCancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId++
    frames.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = (id) => frames.delete(id)
  t.mock.method(performance, 'now', () => now)
  const source = shallowRef(input)
  const scope = effectScope()
  const playback = scope.run(() => useBehaviorTreePlayback(source))
  t.after(() => {
    scope.stop()
    if (previousRequest) globalThis.requestAnimationFrame = previousRequest
    else delete globalThis.requestAnimationFrame
    if (previousCancel) globalThis.cancelAnimationFrame = previousCancel
    else delete globalThis.cancelAnimationFrame
  })
  return {
    ...playback,
    source,
    scope,
    frames,
    clock(time) {
      now = time
    },
    frame(time) {
      now = time
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((callback) => callback(now))
    },
  }
}

test('play, pause and resume use monotonic elapsed time and keep one pending frame', (t) => {
  const p = setup(t)
  assert.equal(p.state.positionMs, 0)
  assert.equal(p.state.speed, 1)
  assert.equal(p.statuses.get('1'), 'IDLE')
  assert.equal(p.statuses.has('44'), false)
  p.play()
  p.play()
  assert.equal(p.frames.size, 1)
  p.frame(250)
  assert.equal(p.state.positionMs, 250)
  p.clock(300)
  p.pause()
  assert.equal(p.state.positionMs, 300)
  assert.equal(p.frames.size, 0)
  p.frame(5000)
  assert.equal(p.state.positionMs, 300)
  p.play()
  p.frame(5200)
  assert.equal(p.state.positionMs, 500)
  assert.equal(p.statuses.get('44'), 'RUNNING')
})

test('speed changes account for the old speed before rebasing the clock', (t) => {
  const p = setup(t)
  p.play()
  p.frame(100)
  p.clock(150)
  p.setSpeed(2)
  assert.equal(p.state.positionMs, 150)
  p.frame(250)
  assert.equal(p.state.positionMs, 350)
  p.setSpeed(0.5)
  p.frame(350)
  assert.equal(p.state.positionMs, 400)
  p.setSpeed(4)
  p.frame(450)
  assert.equal(p.state.positionMs, 800)
  p.setSpeed(0)
  p.setSpeed(NaN)
  assert.equal(p.state.speed, 4)
  p.frame(500)
  assert.equal(p.state.positionMs, 1000)
  assert.equal(p.state.isPlaying, false)
})

test('forward/backward seeks, IDLE and reset reconstruct correctly while preserving map identity', (t) => {
  const p = setup(
    t,
    recording([
      [0, '1', 'SUCCESS'],
      [1000, '44', 'RUNNING'],
      [1300, '44', 'SUCCESS'],
      [2800, '44', 'IDLE'],
    ]),
  )
  const map = p.statuses
  p.seek(1500)
  assert.equal(p.statuses.get('44'), 'SUCCESS')
  p.seek(1100)
  assert.equal(p.statuses.get('44'), 'RUNNING')
  p.seek(2800)
  assert.equal(p.statuses.get('44'), 'IDLE')
  p.seek(999)
  assert.equal(p.statuses.has('44'), false)
  p.play()
  p.frame(10)
  p.reset()
  assert.equal(p.state.positionMs, 0)
  assert.equal(p.state.isPlaying, false)
  assert.equal(p.frames.size, 0)
  assert.deepEqual([...p.statuses], [['1', 'SUCCESS']])
  assert.equal(p.statuses, map)
  p.seek(-10)
  p.seek(NaN)
  assert.equal(p.state.positionMs, 0)
})

test('seeking during playback rebases time, reaching the end stops, and Play restarts', (t) => {
  const p = setup(t)
  p.play()
  p.frame(600)
  p.seek(100)
  assert.equal(p.state.isPlaying, true)
  assert.equal(p.statuses.has('44'), false)
  p.frame(700)
  assert.equal(p.state.positionMs, 200)
  p.seek(10000)
  assert.equal(p.state.positionMs, 1000)
  assert.equal(p.state.isPlaying, false)
  assert.equal(p.frames.size, 0)
  p.play()
  assert.equal(p.state.positionMs, 0)
  assert.equal(p.statuses.has('44'), false)
  p.frame(800)
  assert.equal(p.state.positionMs, 100)
})

test('unchanged final statuses do not trigger reactive updates even after many transitions', (t) => {
  const p = setup(
    t,
    recording([
      [0, '1', 'IDLE'],
      [10, '1', 'RUNNING'],
      [20, '1', 'IDLE'],
      [100, '1', 'SUCCESS'],
    ]),
  )
  let updates = 0
  const stop = watch(
    () => p.statuses.get('1'),
    () => updates++,
    { flush: 'sync' },
  )
  t.after(stop)
  p.play()
  p.frame(30)
  p.frame(40)
  assert.equal(updates, 0)
  p.frame(100)
  assert.equal(updates, 1)
})

test('subtree navigation leaves playback running and preserves statuses for every UID', (t) => {
  const p = setup(t)
  const root = { ID: 'RobotTree', _fullpath: '', children: [], attributes: {} }
  const child = { ID: 'MissionBody', _fullpath: 'MissionBody::34', children: [], attributes: {} }
  const document = shallowRef({ behaviorTrees: [root, child] })
  const nav = p.scope.run(() => useTreeNavigation(document))
  p.play()
  p.frame(600)
  nav.openSubTree({ tag: 'SubTree', ID: child.ID, attributes: { _fullpath: child._fullpath } })
  assert.equal(nav.currentTree.value, child)
  assert.equal(p.state.positionMs, 600)
  assert.equal(p.state.isPlaying, true)
  assert.equal(p.statuses.get('44'), 'RUNNING')
  nav.goTo(0)
  p.frame(800)
  assert.equal(p.state.positionMs, 800)
  assert.equal(nav.currentTree.value, root)
})

test('recording replacement and scope disposal cancel frames and reset state', (t) => {
  const p = setup(t)
  p.play()
  p.frame(600)
  p.source.value = recording([[0, '99', 'SKIPPED']])
  assert.equal(p.frames.size, 0)
  assert.equal(p.state.isPlaying, false)
  assert.deepEqual([...p.statuses], [['99', 'SKIPPED']])
  p.play()
  assert.equal(p.frames.size, 0, 'Instant recordings have nothing to advance')
  p.source.value = recording()
  p.play()
  assert.equal(p.frames.size, 0)
  p.source.value = null
  p.play()
  assert.equal(p.frames.size, 0)
  p.source.value = recording([
    [0, '1', 'IDLE'],
    [1000, '1', 'SUCCESS'],
  ])
  p.play()
  assert.equal(p.frames.size, 1)
  p.scope.stop()
  assert.equal(p.frames.size, 0)
  assert.equal(p.state.isPlaying, false)
})
