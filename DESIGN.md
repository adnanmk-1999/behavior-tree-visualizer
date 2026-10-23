---
name: Behavior Tree Visualizer
description: A compact behavior-tree workspace using the KopsiHub authenticated dark theme.
colors:
  background: "rgb(var(--v-theme-background, 24, 24, 24))"
  surface: "rgb(var(--v-theme-surface, 43, 43, 42))"
  primary: "rgb(var(--v-theme-primary, 255, 237, 0))"
  on-primary: "rgb(var(--v-theme-on-primary, 0, 0, 0))"
  secondary: "rgb(var(--v-theme-secondary, 120, 117, 134))"
  error: "rgb(var(--v-theme-error, 209, 21, 22))"
  warning: "rgb(var(--v-theme-warning, 245, 128, 42))"
  info: "rgb(var(--v-theme-info, 40, 163, 96))"
  success: "rgb(var(--v-theme-success, 76, 175, 80))"
  text: "rgb(var(--v-theme-on-surface, 255, 255, 255))"
  text-secondary: "rgba(var(--v-theme-on-surface, 255, 255, 255), 0.7)"
  border: "rgba(var(--v-border-color, 255, 255, 255), var(--v-border-opacity, 0.12))"
  overlay-surface: "color-mix(in srgb, var(--bt-text) 2.5%, var(--bt-surface))"
  overlay-button-surface: "rgb(var(--v-theme-blue-grey-darken-1, 84, 110, 122))"
  tooltip-surface: "rgb(var(--v-theme-surface-variant, 199, 199, 199))"
  tooltip-text: "rgb(var(--v-theme-on-surface-variant, 0, 0, 0))"
  category-control: "#9ac3ff"
  category-action: "#c7adff"
  category-condition: "#78d4da"
typography:
  title:
    fontFamily: "inherit"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: "28px"
  heading:
    fontFamily: "inherit"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  body:
    fontFamily: "inherit"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  control:
    fontFamily: "inherit"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  metadata:
    fontFamily: "inherit"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  status:
    fontFamily: "inherit"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  node-name:
    fontFamily: "inherit"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
  code:
    fontFamily: "'Source Code Pro', ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  standard: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.control}"
    rounded: "{rounded.standard}"
    padding: "4px 12px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.standard}"
    padding: "4px 12px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.standard}"
    padding: "4px 12px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.standard}"
    padding: "4px 8px"
  breadcrumb:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.standard}"
    padding: "0.375rem"
  status-running:
    backgroundColor: "color-mix(in srgb, var(--bt-primary) 12%, var(--bt-surface))"
    textColor: "{colors.primary}"
    typography: "{typography.status}"
    rounded: "{rounded.standard}"
    padding: "2px 6px"
  behavior-tree-node:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.node-name}"
    rounded: "{rounded.standard}"
    padding: "15px 17px"
    height: "76px"
  notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.standard}"
    padding: "12px 16px"
---

# Design System: Behavior Tree Visualizer

## Overview

**Creative North Star: "KopsiHub engineering workspace"**

Use the KopsiHub authenticated dark theme: charcoal canvas, raised gray surfaces, yellow actions, and compact inherited typography. The graph carries the visual weight; controls, inspection, and reference material support the current task.

Category, recorded execution, selection, and keyboard focus remain independently readable. The visualizer inherits its host theme and font while keeping its presentation within its own component roots.

**Key Characteristics:**

- Graph-first workspace with compact controls.
- Host-inherited typography and Vuetify theme variables.
- Dark status fills supplemented by symbols and exact text.
- Flat surfaces, subtle borders, and consistent small corners.

Implemented sources are `src/assets/workspace.css`, `src/assets/behaviorTreeAppearance.css`, and the Vue components.

## Colors

### Primary

KopsiHub yellow identifies the primary playback action, active path filter, timeline progress, RUNNING state, running routes, and keyboard focus. Use black on the filled primary button. Hover and active surfaces are derived with `color-mix`, preserving the host's primary color.

### Secondary

Muted violet-gray supports IDLE surfaces. Semantic error, warning, info, and success tokens retain the KopsiHub host roles; info is green. Error and success label colors mix their semantic color with the foreground for contrast on dark tinted surfaces. The info token is available without inventing an additional UI state.

### Neutral

