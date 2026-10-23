# behavior-tree-visualizer

A Vue 3 and TypeScript Behavior Tree Visualizer. It loads the real
`public/tree.xml` file and displays `RobotTree` as a read-only Vue Flow graph.
Click nodes to inspect them; double-click SubTrees or Controls with children to
expand or collapse them inline. The inspector can open a subtree separately,
with breadcrumbs, Back, and Return to RobotTree for navigation.
The playback timeline loads the exported recording and shows each node's recorded
execution status at the selected time.

The engineering workspace uses the full window: tree navigation at the top,
recorded playback immediately above the graph, and controls anchored inside the
plain canvas. A single legend combines Category on the left and Status on the right
near the top left. The collapsible Tree Details panel above it shows node/connection
counts, zoom, and visibility state. Bottom-right icon groups provide zoom and view actions;
all ten blue-grey viewport buttons stay visible side by side in one horizontal row,
including Running path only, the three subtree expansion modes, and independent
Subtree and Control highlighting toggles.
Click a node to open the inspector on the right (below the
graph on smaller screens). Hover or focus the info icon at the top right of the
canvas for keyboard and mouse shortcuts; tapping also
toggles it. Definitions start collapsed.
**Fit tree** is the initial view; **Readable view** brings the root to a legible scale.
The interface uses the KopsiHub authenticated dark theme with yellow primary
controls, compact inherited typography, and 4px corners. Presentation tokens live
under `.bt-theme` in `src/assets/workspace.css`; category/status mappings in
`src/assets/behaviorTreeAppearance.css` are scoped by their owning components.
See [DESIGN.md](DESIGN.md) for the visual contract.

## Embedding and theming

Import `src/components/BehaviorTreeViewer.vue` from source and give its parent a
definite height. Pass the selected `tree`, parsed `definitions` (the document's
`behaviorTrees`), optional `nodeModels`, and optional UID `statuses` map. Handle
`open-subtree` to navigate separately. The viewer owns graph controls, inspection,
and the legend; `App.vue` owns standalone chrome, loading, navigation, and playback.
There is no package export map yet.
Source imports still use this repository's `@` alias; a future package build must
resolve those paths before KopsiHub consumes the package.

```vue
<div class="tree-host">
  <BehaviorTreeViewer
    :tree="tree"
    :definitions="document.behaviorTrees"
    :node-models="document.nodeModels"
    :statuses="statuses"
    @open-subtree="openSubtree"
  />
</div>
```

The host supplies those values and its navigation handler. For example,
`.tree-host { height: 640px; font-family: inherit; }` provides the sizing contract.
The viewer fills that height, scrolls internally when needed, and adapts to its
container width. Its CSS imports travel with the component; no `main.ts` stylesheet
import is required. The font is inherited and measured at mount; ensure the host
font is available then. Only standalone `index.html` sets `Roboto, sans-serif`,
without downloading a font.

Inherited Vuetify variables use RGB channel lists, such as
`--v-theme-primary: 255, 237, 0`. Supported roles are background, surface, primary,
on-primary, secondary, error, warning, info, success, on-surface, plus
`--v-border-color` and `--v-border-opacity`. Defaults match the KopsiHub dark theme.
Optional `subtree-blue`, `subtree-plum`, `subtree-cyan`, `subtree-violet`, `subtree-sand`,
`subtree-slate`, `subtree-indigo`, and `subtree-rose` roles set the eight boundary accents.
For direct `--bt-*` overrides, set the variable on the component's `.bt-theme` root;
the defaults are defined there, not on the document root. Playback selects and node hover descriptions remain native. Overlay buttons have
scoped light-grey hover/focus tooltips with dark text. Tooltips sit above their buttons,
centered where space permits and shifted inward at canvas edges. There are no custom portals, dialogs, or file pickers.
The info button uses a compact dark tooltip in the browser's native popover layer,
so scroll containers do not clip it. Its scoped `--bt-help-*` tokens inherit optional
`tooltip`/`on-tooltip` theme roles and the host border color, with KopsiHub fallbacks.
If mounting multiple independent Vue apps, assign each a distinct
`app.config.idPrefix` before mount so playback slider labels remain unique.

