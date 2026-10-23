import type { BehaviorTreeFlow } from './behaviorTreeToFlow'
import { NODE_HEIGHT, NODE_MIN_WIDTH } from './layoutTree'

const CONNECTOR_PADDING = 12

export function getSubtreeBoundaries(
  flow: BehaviorTreeFlow,
  ancestors: ReadonlyMap<string, readonly string[]>,
  allNodes: BehaviorTreeFlow['nodes'],
) {
  const tones = new Map<string, number>()
  const lastSiblingTone = new Map<string | undefined, number>()
  // Assign from the complete tree so filtering and expansion never change a region's color.
  for (const node of allNodes) {
    if (node.data?.tag !== 'SubTree') continue
    const parent = ancestors
      .get(node.id)
      ?.filter((id) => tones.has(id))
      .at(-1)
    const parentTone = parent === undefined ? undefined : tones.get(parent)
    let tone = ((lastSiblingTone.get(parent) ?? parentTone ?? -1) + 1) % 3
    if (tone === parentTone) tone = (tone + 1) % 3
    tones.set(node.id, tone)
    lastSiblingTone.set(parent, tone)
  }
  const parents = new Set(flow.edges.map((edge) => edge.source))
  const groups = flow.nodes.flatMap((node) =>
    node.data?.tag === 'SubTree' && parents.has(node.id)
      ? [
          {
            id: node.id,
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

  return groups
    .filter((group) => group.rows.size)
    .sort((a, b) => a.depth - b.depth)
    .map((group) => {
      const rows = [...group.rows].sort(([a], [b]) => a - b)
      const [top, first] = rows[0]!
      const points: [number, number][] = [
        [first.left, top - 8],
        [first.right, top - 8],
      ]
      // Step between ranks: a rectangle can include nodes belonging to neighboring SubTrees.
      // Widen before the connector midpoint and narrow after it to leave the bends clear.
      for (let i = 1; i < rows.length; i++) {
        const [y, row] = rows[i]!
        const previousY = rows[i - 1]![0]
        const middle =
          (previousY + NODE_HEIGHT + y) / 2 +
          Math.sign(points.at(-1)![0] - row.right) * CONNECTOR_PADDING
        points.push([points.at(-1)![0], middle], [row.right, middle])
      }
      const [bottom, last] = rows.at(-1)!
      points.push([last.right, bottom + NODE_HEIGHT + 8], [last.left, bottom + NODE_HEIGHT + 8])
      for (let i = rows.length - 1; i > 0; i--) {
        const [previousY, row] = rows[i - 1]!
        const middle =
          (previousY + NODE_HEIGHT + rows[i]![0]) / 2 +
          Math.sign(points.at(-1)![0] - row.left) * CONNECTOR_PADDING
        points.push([points.at(-1)![0], middle], [row.left, middle])
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
        tone: tones.get(group.id),
        path,
      }
    })
}