Charcoal is the page and plain graph canvas; the lighter surface carries toolbars, playback, nodes, and inspector. White foreground and its translucent secondary role establish hierarchy. Borders, graph edges, and hover fills derive from these tokens. The frontmatter preserves the actual Vuetify variable expressions and fallback values.

### Graph signals

Category icons use pale blue Control, lavender Action, cyan Condition, and a warning-derived Decorator color. SubTree and unknown categories use the secondary foreground. Status fills are yellow-tinted RUNNING, green-tinted SUCCESS, red-tinted FAILURE, violet-gray IDLE, background-colored SKIPPED, and ordinary surface-colored Not observed. Symbols repeat these distinctions; hover and inspector retain exact status text. Selection uses the foreground outer outline, white in the default theme.

**The Independent Signals Rule.** Keep category on its icon, execution in the fill and status symbol, selection on the outer outline, and keyboard focus on its own yellow outline. A running ancestor path never changes an ancestor's recorded status.

## Typography

Inherit the host's sans-serif family. Only the standalone `index.html` supplies `Roboto, sans-serif`; no font is downloaded. Source Code Pro is the preferred metadata monospace when available, with platform monospace fallbacks. Keep original identifier case and use tabular numerals for time and counts.

The frontmatter defines the title, heading, body, control, and metadata hierarchy. Inspector node names use 20px/28px at weight 500. Graph names retain their larger 24px/30px, weight 700, alongside 24px category icons; layout measures the inherited font when the viewer mounts. The Readable view action supports close inspection without shrinking node labels to fit an overview.

## Layout

`BehaviorTreeViewer` fills its parent's height and scrolls internally if its controls, graph, and legend need more space. The host must provide a definite height. Standalone `App.vue` owns identity chrome, navigation, playback, data loading, and definitions. Its main region scrolls inside the standalone viewport; the reusable viewer does not calculate height from the browser window.

The viewer uses a 360px minimum graph panel and an optional 23rem inspector on the right. Nodes remain 160–360px wide and 76px high, with 20px sibling spacing and 160px rank spacing on a plain canvas. Fit tree is the initial view; user zoom spans 5–200%, with fitting capped at 100%.

Responsive changes follow each component's container width:

| Container and maximum width | Adaptation |
| --- | --- |
| App, 1100px | Navigation moves below the tree title and instance path. |
| Viewer, 1000px | Inspector stacks below the graph and scrolls within a 280px cap. |
| Playback, 700px | Timeline gets its own row and a taller range-input target. |
| App/viewer, 600px | Compact gutters and wrapping navigation. |
| Canvas, 360px | Buttons narrow to 32px while all eight actions stay in one horizontal row. |
| Playback, 380px | Speed and time labels stack. |

Shared page controls are at least 32px high; coarse pointers get 44px targets. Viewport icon buttons retain the reference's compact 36px square targets. Breadcrumbs scroll horizontally, long inspector values wrap, and definitions use a scrollable table with a sticky header.

## Elevation & Depth