Run `npm test`, `npm run build` (includes type checking), and `npm run lint`.
With `npm run dev` running, open `/tests/parseBehaviorTree.html`; it should show PASS.
Chromium 128 was checked at desktop and
320/390/768px widths. Real KopsiHub integration and Firefox/WebKit are not yet tested.

## XML input

The Vue-independent `parseBehaviorTree(xml)` utility uses the browser's `DOMParser`
and expects `<root BTCPP_format="4">`. Definitions remain in document order in an
array because IDs can repeat. Each definition retains its `ID`, `_fullpath`,
attributes, and children. Node attributes, including `_uid`, remain strings;
missing paths and UIDs remain undefined. SubTree nodes retain their referenced
`ID` and attributes with empty children. Expressions and scripts are only data.

The parser reports malformed XML, unsupported document roots/versions, missing
definition/reference IDs, child elements inside SubTree references, and documents
without definitions. It does not validate custom node schemas, resolve references
or external includes, or execute node behavior. `TreeNodesModel` is excluded from
the executable hierarchy; its registered categories are retained in `nodeModels`.
The UI prefers `RobotTree` with an empty `_fullpath`,
falling back to the first `RobotTree` definition.

## WP-01 verification

Run `npm run type-check` and `npm run build`. With `npm run dev` running, open
`/tests/parseBehaviorTree.html` in a browser. This dependency-free check uses the
real browser parser and compares every definition, node, attribute, UID, and child
order with the supplied XML (53 definitions, 765 nodes, 52 SubTree references).
It also checks duplicate IDs, custom tags, missing optional metadata, unexpanded
self-references, inert script attributes, and malformed/invalid input. The counts
describe the supplied fixture; update them if `public/tree.xml` is replaced.

## WP-02 visualization

`behaviorTreeToFlow(tree, nodeModels)` converts one definition into Vue Flow nodes, edges, and
warnings, preserving XML preorder and node metadata. Node IDs are the exact `_uid`
strings. Missing or blank UIDs use deterministic `fallback:<child-index-path>` IDs
scoped to that definition, report warnings, and set `data.idSource` to `fallback`;
these IDs cannot match recordings. Any duplicate ID, including a collision between
a UID and a fallback ID, throws a visible error. SubTree references remain leaves
and display the referenced tree ID. There is no synthetic root.

`layoutTree(flow, measureLabel)` uses `@dagrejs/dagre` for a top-down layout with
160–360 pixel node widths, a fixed 76 pixel height, 20 pixel horizontal spacing,
and 160 pixel vertical spacing. The viewer measures names in the actual 24px bold
font using a canvas, reserving 40px for the stacked type/status column plus label
padding and borders. The pure layout utility uses a deterministic text-width estimate when no
measurement callback is supplied. Long names truncate at the maximum width;
full names remain available on hover and in the inspector. XML
sibling order is retained. The reusable `BehaviorTreeViewer` accepts a `tree`
prop, the document's `definitions`, and an optional `nodeModels` category map. It updates and resets its view when the definition changes,
and uses custom Behavior Tree nodes. Pan, zoom, and selection remain available; dragging, connecting,
reconnecting, and keyboard deletion are disabled. Connections use Vue Flow's
`step` style, including connections into expanded subtrees.

Run `npm test` for conversion/layout checks using Node's built-in test runner,
`npm run type-check`, `npm run lint`, and `npm run build`. The browser check at
`/tests/parseBehaviorTree.html` also verifies the actual `RobotTree` graph: 28
nodes, 27 edges, preserved sibling order, and no overlapping node rectangles.
In the app, check pan/zoom, selection, and that dragging nodes or handles and
pressing Delete/Backspace cannot change the graph. Check the browser console too.

## WP-03 subtree navigation

`resolveSubTree(reference, definitions)` is independent of Vue. A present
`attributes._fullpath` (including an empty string) must match exactly along with
the referenced `ID`. Only an absent path permits ID-only lookup, and only a
single match is accepted. Missing, mismatched, and ambiguous references produce
visible errors while leaving the current graph and history intact.

`useTreeNavigation` owns a stack of the original definition objects. Following
a reference already in the stack returns to that ancestor rather than adding a
cycle. Repeated IDs at different paths remain distinct. A newly loaded document
resets history to RobotTree. Breadcrumbs truncate the stack; clicking the current
breadcrumb leaves the graph unchanged. Repeated IDs include their full instance
path in breadcrumb labels, and the current instance path is shown above the graph.

