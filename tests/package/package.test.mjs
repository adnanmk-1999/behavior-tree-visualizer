import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { build } from 'vite'

test('packed viewer installs, type-checks and builds without repository aliases or demo files', async (t) => {
  const root = resolve(import.meta.dirname, '../..')
  const consumer = await mkdtemp(join(tmpdir(), 'bt-viewer-consumer-'))
  t.after(() => rm(consumer, { recursive: true, force: true }))
  const run = (command, args, cwd = consumer) =>
    execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
  const [archive] = JSON.parse(
    run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', consumer], root),
  )
  assert.deepEqual(archive.files.map(({ path }) => path).sort(), [
    'README.md',
    'dist-library/components/BehaviorTreePlayer.vue.d.ts',
    'dist-library/components/BehaviorTreeViewer.vue.d.ts',
    'dist-library/index.d.ts',
    'dist-library/index.js',
    'dist-library/style.css',
    'dist-library/types/behaviorTree.d.ts',
    'dist-library/types/behaviorTreeEvents.d.ts',
    'dist-library/utils/parseBehaviorTree.d.ts',
    'dist-library/utils/parseBehaviorTreeEvents.d.ts',
    'package.json',
    'public/licenses/material-design-icons.txt',
  ])
  for (const { path } of archive.files) {
    if (path.endsWith('.js') || path.endsWith('.d.ts')) {
      assert.doesNotMatch(await readFile(join(root, path), 'utf8'), /['"]@\//, path)
    }
  }
  const bundle = await readFile(join(root, 'dist-library/index.js'), 'utf8')
  assert.match(bundle, /from ["']vue["']/)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(manifest.dependencies.vue, undefined)
  assert.equal(manifest.peerDependencies.vue, '^3.5.0')
  assert.deepEqual(Object.keys(manifest.exports), ['.', './style.css'])

  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  run('npm', [
    'install',
    join(consumer, archive.filename),
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ])
  assert.deepEqual(
    JSON.parse(
      run('node', [
        '--input-type=module',
        '-e',
        `import * as api from '${archive.name}'; console.log(JSON.stringify(Object.keys(api)))`,
      ]),
    ),
    ['BehaviorTreePlayer', 'BehaviorTreeViewer', 'parseBehaviorTree', 'parseBehaviorTreeEvents'],
  )
  await writeFile(
    join(consumer, 'index.html'),
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Viewer package check</title></head>
<body><button id="update">Update status</button><div id="app" style="height:600px"></div>
<script type="module" src="/main.ts"></script></body></html>`,
  )
  await writeFile(
    join(consumer, 'main.ts'),
    `
import { createApp, h, shallowRef } from 'vue'
import {
  BehaviorTreeViewer, BehaviorTreePlayer, parseBehaviorTree, parseBehaviorTreeEvents,
  type NodeStatusMap, type BehaviorTreeRecording, type PlaybackMode,
} from '${archive.name}'
import '${archive.name}/style.css'
const doc = parseBehaviorTree('<root BTCPP_format="4"><BehaviorTree ID="Main"><Sequence _uid="1"><Action ID="Move" _uid="2"/></Sequence></BehaviorTree></root>')
const statuses = shallowRef<NodeStatusMap>(new Map([['2', 'RUNNING']]))
type Props = InstanceType<typeof BehaviorTreeViewer>['$props']
const props: Props = { tree: doc.behaviorTrees[0]!, definitions: doc.behaviorTrees }
const recording: BehaviorTreeRecording = parseBehaviorTreeEvents({
  version: 1, sourceTopic: '/behavior_tree_log', startTimestampNs: '0', durationMs: 1000,
  events: [
    { index: 0, timestampNs: '0', offsetMs: 0, uid: '2', nodeName: 'Move', previousStatus: 'IDLE', currentStatus: 'RUNNING' },
    { index: 1, timestampNs: '1000000000', offsetMs: 1000, uid: '2', nodeName: 'Move', previousStatus: 'RUNNING', currentStatus: 'SUCCESS' },
  ],
})
type PlayerProps = InstanceType<typeof BehaviorTreePlayer>['$props']
const mode = shallowRef<PlaybackMode>('replay')
const playerProps: PlayerProps = { ...props, recording, statuses: statuses.value, mode: mode.value }
// @ts-expect-error callers must explicitly select live or replay
const missingMode: PlayerProps = { ...props, recording }
// @ts-expect-error undefined is not a playback mode
const undefinedMode: PlayerProps = { ...props, mode: undefined }
// @ts-expect-error the player also requires a tree and definitions
const missingPlayerProps: PlayerProps = {}
// @ts-expect-error only live and replay modes are supported
const invalidMode: PlaybackMode = 'record'
// @ts-expect-error the viewer requires a tree and definitions
const missingProps: Props = {}
// @ts-expect-error status keys are string UIDs
const invalidStatuses: NodeStatusMap = new Map([[2, 'RUNNING']])
void missingProps
void invalidStatuses
void missingPlayerProps
void missingMode
void undefinedMode
void invalidMode
createApp({ render: () => h('div', [
  h(BehaviorTreeViewer, { ...props, statuses: statuses.value }),
  h(BehaviorTreePlayer, {
    ...playerProps, statuses: statuses.value, mode: mode.value,
  }),
  h(BehaviorTreePlayer, {
    ...playerProps, showModeSwitch: true, mode: mode.value,
    'onUpdate:mode': (value: PlaybackMode) => { mode.value = value },
  }),
]) }).mount('#app')
document.querySelector('#update')!.addEventListener('click', () => {
  statuses.value = new Map([['2', 'SUCCESS']])
})
`,
  )
  await writeFile(join(consumer, 'env.d.ts'), "declare module '*.css' {}\n")
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: [],
      },
      include: ['*.ts'],
    }),
  )
  run(join(root, 'node_modules/.bin/tsc'), ['-p', join(consumer, 'tsconfig.json')])
  await build({
    root: consumer,
    configFile: false,
    build: { outDir: join(root, 'node_modules/.tmp/package-consumer'), emptyOutDir: true },
  })
})