Surface tone and single-pixel borders establish depth. The viewport status panel and button groups use a restrained shadow and a slightly elevated surface (approximately #30302f). RUNNING, SUCCESS, and FAILURE use yellow, green, and red inset rings. Success and failure use 28% semantic-color fills, and the failure border is lightened for visibility. Selection uses a foreground outer outline, while graph keyboard focus uses a dashed yellow outline. Ordinary controls use a solid yellow focus outline. These states may coexist.

Control background and border feedback lasts 140ms with `ease`; the status panel expands over 160ms without resizing the viewport. Reduced motion removes transitions and animations. Playback updates status without graph animation.

## Shapes

Use the standard small corner radius across controls, panels, badges, and graph nodes. Graph connections retain square-corner step paths. Timeline thumbs stay circular. Ordinary interface icons render at 20px and viewport control icons at 24px; node category icons render at 24px, node status icons at 20px, and category legend icons at 16px. The bundled MDI SubTree symbol retains its original filled SVG path.

## Components

- **Buttons and fields:** yellow primary playback, outlined secondary actions, and borderless quiet actions. Shared controls inherit the host font; disabled controls mute visibly and remain disabled semantically. Native selects and range inputs stay native.
- **Playback:** bordered surface with a section heading, status, transport controls, labeled timeline, and speed select. Play becomes Pause or Replay. Labels use Vue `useId`; separate Vue applications on one page need distinct `app.config.idPrefix` values.
- **Navigation:** Back/root actions precede breadcrumbs; the current item has stronger text and `aria-current`. Preserve the exact instance path. The standalone skip link appears on keyboard focus.
- **Graph nodes:** a 40px left column stacks the category icon above the status symbol, separated by subtle dividers; the single-line name spans both rows on the right. Expandable branches have a 16px bottom-right plus when collapsed and minus when expanded, without reserving label space. The 76px node height and total width allowance remain the same. Double-click or Space toggles expandable branches; Enter toggles the focused node's inspector; Escape closes it and returns focus to the node when pressed inside the inspector. Arrow keys navigate parents, children, and siblings with one graph tab stop. WASD pans and +/− zooms while a node or the canvas has focus; the hover description reports their expanded/collapsed state. Hover reveals full identity and status. Selection and keyboard focus remain separate from the RUNNING ring. Clicking inspects; existing branch expansion and read-only interaction behavior remain intact.
- **Viewport overlay:** an absolute, pointer-transparent layer stays anchored to the canvas while graph content pans and zooms. Its controls receive pointer events; gaps pass through. A 280px status panel sits 8px from the top/left, with a 36px disclosure header and stacked real counts, zoom, path, and subtree state. A single bottom-right horizontal row contains blue-grey square buttons with white 24px icons and individual 4px corners. Buttons have 4px gaps; thin separators and 8px spacing distinguish zoom, visibility, and Readable view/Fit tree groups. Edge insets remain 8px. Narrow canvases reduce button width and spacing while keeping the row intact. All eight buttons remain directly visible; there is no eye menu. Visibility controls provide Running path only plus mutually exclusive Collapsed, Running only, and All expanded subtree modes; manual expansion remains visible as Custom in the status panel. Active toggles keep a yellow ring and tint. Tooltips use KopsiHub's light-grey surface-variant, dark on-surface-variant text, 14px type at 1.6 line height, and 5px by 16px padding. They appear on hover/focus and dismiss with Escape. Keep controls available when filtering produces an empty graph.
- **Inspector:** dark surface with a sticky heading, subtle yellow header accent, close action, category/name/status, identity, and XML attributes. Open subtree separately remains an explicit navigation action.
- **Legend and help:** Category and Status share a content-sized two-column panel below Tree Details, with Category on the left and Status on the right. The panel fits within 280px, uses an 82% opaque #202020 surface, an 18% white border, 2px corners, 8px by 10px padding, and 12px/20px body text. White 15px, 600-weight headings have a 4px bottom margin; columns are separated by a 16px gap. Running-path and selection samples are omitted. The top-right info icon reveals a labeled node-layout example above compact Keyboard shortcuts and Mouse shortcuts sections on hover, keyboard focus, or tap. The example places node type above recorded status on the left and the name across both rows on the right, reusing the graph's icons and semantic colors. Its native popover uses the browser's top layer, inherits the feature theme, shifts or flips within the visible screen, and closes on Escape or outside interaction. The information tooltip uses a 94% opaque #202020 surface, an 18% white border, 2px corners, 8px by 10px padding, and 11px text at 1.35 line height. Rows use a 52px label column and 12px gap; keyboard keys are plain semibold monospace text. These help tokens are separate from the light-grey action-button tooltips. Definitions start collapsed. Notices use ordinary surfaces; errors use a tinted semantic surface and readable pale text.

Shared styles are scoped under `.bt-theme`; category/status styles are imported with Vue scoping by their owning components. Components import the CSS they need. There are no custom portals, dialogs, or file-picker surfaces to theme.

## Do's and Don'ts

### Do:

- Do inherit the host font and Vuetify variables; keep standalone font defaults in `index.html`.
- Do preserve node dimensions, large graph typography, exact XML identity, and playback behavior.
- Do supplement status color with symbols and exact text, and retain visible keyboard focus.
- Do size embedded viewers through their parent and verify narrow containers independently of viewport width.

### Don't:

- Don't restore the old light canvas, white panels, cobalt controls, or navy shell.
- Don't apply visualizer theme defaults to `:root`, `body`, or unrelated host controls.
- Don't use yellow selection outlines that merge with RUNNING and focus cues.
- Don't treat Not observed as IDLE or infer a parent's status from a highlighted running route.
