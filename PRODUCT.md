# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Robotics engineers exploring a robot's Behavior Tree and inspecting recorded execution.
The primary experience is an engineering workspace: graph first, compact controls,
detailed inspection. A manager will also try the public demo.

## Product Purpose

Make the actual BehaviorTree.CPP XML and recorded status transitions understandable
without opening the source files. Engineers navigate exact subtree instances, seek
through a recording, trace running paths, and inspect node attributes.

## Operating Context

A standalone Vue 3, TypeScript, Vite, Vue Flow, and Dagre browser application.
Python preprocesses a ROS 2 MCAP file into JSON; the browser uses static XML and JSON.
GitHub Pages deployment is prepared. Publishing is handled by the user.

## Capabilities and Constraints

- Preserve XML hierarchy, instance paths, node UIDs, attributes, and event ordering.
- Read-only graph: pan, zoom, select, inspect, and navigate; no editing or execution.
- Play, pause, reset, seek, and choose playback speed without resetting on navigation.
- Filter running paths and optionally expand all or running subtree contents.
- Fit tree is the default. Playback controls sit above the visualization.
- The legend sits below the visualization. Definitions are collapsed by default.
- Preserve large node typography, thick category-colored borders, and distinct status badges.
- No live ROS, backend, new playback features, or fabricated recording data.

## Evidence on Hand

`public/tree.xml` contains 53 definitions and 765 executable nodes. The approved
public demo JSON contains 14,802 transitions across 217 UIDs over about 40 seconds.
Earlier user screenshots show excessive whitespace, fragmented controls, and labels
that are difficult to read in the whole-tree overview.

## Product Principles

- Give the graph the majority of the working space.
- Keep frequent actions visible and supporting detail available on demand.
- Distinguish node category, recorded execution state, and selection.
- Preserve exact data identity and existing behavior through presentation changes.

## Accessibility & Inclusion

Readable type and clear visual distinctions are explicit user needs. Provide keyboard
access, visible focus, text alongside colors, and usable layouts on smaller screens.
