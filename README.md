[**Explore the live demo →**](https://adnanmk-1999.github.io/behavior-tree-visualizer/)

# Behavior Tree Viewer

**See the structure. Follow the execution.**

An interactive Vue 3 viewer for BehaviorTree.CPP trees. Explore nested branches,
inspect node details, and follow execution statuses inside your own application.

[Installation](#installation) · [Quick start](#quick-start) · [API](#api) · [Dependencies](#dependencies) · [Contributing](#contributing)

[![Behavior Tree Visualizer showing a robot behavior tree, highlighted running path, node statuses, and playback controls](https://raw.githubusercontent.com/adnanmk-1999/behavior-tree-visualizer/main/public/Behavior_Tree_Visualizer.png)](https://adnanmk-1999.github.io/behavior-tree-visualizer/)

_The demo combines the viewer with subtree navigation and recorded playback.
The package gives your application the viewer; you supply its data and timing._

## What you can do

- **Explore the hierarchy.** Automatic layout, expandable branches, and subtree boundaries make nested trees easier to follow.
- **Follow execution.** Display node statuses, highlight running paths, and focus on active branches.
- **Inspect the details.** Select a node to see its attributes, category, and execution status.
- **Navigate comfortably.** Pan, zoom, frame the diagram, and move between nodes with the keyboard.
- **Fit your application.** Use CSS theme variables and a typed Vue API with static, recorded, or live data.

The viewer is read-only. Your application owns loading, connections, navigation,
and playback timing; the component handles rendering and interaction.

## Installation

The package is available from **GitHub Packages** as
`@adnanmk-1999/behavior-tree-viewer`. Use Vue 3 (`^3.5.0`) and a modern browser.
For installation and local development, Node.js 24.12+ is supported; see
[package.json](https://github.com/adnanmk-1999/behavior-tree-visualizer/blob/main/package.json)
for the full Node.js version range.

Add this scope mapping to your application's `.npmrc`, beside `package.json`:

```ini
@adnanmk-1999:registry=https://npm.pkg.github.com
```

Authenticate with your GitHub username and a **personal access token (classic)**
with `read:packages` and access to this package. Use the token at the password
prompt; keep it in your user-level npm credentials, outside the repository.
An npmjs.com account is not required. See [GitHub's authentication guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

```sh
npm login --scope=@adnanmk-1999 --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @adnanmk-1999/behavior-tree-viewer@0.1.0
```

To download the package as a `.tgz` archive after authenticating, run
`npm pack @adnanmk-1999/behavior-tree-viewer@0.1.0`.

## Quick start

Import the component and stylesheet, parse your XML, and give the viewer a
container with a definite height. The component and parser run in the browser;
mount them on the client when using an SSR framework.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import {
  BehaviorTreeViewer,
  parseBehaviorTree,
  type NodeStatusMap,
} from '@adnanmk-1999/behavior-tree-viewer'
import '@adnanmk-1999/behavior-tree-viewer/style.css'

const document = parseBehaviorTree(`
  <root BTCPP_format="4">
    <BehaviorTree ID="Delivery">
      <Sequence _uid="1">
        <Condition ID="IsReady" _uid="2"/>
        <Action ID="MoveToGoal" _uid="3"/>
      </Sequence>
    </BehaviorTree>
  </root>
`)
const tree = document.behaviorTrees[0]!
const statuses = shallowRef<NodeStatusMap>(
  new Map([
    ['1', 'RUNNING'],
    ['2', 'SUCCESS'],
    ['3', 'RUNNING'],
  ]),
)
</script>

<template>
  <div style="height: 600px">
    <BehaviorTreeViewer
      class="my-tree"
      :tree="tree"
      :definitions="document.behaviorTrees"
      :node-models="document.nodeModels"
      :statuses="statuses"
    />
  </div>
</template>
```

For structured tree data, pass a `BehaviorTreeDefinition` directly; XML parsing
is optional.

### Update execution statuses

`NodeStatusMap` is a `ReadonlyMap<string, ExecutionStatus>`, keyed by node UID.
Use canonical unsigned decimal strings such as `"3"`, rather than node names or
padded strings such as `"0003"`.

Supported statuses are `IDLE`, `RUNNING`, `SUCCESS`, `FAILURE`, and `SKIPPED`.
Nodes absent from the map appear as **Not observed**. Replace a shallow-ref map
when a new snapshot arrives:

```ts
statuses.value = new Map([
  ['1', 'SUCCESS'],
  ['2', 'SUCCESS'],
  ['3', 'SUCCESS'],
])
```

The same interface works with a static snapshot, a playback controller, or live
updates from your application's API or WebSocket connection.

## API

### `BehaviorTreeViewer`

| Prop          | Type                                | Purpose                                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------------- |
| `tree`        | `BehaviorTreeDefinition`            | **Required.** The tree to display.                            |
| `definitions` | `readonly BehaviorTreeDefinition[]` | **Required.** Definitions used to resolve subtree references. |
| `nodeModels`  | `NodeCategoryMap`                   | Optional mapping of node type IDs to categories.              |
| `statuses`    | `NodeStatusMap`                     | Optional UID-to-status map. Defaults to an empty map.         |

The **`open-subtree`** event emits the reference node without its children
(`Omit<BehaviorTreeNode, 'children'>`). Handle it to navigate to another tree
inside your application. Expanding a subtree within the current view is built in.

### `parseBehaviorTree(xml)`

Returns a `BehaviorTreeDocument` containing `behaviorTrees`, `nodeModels`, and
root `attributes`. It expects `<root BTCPP_format="4">` and throws for malformed
XML or an invalid document structure. Definitions retain their document order;
UIDs and attributes remain strings, and subtrees remain references.

The parser preserves expressions as data and never executes them. It does not
load external includes or validate custom node schemas.

### TypeScript exports

- **Trees:** `BehaviorTreeDocument`, `BehaviorTreeDefinition`, `BehaviorTreeNode`, `SubTreeReference`.
- **Categories:** `NodeCategory`, `NodeCategoryMap`.
- **Statuses:** `NodeStatusMap`, `ExecutionStatus`, `DisplayStatus`.

## Make it yours

The viewer fills its container and inherits your application's font. Load the
font before mounting so the layout can measure labels correctly. Customize the
component in the quick-start example with CSS variables:

```css
.my-tree {
  --bt-background: #151b26;
  --bt-surface: #202a38;
  --bt-primary: #6ee7b7;
}
```

The default theme works without Vuetify. Inherited Vuetify `--v-theme-*` RGB
variables are also supported. See the [theme variables](https://github.com/adnanmk-1999/behavior-tree-visualizer/blob/main/src/assets/workspace.css)
and [category/status styles](https://github.com/adnanmk-1999/behavior-tree-visualizer/blob/main/src/assets/behaviorTreeAppearance.css)
for additional overrides. Give separate Vue apps on the same page distinct
`app.config.idPrefix` values for accessibility IDs.

<details>
<summary><strong>Keyboard and canvas controls</strong></summary>

| Action                      | Control                                              |
| --------------------------- | ---------------------------------------------------- |
| Inspect a node              | Click or Enter; Escape closes the inspector          |
| Expand or collapse a branch | Double-click, Space, or the node's plus/minus button |
| Navigate between nodes      | Arrow keys                                           |
| Pan                         | Drag the canvas or use W, A, S, D                    |
| Zoom                        | Scroll, plus/minus keys, or the zoom buttons         |
| Frame the diagram           | Fit tree or Readable view                            |
| Open a subtree separately   | Open subtree separately in the inspector             |

Keyboard shortcuts apply while the canvas or a node has focus. The toolbar also
provides a running-path filter, collapsed/all/running subtree modes, and
independent Subtree and Control highlighting.

</details>

## Dependencies

Built on these projects:

| Project                                   | Package                                  | Role                                                                                 |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| [Vue 3](https://vuejs.org/)               | `vue` — peer dependency, `^3.5.0`        | Component rendering and reactive updates, using your application's Vue installation. |
| [Vue Flow](https://vueflow.dev/)          | `@vue-flow/core` — dependency, `^1.48.2` | Interactive graph canvas, nodes, edges, pan, and zoom.                               |
| [Dagre](https://github.com/dagrejs/dagre) | `@dagrejs/dagre` — dependency, `^3.1.1`  | Automatic top-to-bottom layout of the tree.                                          |

Vue Flow and Dagre are installed with the package. TypeScript declarations and
the viewer stylesheet are included. Development uses Vite, TypeScript, and
`vue-tsc`.

The subtree icon uses Pictogrammers' Material Design Icons; its
[Apache 2.0 license and attribution](https://github.com/adnanmk-1999/behavior-tree-visualizer/blob/main/public/licenses/material-design-icons.txt)
are included in the package.

## Run the demo locally

```sh
git clone https://github.com/adnanmk-1999/behavior-tree-visualizer.git
cd behavior-tree-visualizer
npm ci
npm run dev
```

Open the URL printed by Vite. The playground uses the local viewer source and
loads `public/tree.xml` with `public/data/behavior-tree-events.json`. It adds
breadcrumbs, playback controls, seeking, and playback speeds. If the recording
is unavailable, the tree can still be explored.

## Contributing

Bug reports, documentation improvements, and focused pull requests are welcome.

1. Fork the repository if needed, and create a branch from **`develop`**.
2. Make your change and run the relevant checks described in [AGENTS.md](https://github.com/adnanmk-1999/behavior-tree-visualizer/blob/main/AGENTS.md).
3. Open a pull request targeting **`develop`**, with a short description of the change and how you verified it. Include a screenshot for visual changes.

Use [GitHub Issues](https://github.com/adnanmk-1999/behavior-tree-visualizer/issues)
to report a problem with reproduction steps and a small example tree when possible.
