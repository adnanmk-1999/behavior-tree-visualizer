---
name: Behavior Tree Visualizer
description: A technical-atlas workspace for inspecting behavior trees and recorded execution.
colors:
  accent: "#245dcc"
  accent-hover: "#184ba9"
  accent-soft: "#eaf1ff"
  navy: "#152b43"
  page: "#edf1f6"
  canvas: "#f5f8fc"
  canvas-grid: "#cbd6e5"
  surface: "#fff"
  surface-soft: "#f4f7fb"
  ink: "#182b45"
  muted: "#53647a"
  line: "#d7e0ea"
  edge: "#a4b2c5"
  selection: "#172033"
  category-control: "#1d4ed8"
  category-action: "#6d28d9"
  category-condition: "#0e7490"
  category-decorator: "#b45309"
  category-subtree: "#475569"
  category-fallback: "#6b7280"
  running-bg: "#facc15"
  running-border: "#a16207"
  running-text: "#422006"
  running-node: "#fffbeb"
  success-bg: "#dcfce7"
  success-border: "#16a34a"
  success-text: "#166534"
  failure-bg: "#fee2e2"
  failure-border: "#dc2626"
  failure-text: "#991b1b"
  idle-bg: "#f1f5f9"
  idle-border: "#94a3b8"
  idle-text: "#475569"
  skipped-bg: "#fafafa"
  skipped-border: "#d4d4d4"
  skipped-text: "#525252"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  node-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  status: "3px"
  label: "4px"
  control: "6px"
  panel: "8px"
  playback: "10px"
  workspace: "12px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  xxl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.4rem 0.5rem"
  timeline:
    backgroundColor: "transparent"
    rounded: "{rounded.label}"
    height: "30px"
  breadcrumb:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.label}"
    padding: "0.375rem"
  status-running:
    backgroundColor: "{colors.running-bg}"
    textColor: "{colors.running-text}"
    rounded: "{rounded.status}"
    padding: "2px 6px"
  behavior-tree-node:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.workspace}"
    padding: "15px 17px"
    width: "fit-content"
    height: "76px"
  notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1rem"
---

# Design System: Behavior Tree Visualizer

## Overview

**Creative North Star: "Technical Atlas"**

A precise engineering workspace with a midnight navy shell, an ice-blue canvas, white working surfaces, and cobalt controls. Compact controls support close inspection; the graph carries the visual weight.

Borders, aligned labels, and restrained spacing organize the interface. Category, recorded execution, and selection remain independently readable. Authored SVG icons accompany labels; this redesign adds no raster assets or external fonts.

**Key Characteristics:**
- Graph-first engineering workspace.
- Compact controls and detailed inspection.
- Separate category, status, and selection cues.
- Flat surfaces and short control feedback.

Updated from implemented source on 2026-10-22 for compact icon-and-name nodes. Sources: `src/assets/workspace.css`, `src/assets/behaviorTreeAppearance.css`, `src/App.vue`, the workspace components, and `src/utils/layoutTree.ts`. Surface composition is governed by `.impeccable/surfaces/src-app-vue.md`. Visual review disposition: **RECAPTURE**; desktop/mobile browser screenshots were unavailable in the sandbox. This document records implementation, not visual verification or ship approval.

## Colors

### Primary

Cobalt (`accent`) identifies primary playback actions, interactive emphasis, and focus. Its deeper hover value and pale wash support interaction states. The native timeline uses the same accent.

### Neutral

Midnight navy (`navy`) anchors the identity header. The page, ice-blue canvas, white surface, and soft surface separate the working regions. Ink and muted text create hierarchy; line and edge colors distinguish panel boundaries from graph connections.

### Semantic colors

Category colors are blue Control, violet Action, cyan Condition, amber Decorator, slate SubTree, and gray fallback. Recorded statuses use independent node-fill and inspector-badge tokens: gold RUNNING, green SUCCESS, red FAILURE, blue-gray IDLE, and gray SKIPPED. “Not observed” uses a white node fill and plain slate text in the inspector. Node fills use the status background, with pale gold for RUNNING and white for Not observed; paths to running nodes use the running-border color. Selection uses a dark outline.

**The Independent Signals Rule.** Keep category on its icon, execution in the node fill, and selection on an outer outline. Exact status text remains available on hover and in the inspector. A highlighted ancestor path does not change an ancestor's recorded status.

## Typography

Use the platform system sans throughout. Monospace is reserved for XML keys, attribute values, UIDs, and instance paths. The root size is 16px. The frontmatter captures the tree title, body, controls, captions, graph node name, and inspector code roles; there is no separate display typeface.

Nodes show a category icon and a single-line name. Type and UID remain in the hover description and inspector. Full labels remain available through titles and the inspector. Inspector section headings use 14px/650; the selected node name uses 20px/650. Counts, playback time, and zoom percentages use tabular numerals. Keep the original case of source identifiers.

**The Readable Node Rule.** Preserve the 24px node name and 28px category icon at graph scale; keep secondary metadata in the inspector. Use Fit tree for the overview and Readable view for inspection.

## Layout

The current workspace uses a full-width header and main content with 24px horizontal gutters. Its sequence is identity and instance navigation, playback, graph controls and canvas, legend, then collapsed definitions. The graph shares a row with the optional 23rem inspector. Desktop workspace height is `clamp(26rem, calc(100dvh - 350px), 64rem)`.

