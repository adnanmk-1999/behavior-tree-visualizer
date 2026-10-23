import type { BehaviorTreeFlow } from './behaviorTreeToFlow'
import { NODE_HEIGHT, NODE_MIN_WIDTH } from './layoutTree.ts'

const CONNECTOR_PADDING = 12
const REGION_GAP = 4
const SUBTREE_TONE_COUNT = 8

function getBranchTones(
  allNodes: BehaviorTreeFlow['nodes'],
  ancestors: ReadonlyMap<string, readonly string[]>,
  branchIds: ReadonlySet<string>,
  tones = new Map<string, number>(),
) {
  const neighbors = new Map([...branchIds].map((id) => [id, new Set<string>()]))
  const children = new Map<string | undefined, string[]>()
  for (const node of allNodes) {
    const parent = ancestors.get(node.id)?.at(-1)
    const siblings = children.get(parent) ?? []
    siblings.push(node.id)
    children.set(parent, siblings)
  }
  // Walk complete ranks in tree order, including nested families that can meet on screen.
  let rank = children.get(undefined) ?? []
  while (rank.length) {
    let previous: string[] = []
    for (const id of rank) {
      const owners = [...(ancestors.get(id) ?? []), id].filter((owner) => neighbors.has(owner))
      for (const left of previous.filter((owner) => !owners.includes(owner))) {
        for (const right of owners.filter((owner) => !previous.includes(owner))) {
          neighbors.get(left)!.add(right)
          neighbors.get(right)!.add(left)
        }
      }
      if (owners.length) previous = owners
    }
    rank = rank.flatMap((id) => children.get(id) ?? [])
  }
  for (const id of branchIds) {
    const parent = ancestors
      .get(id)
      ?.filter((owner) => branchIds.has(owner))
      .at(-1)
    if (parent !== undefined) {
      neighbors.get(id)!.add(parent)
      neighbors.get(parent)!.add(id)
    }
  }
  const lastSiblingTone = new Map<string | undefined, number>()
  // Full-tree constraints keep colors stable through expansion, filtering, and playback.
  for (const node of allNodes) {
    if (!branchIds.has(node.id)) continue
    const parent = ancestors
      .get(node.id)
      ?.filter((id) => tones.has(id))
      .at(-1)
    const parentTone = parent === undefined ? undefined : tones.get(parent)
    const assigned = tones.get(node.id)
    if (assigned !== undefined) {
      lastSiblingTone.set(parent, assigned)
      continue
    }
    const start = ((lastSiblingTone.get(parent) ?? parentTone ?? -1) + 1) % SUBTREE_TONE_COUNT
    const adjacentTones = [...neighbors.get(node.id)!].map((id) => tones.get(id))
    let tone = start
    let fewestConflicts = Infinity
    for (let offset = 0; offset < SUBTREE_TONE_COUNT; offset++) {
      const candidate = (start + offset) % SUBTREE_TONE_COUNT
      if (candidate === parentTone) continue
      const conflicts = adjacentTones.filter((value) => value === candidate).length
      if (conflicts < fewestConflicts) {
        tone = candidate
        fewestConflicts = conflicts
      }
      if (conflicts === 0) break
    }
    // shortcut: eight constrained tones can repeat; add recoloring if denser trees exhaust the palette.
    tones.set(node.id, tone)
    lastSiblingTone.set(parent, tone)
  }
  return tones
}