Single-click any node, including a SubTree, to inspect it. Expandable nodes wait
500ms before opening the inspector so a double-click can cancel inspection;
leaf clicks and Enter respond immediately. Double-click a SubTree or Control with children
(or focus it and press Space) to expand or collapse that exact instance inline without opening
the inspector. Escape, clicking the canvas, or toggling a branch cancels pending inspection.
Arrow Up/Down moves focus to a parent/first child; Left/Right moves between siblings.
Enter toggles the focused node's inspector; Escape closes it. WASD pans the view and +/− zooms while the canvas or
a node has focus. Tab enters or leaves the graph instead of visiting every node.
The inspector's **Open subtree separately** action explicitly emits `open-subtree`,
including the original ID, UID, and attributes, and retains the breadcrumb workflow.
Trees open in **Fit tree** view, showing the whole-tree overview.
**Readable view** places the root near the top at 100% zoom (scaled down only to fit
a narrow container) for legible labels. Pan to reach other
branches; keyboard focus brings offscreen nodes into view. The
application keys each viewer by ID and path to isolate its viewport and selection
from the previous definition. Each graph is laid out on creation and positioned after
node initialization; pending view watchers are cancelled when superseded or unmounted.
Navigation does not retain the previous pan/zoom position.

`npm test` covers resolution, duplicate IDs/paths, failed navigation, exact history
identity, Back/Home/breadcrumb behavior, and ancestor/self references. The browser
check also resolves every real XML SubTree and verifies all requested WP-03 paths,
including the distinct MissionBody and EmergencyRideBody RefreshFaultRegistry
instances. In the app, follow RobotTree → MissionBody → ActionDispatchSwitch →
ExecDriveToPose, use Back and ancestor breadcrumbs, return Home, and check both
RefreshFaultRegistry paths. Verify the graph opens in Fit tree view and remains read-only.

## WP-04 custom nodes and inspection

`getNodeCategory(node, nodeModels)` prefers registered model categories, then the
explicit generic Action/Condition/Control/Decorator tag, then known BehaviorTree.CPP
built-ins. SubTree tags always represent references. Unknown or conflicting model
categories stay Unknown; display names and child counts never determine categories.
For generic syntax, `ID` is the registered type; for SubTrees it remains the target
tree ID. The metadata map is optional for conversion, so built-ins still work on
standalone definitions. Custom robotics types require the document's model map.

`BehaviorTreeNode` uses a two-row icon column: category above, execution status below,
with the name spanning both rows beside it. Expandable branches show a small bottom-right
plus when collapsed and minus when expanded. Click that button to toggle the branch without
opening the inspector; double-clicking the node or pressing Space still works.
Subtle dividers separate the cells. Icons are split arrows for Control, lightning
bolt for Action, checked diamond for Condition, wrapping arrow for Decorator, and
Pictogrammers' `mdi-sitemap-outline` for SubTree. Unknown is omitted from the legend;
unrecognized XML nodes retain a neutral question-mark fallback and inspector metadata.
The MDI SVG is bundled locally with its license in `public/licenses/material-design-icons.txt`.
Names use 24px text; long names truncate
and remain available in full on hover and in the inspector. UID, registered type,
category, exact status, and XML attributes remain in the inspector.

Node fills indicate recorded status on dark surfaces: yellow-tinted RUNNING,
green-tinted SUCCESS, red-tinted FAILURE, violet-gray IDLE, background-colored
SKIPPED, and ordinary surface-colored Not observed. Status symbols supplement
these fills; hover also shows the exact status. RUNNING, SUCCESS, and FAILURE have
yellow, green, and red inner rings. Success and failure use stronger tinted fills;
selection has a separate white outer outline, and keyboard focus a dashed yellow outline.
The legends inside the graph show the same category icons and recorded-status fills
and symbols. Handles remain invisible and non-connectable.

Click any node or press Enter on it to open `NodeInspector`.
Press Enter again on the same node or Escape within the viewer to close it. Escape
from inside the inspector returns focus to the inspected node.
For SubTrees and Controls with children, Space and double-click toggle contents in the current graph.
Use **Open subtree separately** in the inspector when a dedicated view is wanted. All XML attribute values are displayed as text,
including expressions and blackboard references. Close or click the canvas to
clear inspection. Navigation resets selection. The scrollable inspector appears
beside the diagram, or below it on narrow screens. Inspection does not recalculate
layout or reset zoom.