Graph layout runs top-to-bottom with nodes sized to the measured name plus icon, padding, gaps, and optional branch toggle. Widths are clamped to 160–360px and height stays 76px, with 20px sibling separation and 160px rank separation. Nodes retain XML traversal order. The canvas has a 20px dot grid. Fit tree is the initial view; user zoom spans 5–200%, while fitting caps at 100%.

| Maximum width | Implemented adaptation |
| --- | --- |
| 1150px | Legend groups stack beside their heading. |
| 1100px | Tree navigation moves below the title and instance path. |
| 1000px | Inspector stacks below the graph; canvas is 60svh with a 24rem minimum; inspector is capped at 30rem. |
| 700px | Timeline moves to its own row; range input grows to 40px high. |
| 600px | Main gutters become 12px; shared buttons/selects have 44px minimum height; graph controls and legend wrap; breadcrumbs scroll horizontally. |
| 380px | Speed label and playback time labels stack. |

The page supports a 320px minimum width. Inspector values wrap anywhere; definitions use a scrollable table with a sticky header. These are implemented CSS behaviors, pending rendered desktop/mobile verification.

## Elevation & Depth

Panels are flat, separated by surface tone and single-pixel borders. No ambient card shadows are defined. The running node's inset gold ring (`inset 0 0 0 2px #a16207`) communicates state. Selection adds a 2px dark outline with a 3px offset; keyboard focus uses a 3px outline, with a 3px offset for ordinary controls and 4px for graph nodes.

## Shapes

Graph connections use step paths with square corners.

Use the radius roles in frontmatter: small status badges, gently rounded controls, and broader panel corners. Nodes use a 1px neutral border in the edge color; category icons in the legend remain unframed. Nodes use a neutral outline on hover; selection and RUNNING retain their separate outlines. Ordinary panel and control borders are 1px. Icons use 24-unit SVG paths, normally rendered at 20px with a 1.8-unit stroke. The bundled MDI sitemap outline uses its original filled path without an added stroke; category icons render at 28px in nodes and 20px in the legend.

## Components

- **Buttons and selects:** shared controls have a 40px minimum height before the mobile adjustment. Primary playback is cobalt; secondary controls are white with a line border; quiet controls are transparent. Hover changes the surface and border; pressed secondary/quiet controls darken their surface. Disabled controls use explicit muted colors. Background and border transitions last 140ms with `ease`; reduced motion removes transitions and animations.
- **Playback:** a white, bordered fieldset with a compact status heading, transport buttons, labeled timeline, and native speed select. Play becomes Pause while running and Replay at the end. The timeline has a 5px track and round thumb, with three-decimal seconds shown above it. Unavailable playback remains labeled and disabled.
- **Navigation:** Back and root actions precede horizontally scrollable breadcrumbs. The active breadcrumb has stronger weight and `aria-current`. The exact instance path appears in monospace. A skip link becomes visible on keyboard focus.
- **Graph nodes:** compact, bounded content widths with one category icon and a single-line name. Icons are split arrows (Control), lightning bolt (Action), checked diamond (Condition), wrapping arrow (Decorator), and mdi-sitemap-outline (SubTree). Unknown is omitted from the legend; unrecognized nodes retain a neutral question-mark fallback and inspector metadata. Clicking any node inspects it. Double-clicking a SubTree or Control with children expands or collapses its branch inline; its plus/minus button and Enter provide the same action. Controls collapse at SUCCESS unless on a recorded RUNNING path; manual choices take priority. Other nodes use Enter for inspection. Inline toggles preserve zoom and pan and anchor the toggled node in place during layout. Fit tree remains explicit; new definitions and bulk visibility changes still fit the overview. Double-click zoom is disabled to avoid conflicting with expansion. The graph is read-only; pan, zoom, selection, and inspection remain available.
- **Graph controls:** Running path only is a labeled pressed-state toggle with a gold active treatment. Subtree visibility is Collapsed, Running only, or All expanded. Individual subtree toggles show Custom in the selector; choosing a bulk mode clears subtree overrides while preserving Control choices. Zoom, Readable view, and Fit tree remain directly available. Empty graph states explain the condition and the relevant next action.
- **Inspector:** white pane with a sticky heading and close action, category/name/status summary, identity pairs, and all XML attributes. Empty strings and missing values retain explicit labels. It scrolls independently; the status follows the playback position. SubTree inspection includes an explicit Open subtree separately action for the breadcrumb workflow.
- **Legend and definitions:** the legend below the canvas separately explains category icons, status fills, running paths, and selection. Definitions start collapsed and expand into the XML definition table. Help also uses a collapsed disclosure.
- **Notices:** bordered surfaces with wrapping text; errors add a pale red surface, red border, and red text. Loading, recording errors, unavailable recordings, and unmatched UIDs keep their existing status/alert semantics.

## Do's and Don'ts

### Do:
- Do preserve the 160–360px width limits and 76px node height, thin neutral borders, and large node typography.
- Do keep playback above the visualization, the legend below it, and definitions collapsed initially.
- Do label every category icon and status fill in the legend; retain exact status text in hover descriptions and the inspector, keyboard focus, and accessible names for icon-only controls.
- Do preserve exact XML identity, instance paths, and playback position through navigation.

### Don't:
- Don't use category color to imply execution status or selection.
- Don't treat “Not observed” as IDLE or fabricate status for an ancestor on a running path.
- Don't add decorative panels, raster imagery, or motion that competes with the graph.
- Don't shrink graph labels to compensate for the whole-tree overview; retain the Readable view action.