export function getBranchBoundaries(
  flow: BehaviorTreeFlow,
  ancestors: ReadonlyMap<string, readonly string[]>,
  allNodes: BehaviorTreeFlow['nodes'],
  includeControls = false,
) {
  const branchIds = new Set(
    allNodes.filter((node) => node.data?.tag === 'SubTree').map((node) => node.id),
  )
  const tones = getBranchTones(allNodes, ancestors, branchIds)
  if (includeControls) {
    for (const node of allNodes) {
      if (node.data?.category === 'Control' && node.data.collapsible) branchIds.add(node.id)
    }
    // Seed controls with existing subtree tones so the independent toggle never recolors subtrees.
    getBranchTones(allNodes, ancestors, branchIds, tones)
  }
  const parents = new Set(flow.edges.map((edge) => edge.source))
  const groups = flow.nodes.flatMap((node) =>
    branchIds.has(node.id) && parents.has(node.id)
      ? [
          {
            id: node.id,
            kind: node.data?.tag === 'SubTree' ? 'SubTree' : 'Control',
            depth: ancestors.get(node.id)?.length ?? 0,
            rows: new Map<number, { left: number; right: number }>(),
          },
        ]
      : [],
  )
  const byId = new Map(groups.map((group) => [group.id, group]))
  for (const node of flow.nodes) {
    const width = typeof node.width === 'number' ? node.width : NODE_MIN_WIDTH
    for (const id of [node.id, ...(ancestors.get(node.id) ?? [])]) {
      const group = byId.get(id)
      if (!group) continue
      const row = group.rows.get(node.position.y) ?? { left: Infinity, right: -Infinity }
      row.left = Math.min(row.left, node.position.x - 8)
      row.right = Math.max(row.right, node.position.x + width + 8)
      group.rows.set(node.position.y, row)
    }
  }

  const regions = groups
    .filter((group) => group.rows.size)
    .sort((a, b) => a.depth - b.depth)
    .map((group) => {
      const rows = [...group.rows].sort(([a], [b]) => a - b)
      const steps = rows.slice(1).map(([y, row], i) => {
        const [previousY, previous] = rows[i]!
        const middle = (previousY + NODE_HEIGHT + y) / 2
        return {
          previous,
          row,
          middle,
          leftY: middle + Math.sign(row.left - previous.left) * CONNECTOR_PADDING,
          rightY: middle + Math.sign(previous.right - row.right) * CONNECTOR_PADDING,
        }
      })
      return { ...group, rows, steps }
    })

  for (let i = 0; i < regions.length; i++) {
    const a = regions[i]!
    for (const b of regions.slice(i + 1)) {
      if (ancestors.get(b.id)?.includes(a.id)) continue
      for (const aStep of a.steps) {
        const bStep = b.steps.find((step) => step.middle === aStep.middle)
        if (!bStep) continue
        const [left, right] =
          aStep.previous.left < bStep.previous.left ? [aStep, bStep] : [bStep, aStep]
        // Yield connector padding only where unrelated regions would touch or overlap.
        if (left.previous.right + REGION_GAP > right.row.left) {
          left.rightY = Math.min(left.rightY, left.middle - REGION_GAP / 2)
          right.leftY = Math.max(right.leftY, right.middle + REGION_GAP / 2)
        }
        if (left.row.right + REGION_GAP > right.previous.left) {
          right.leftY = Math.min(right.leftY, right.middle - REGION_GAP / 2)
          left.rightY = Math.max(left.rightY, left.middle + REGION_GAP / 2)
        }
      }
    }
  }

  // Keep nested outlines inside their enclosing region after its padding was limited.
  for (const outer of regions) {
    for (const inner of regions) {
      if (!ancestors.get(inner.id)?.includes(outer.id)) continue
      for (const step of inner.steps) {
        const enclosing = outer.steps.find((value) => value.middle === step.middle)
        if (!enclosing) continue
        if (step.previous.right > enclosing.row.right)
          step.rightY = Math.min(step.rightY, enclosing.rightY)
        if (step.row.right > enclosing.previous.right)
          step.rightY = Math.max(step.rightY, enclosing.rightY)
        if (step.previous.left < enclosing.row.left)
          step.leftY = Math.min(step.leftY, enclosing.leftY)
        if (step.row.left < enclosing.previous.left)
          step.leftY = Math.max(step.leftY, enclosing.leftY)
      }
    }
  }

  return regions.map((group) => {
    const { rows, steps } = group
    const [top, first] = rows[0]!
    const points: [number, number][] = [
      [first.left, top - 8],
      [first.right, top - 8],
    ]
    // Step between ranks: a rectangle can include nodes belonging to neighboring branches.
    for (const step of steps) {
      points.push([step.previous.right, step.rightY], [step.row.right, step.rightY])
    }
    const [bottom, last] = rows.at(-1)!
    points.push([last.right, bottom + NODE_HEIGHT + 8], [last.left, bottom + NODE_HEIGHT + 8])
    for (const step of [...steps].reverse()) {
      points.push([step.row.left, step.leftY], [step.previous.left, step.leftY])
    }
    const outline = points.filter(([x, y], i) => {
      const previous = points[(i + points.length - 1) % points.length]!
      return x !== previous[0] || y !== previous[1]
    })
    const path =
      outline
        .map(([x, y], i) => {
          const previous = outline[(i + outline.length - 1) % outline.length]!
          const next = outline[(i + 1) % outline.length]!
          const incoming = Math.hypot(previous[0] - x, previous[1] - y)
          const outgoing = Math.hypot(next[0] - x, next[1] - y)
          const radius = Math.min(12, incoming / 2, outgoing / 2)
          const startX = x + ((previous[0] - x) * radius) / incoming
          const startY = y + ((previous[1] - y) * radius) / incoming
          const endX = x + ((next[0] - x) * radius) / outgoing
          const endY = y + ((next[1] - y) * radius) / outgoing
          return `${i === 0 ? 'M' : 'L'} ${startX} ${startY} Q ${x} ${y} ${endX} ${endY}`
        })
        .join(' ') + ' Z'
    return {
      id: group.id,
      kind: group.kind,
      tone: tones.get(group.id),
      path,
    }
  })
}