Run `npm test`, `npm run lint`, and `npm run build`. Classification tests cover
model precedence, generic syntax, built-ins and unknown types. Open
`/tests/parseBehaviorTree.html` for the native browser parser check, including
all 160 model entries, required categories, preserved attributes, and non-overlap
across all 53 definitions. For interaction checks:

1. In RobotTree, select UID 2 (ReactiveSequence → Control) and UID 4
   (MissionServer → Action); verify their details and selection outline.
2. Inspect MissionBody UID 34 (SubTree), then double-click the node to expand it inline. Verify
   UID 38 (RecordDuringExecution → Decorator) and UID 44 (ScriptCondition → Condition),
   including the exact `code` attribute. Check IsLaserFrontHealthy UID 59.
3. Open ActionDispatchSwitch → ExecFillin and inspect FollowPath UID 129.
   Check long attributes and Close. Use Open subtree separately to check Back, breadcrumbs and Return to RobotTree.
4. Check edges, pan/zoom, keyboard inspection, a narrow window, and the console.
   Confirm dragging nodes, creating connections and Delete/Backspace cannot edit.

The typed category and attribute data can be matched to the events exported by WP-05.

## WP-05 ROS 2 MCAP event export

The standalone `scripts/export_bt_events.py` reads `/behavior_tree_log` using the
official `mcap` and `mcap-ros2-support` packages and their
[ROS 2 decoder](https://mcap.dev/docs/python/ros2_noenv_example). No ROS installation,
Vue server, or Node backend is required. Use Python 3.10 or newer; this export was
verified with Python 3.14, `mcap==1.6.0`, and `mcap-ros2-support==0.6.0`.

From the project directory:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
.venv/bin/python scripts/export_bt_events.py \
  --bag recordings/behavior_tree_recording/behavior_tree_recording_0.mcap \
  --xml public/tree.xml \
  --output public/data/behavior-tree-events.json
```

The recording's embedded `ros2msg` schema defines `BehaviorTreeLog.event_log` as
an array of `BehaviorTreeStatusChange` messages. Each entry contains a
`builtin_interfaces/Time timestamp`, `string node_name`, `uint16 uid`, and string
`previous_status` / `current_status` fields. The exporter decodes these embedded
definitions; it does not parse CDR itself. `/behavior_tree_xml` is present but is
not exported or used to replace the explicitly supplied XML.

Every entry becomes one event, including repeated transitions. Events are ordered
by `event.timestamp.sec * 1000000000 + event.timestamp.nanosec` using integer
arithmetic. Ties preserve physical MCAP message order followed by `event_log`
array order, regardless of reception timestamps. Status and name strings are
preserved without inferring behavior.

Each run reads one MCAP file and holds its extracted transitions in memory for
sorting. It does not merge split bag files or correct clock resets.

The version 1 JSON contract is:

| Field                 | Type           | Meaning                                                   |
| --------------------- | -------------- | --------------------------------------------------------- |
| `version`             | number         | Format version, currently `1`                             |
| `sourceTopic`         | string         | `/behavior_tree_log`                                      |
| `startTimestampNs`    | string or null | Exact earliest event time; null for an empty event array  |
| `durationMs`          | number         | Last event time minus first event time, in milliseconds   |
| `messageCount`        | number         | Decoded BehaviorTreeLog messages, including empty batches |
| `uniqueUidCount`      | number         | Distinct recorded UIDs                                    |
| `unmatchedUids`       | string[]       | UIDs absent from the supplied XML, sorted numerically     |
| `unmatchedEventCount` | number         | Number of events involving unmatched UIDs                 |
| `events`              | object[]       | All transitions in chronological order                    |

Each event contains `index` (zero-based sorted index), `timestampNs` (exact decimal
string), `offsetMs` (milliseconds since the first event), `uid` (decimal string),
`nodeName`, `previousStatus`, and `currentStatus` (strings). Relative milliseconds
are JSON numbers and may contain fractional milliseconds. Absolute nanoseconds
must stay strings or be read with JavaScript `BigInt`, never `Number` for ordering.

UID validation traverses all XML BehaviorTree definitions, excludes TreeNodesModel,
and treats SubTrees as references. XML and ROS UIDs normalize to unsigned decimal
strings: `"0003"` and `3` both become `"3"`. Names are never used for matching.
Playback applies the same normalization if an XML uses leading zeros;
the existing graph IDs are unchanged. Unmatched events remain in the JSON and
produce an explicit CLI warning. No XML is modified.

Missing inputs, malformed XML/MCAP, undecodable messages, unsupported schemas,
missing/empty topics, and output errors return exit code 1 with a message. Messages
whose `event_log` arrays are all empty produce a valid empty dataset with a null
start and zero duration. An invalid event fails the export instead of silently
dropping it. Output is replaced atomically after successful extraction; an input
path cannot be used as the output. Unmatched UIDs are warnings with exit code 0.

Run the standard-library tests:

```sh
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

Tests generate small temporary MCAP files with the official writer, including
uncompressed, Zstandard, and LZ4 data. They check exact timestamps, equal-time
ordering, repeated transitions, multiple events per message, unmatched UIDs,
metadata exclusion, deterministic JSON, invalid/empty inputs and safe output
failures. They do not require or replace the private reference recording.

Verified results for the supplied files (reference values, not exporter limits):

| Check                    | Result                          |
| ------------------------ | ------------------------------- |
| BehaviorTreeLog messages | 241                             |
| Status transitions       | 14,802                          |
| Unique recorded UIDs     | 217                             |
| Executable XML UIDs      | 765                             |
| Unmatched UIDs / events  | 0 / 0                           |
| Duration (ms)            | `40003.758428`                  |
| Status values            | IDLE, RUNNING, SUCCESS, FAILURE |
| Two independent exports  | Byte-identical                  |

The complete export was compared with every decoded source entry; all fields and
equal-time ordering match. XML contents were verified unchanged.

**Raw recordings stay local.** `.gitignore` excludes `recordings/` (including
archives placed there), MCAP files, and Python virtual environments. The supplied
XML and generated event JSON are approved for the public demo and are included in
the repository. The JSON contains node names, UIDs, exact timestamps and execution
history. Vite serves files under `public/` and copies them into `dist/` on build.
The exporter itself does not upload or publish data.

## Share the demo on GitHub Pages

The site includes the approved `public/tree.xml` and
`public/data/behavior-tree-events.json`; viewers can download both files. Raw MCAP
recordings and Python are not needed to run the deployed site.

1. Push this project, including the approved XML and event JSON, to the chosen
   GitHub repository.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. In **Actions → Deploy demo to GitHub Pages**, select **Run workflow** on the
   default branch. Deployment is manual; ordinary pushes do not publish changes.
4. When the workflow succeeds, share the site URL shown in its deployment or
   **Settings → Pages**.

The workflow uses Node 24, runs tests and TypeScript checks, and builds `dist/`
with the base path reported by GitHub Pages. XML and recording requests use that
same base path, so repository URLs and root-domain deployments both work.
See the [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages)
and [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

To preview a repository-path build locally:

```sh
npm run type-check
npm run build-only -- --base=/behavior-tree-visualizer/
npm run preview -- --base /behavior-tree-visualizer/
```

Open the printed URL with `/behavior-tree-visualizer/` appended if needed.

## WP-06 timeline playback

Generate the JSON using the WP-05 command above, then run `npm run dev` and open
the displayed local URL. The app loads `/data/behavior-tree-events.json` separately
from the XML. Missing or invalid recordings show an error and disable playback;
the tree remains available for navigation and inspection. Empty recordings show
an empty state. Playback starts paused at zero.

Use **Play/Pause**, **Reset**, the **Playback position** slider, and the speed
selector (0.5×, 1×, 2×, 4×). Times are seconds. Seeking updates statuses immediately,
including while playing. Reset pauses and returns to zero; reaching the end stops
playback and changes Play to **Replay**. Back, breadcrumbs, and SubTree navigation
preserve playback position, speed, and playing state.

Category icons identify node types. The node fill shows execution:
RUNNING is yellow, SUCCESS green, FAILURE red, IDLE gray, and SKIPPED muted neutral.
RUNNING also adds a dark yellow-tinted surface and an inner yellow ring without
changing node dimensions or animating the graph. Selection keeps its white outer outline.
Thick yellow connections trace the full route from the displayed tree's root to each
RUNNING node, including shared ancestors. They clear when no RUNNING descendant
needs that route. This is a navigation cue: ancestor nodes retain their recorded
statuses. Paths can continue through inline subtree contents when expansion is enabled.
**Not observed** has no execution highlight and means that node has no transition
at or before the selected time. Events at time zero are applied immediately, so
reset does not make every node unobserved. IDLE is a recorded state, and FAILURE
alone does not diagnose a hardware fault. The inspector shows the same current
status alongside the existing XML attributes.

`parseBehaviorTreeEvents` validates version 1 metadata, required event fields,
supported statuses, exact integer timestamp ordering, indices, and relative
offsets/duration. It rejects inconsistent input rather than sorting or dropping
events. Equal timestamps keep array order; the final transition for each UID wins.
Absolute nanoseconds remain strings and are compared using `BigInt`.

`useBehaviorTreePlayback` lives in App, outside the subtree viewer. It retains the
events in memory and uses one `requestAnimationFrame` loop with a monotonic clock.
Forward playback advances an event cursor; backward seeks reconstruct from the
beginning using the Vue-independent helpers in `playbackState`. Only changed final
UID statuses are committed to a stable reactive map. Nodes and the inspector read
that map using normalized XML UIDs; fallback graph IDs and names never match it.
Status-only changes do not recreate graph nodes or edges, run Dagre, or reset the view.
`getRunningPathEdges` finds these routes by following parent edges from RUNNING
UIDs; Vue Flow's reactive edge-class callbacks update their appearance in place.
Graph dragging, connections, deletion, and group keyboard movement remain disabled.

Run the checks:

```sh
npm test
npm run type-check
npm run lint
npm run build
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

Playback tests cover backward seeks, equal timestamps, IDLE, unobserved nodes,
UID normalization, malformed input, loading errors, pause/resume, all speeds,
reset/replay, navigation independence, unchanged-status notifications, and frame
cleanup. When the local reference JSON exists, its 14,802 events are also checked
against incremental playback and independent reconstruction; this fixture check
is skipped when the private recording is absent.

For browser verification with the supplied recording:

1. Check that 14,802 transitions load and the duration is about 40.004 seconds.
   Play, pause, change speeds, reset, and play to the end; verify Replay works.
2. Open RobotTree → MissionBody → ActionDispatchSwitch → ExecDriveToPose and
   inspect UID 212. Seek near 23.5 s: RUNNING; back to 18 s: Not observed;
   forward to 25 s: IDLE. The node fill, hover status, and inspector must agree.
3. Navigate using Back and breadcrumbs while playing. Playback should continue;
   only changing trees should lay out and position a new graph. Check selection,
   connections, pan/zoom, and that nodes never move during status updates.
4. Check a narrow window and the browser console. Confirm dragging, Shift-box-select
   followed by arrow keys, and Delete/Backspace cannot edit the graph.

Every transition remains in memory, but several may occur between display frames;
only the latest state at each frame is rendered. A background tab may throttle
frames and catch up when shown again. This is recorded playback, with no live ROS,
simulation, or diagnosis. The playback controller,
typed events, and UID status map are ready for WP-07; no WP-07 features are included.

### Graph visibility controls

The horizontal button row inside the canvas groups zoom, path filtering, subtree
visibility, Readable view, and Fit tree:

- **Running path only** hides nodes outside the routes to currently RUNNING nodes.
  Ancestors remain visible for context, with their own recorded statuses.
- **Expand all subtrees** expands all resolvable subtree contents inline.
  Choose **Collapse subtrees** to hide their contents again.
- **Expand running subtrees** expands a subtree when its reference or any descendant
  has a recorded RUNNING status. Other subtree contents remain collapsed.
- **Subtree boundaries** (layers icon, on by default) shows faint outlines and a
  subtle background tint around visible expanded SubTree contents. Toggle it with
  a click or Enter/Space while focused; it leaves node positions, zoom, and pan unchanged.
- **Toggle Control Highlighting** (Control icon, off by default) adds the same
  boundaries around expanded Control nodes and their visible descendants. It works
  independently of Subtree highlighting and disappears for a branch when collapsed.
  Both kinds use the shared eight-color palette; enabling controls preserves existing
  SubTree colors, and all boundaries render in nesting order without accumulating opacity.

Boundaries include the SubTree reference node and its visible descendants, following
each depth row to keep neighboring branches outside. Corners are rounded, with smaller
rounding on short steps. Boundary steps leave 12px of clearance around connector bends
where space permits. When unrelated regions meet, their steps yield to leave a 4px
gap in graph coordinates; nested outlines remain inside their enclosing region.
There are no extra boundary labels;
the node name identifies the SubTree, and the inspector retains its UID. Blue, plum,
cyan, violet, sand, slate, indigo, and dusty rose accents cycle between SubTree siblings,
skipping the enclosing SubTree's color and colors assigned to neighboring regions.
Neighbors are determined across complete tree ranks, including different subtree
families. Colors stay stable through expansion, filtering, and playback. The finite
palette repeats; if all available colors are constrained, the least-conflicting
non-parent color is reused. Node names and inspector details identify instances.
Fills mix the accent with the opaque canvas color, preventing nested backgrounds
from getting progressively brighter. Boundaries pan and zoom with the
graph and let pointer actions pass through. Collapsing or filtering contents
updates their boundary; an empty filtered graph has none.

Contents are hidden by default. Combine Running path only with Expand running
subtrees for the complete active route through nested definitions. Both follow playback
and backward seeks. If no node is RUNNING, the path filter shows an empty message;
the overlay controls stay available.

Double-click an individual SubTree (or focus it and press Space) to toggle it
without leaving the current tree. Nested subtrees start collapsed under the default
mode; expand them individually. Manual choices override the selected bulk mode and
the status panel shows **Subtrees: Custom**. Choosing any bulk mode clears those overrides.
Closing an ancestor hides all its descendants but remembers nested choices for
reopening. Running path only remains an independent filter. Playback and UID status
mapping continue unchanged; unresolved or empty references cannot expand.
Single-click inspects any node; the inspector retains **Open subtree separately**
for explicit breadcrumb navigation.

Controls with execution children use the same double-click and Space
actions. They hide descendants by default at SUCCESS, unless a descendant is still
recorded RUNNING. Other statuses leave the branch open. Manual choices take priority
through playback and seeks, survive closing an ancestor, and are independent of the
subtree expansion mode. Changing definitions clears these choices. This only changes
visibility: a parent's SUCCESS does not imply any particular child status, and hidden
nodes retain their exact recording data.

Toggling an individual branch preserves the current zoom and pan, with the toggled
node kept at the same screen position while surrounding nodes are laid out again.
Use **Fit tree** whenever you want the whole-tree overview. Changing a bulk visibility
option still fits the tree; **Readable view** zooms in at the root.
During playback, the camera stays put and the last toggled node (or the root) stays anchored; layout only
changes when the filtered nodes or connections change. Selection is cleared when
its node leaves the visible graph.
Each newly navigated definition starts with the default visibility options.

`expandBehaviorTreeFlow` reuses the converter and `_fullpath` resolver to build a
cached graph with original UIDs and connections from each reference to its definition's
roots. Missing, ambiguous, recursive, or UID-conflicting expansions remain collapsed
with a warning. Display-only fallback IDs are scoped by reference. The source XML
and parsed definitions are never modified. `useBehaviorTreeView` filters this graph
and reuses the existing layout when its visible structure is unchanged.

For the supplied recording at 23.5 seconds, RobotTree has 28 nodes with contents
hidden, 765 with all contents expanded, and 24 with Running path only plus Subtrees →
Running only. The last view includes UID 212 inside ExecDriveToPose. Seeking to
18 or 25 seconds removes UID 212 from the running path. `npm test` covers expansion,
duplicate tree IDs, fallback IDs, invalid references, filtering, individual toggles,
nested collapse/reopening, successful Control defaults, manual overrides, bulk-mode
resets, seeks, and layout caching. All six visibility combinations were checked at
0, 10, and 23.5 seconds against the real XML without overlapping node rectangles or
dangling connections. ManualCleanBody's setup_guard (UID 466) at 10 seconds was
verified collapsed by default and reopenable with its original children and UIDs.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
