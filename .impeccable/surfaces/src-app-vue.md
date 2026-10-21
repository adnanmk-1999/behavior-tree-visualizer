---
version: 1
slug: "src-app-vue"
primary_target: "src/App.vue"
related_targets: ["src/components/BehaviorTreeViewer.vue","src/components/PlaybackControls.vue","src/components/NodeInspector.vue","src/components/BehaviorTreeLegend.vue","src/components/BehaviorTreeNode.vue"]
---

# Engineering workspace

Mode: operate. Audience: robotics engineers inspecting actual XML and recorded
execution. This redesign preserves existing parsing, playback, navigation, and
graph semantics. It is built directly in code with no raster assets.

## Direction contract

THESIS: The graph is the working surface. Frequent controls form compact, aligned
bands; instructions and reference material no longer compete with the canvas.

OWN-WORLD: Technical-atlas clarity: midnight navy shell, ice-blue canvas, white
working surfaces, a legible system sans, cobalt controls, and existing category
and execution colors. Borders and spacing define regions without decorative panels.

STORY: Identify the exact tree instance, play or seek the recording, follow a gold
running route, and select a node for its XML and recorded status.

FIRST VIEWPORT: Compact identity header, tree title and breadcrumbs, a horizontal
playback strip, grouped path/subtree/view controls, then a full-width graph with an
optional right inspector. The legend and collapsed definitions follow the graph.
Signature interaction: running-route focus retains the recording position and
reveals the same instance-aware path. Motion is limited to short control feedback.

FORM: Grounded direction 6, technical-atlas documentation; seed:b46b4c6c0bad1d1d.
The local concept assignment had no remote challengers or quality-bar boards.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
