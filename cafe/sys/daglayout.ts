export type DAGNode = { id: string }
export type DAGEdge = { from: string; to: string }

export type DAGLayoutOptions = {
  nodes: DAGNode[]
  edges: DAGEdge[]
  direction?: 'vertical' | 'horizontal'
  nodeWidth?: number
  nodeHeight?: number
  rankGap?: number
  nodeGap?: number
  padding?: number
}

export type RankLayout = {
  rank: number
  x: number
  y: number
  width: number
  height: number
}

export type EdgeLayout = {
  from: string
  to: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  isBackEdge: boolean
}

export type NodeLayout = {
  id: string
  x: number
  y: number
}

export type DAGLayoutResult = {
  width: number
  height: number
  ranks: RankLayout[]
  edges: EdgeLayout[]
  nodes: NodeLayout[]
}

function detectbackedges(nodeids: string[], edges: DAGEdge[]): Set<string> {
  const adj = new Map<string, string[]>()
  for (const id of nodeids) {
    adj.set(id, [])
  }
  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to)
  }

  const color = new Map<string, 0 | 1 | 2>()
  const backedges = new Set<string>()

  function dfs(nodeid: string) {
    color.set(nodeid, 1)
    for (const next of adj.get(nodeid) ?? []) {
      const state = color.get(next) ?? 0
      if (state === 0) {
        dfs(next)
      } else if (state === 1) {
        backedges.add(`${nodeid}->${next}`)
      }
    }
    color.set(nodeid, 2)
  }

  for (const nodeid of nodeids) {
    if ((color.get(nodeid) ?? 0) === 0) {
      dfs(nodeid)
    }
  }

  return backedges
}

function computeranks(
  nodeids: string[],
  dagedges: DAGEdge[],
): Map<string, number> {
  const rank = new Map<string, number>()
  for (const nodeid of nodeids) {
    rank.set(nodeid, 0)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const edge of dagedges) {
      const nextrank = (rank.get(edge.from) ?? 0) + 1
      if (nextrank > (rank.get(edge.to) ?? 0)) {
        rank.set(edge.to, nextrank)
        changed = true
      }
    }
  }

  return rank
}

export function computedaglayout(options: DAGLayoutOptions): DAGLayoutResult {
  const direction = options.direction ?? 'vertical'
  const nodewidth = options.nodeWidth ?? 160
  const nodeheight = options.nodeHeight ?? 40
  const rankgap = options.rankGap ?? 64
  const nodegap = options.nodeGap ?? 48
  const padding = options.padding ?? 24

  const nodeids = options.nodes.map((node) => node.id)
  const backedges = detectbackedges(nodeids, options.edges)
  const dagedges = options.edges.filter(
    (edge) => !backedges.has(`${edge.from}->${edge.to}`),
  )
  const rank = computeranks(nodeids, dagedges)
  const maxrank = Math.max(0, ...rank.values())

  const ranksnodes: string[][] = []
  for (let r = 0; r <= maxrank; r++) {
    ranksnodes.push(nodeids.filter((nodeid) => (rank.get(nodeid) ?? 0) === r))
  }

  const pos = new Map<string, { x: number; y: number }>()
  const ranklayouts: RankLayout[] = []

  if (direction === 'vertical') {
    const rankwidths = ranksnodes.map(
      (ids) => ids.length * nodewidth + Math.max(0, ids.length - 1) * nodegap,
    )
    const maxrankwidth = Math.max(nodewidth, ...rankwidths)

    let y = padding
    for (let r = 0; r < ranksnodes.length; r++) {
      const ids = ranksnodes[r]
      const rankwidth = rankwidths[r]
      const rankheight = nodeheight
      const startx = padding + (maxrankwidth - rankwidth) / 2

      ids.forEach((nodeid, index) => {
        const x = startx + index * (nodewidth + nodegap)
        pos.set(nodeid, { x, y })
      })

      ranklayouts.push({
        rank: r,
        x: startx - 8,
        y: y - 8,
        width: rankwidth + 16,
        height: rankheight + 16,
      })

      y += rankheight + rankgap
    }
  } else {
    let x = padding
    for (let r = 0; r < ranksnodes.length; r++) {
      const ids = ranksnodes[r]
      const rankwidth = nodewidth
      const rankheight =
        ids.length * nodeheight + Math.max(0, ids.length - 1) * nodegap
      const starty = padding

      ids.forEach((nodeid, index) => {
        const y = starty + index * (nodeheight + nodegap)
        pos.set(nodeid, { x, y })
      })

      ranklayouts.push({
        rank: r,
        x: x - 8,
        y: starty - 8,
        width: rankwidth + 16,
        height: rankheight + 16,
      })

      x += rankwidth + rankgap
    }
  }

  let maxx = padding
  let maxy = padding
  for (const nodeid of nodeids) {
    const p = pos.get(nodeid)
    if (!p) {
      continue
    }
    maxx = Math.max(maxx, p.x + nodewidth + padding)
    maxy = Math.max(maxy, p.y + nodeheight + padding)
  }

  const nodelayouts: NodeLayout[] = nodeids.map((nodeid) => {
    const p = pos.get(nodeid) ?? { x: padding, y: padding }
    return { id: nodeid, x: p.x, y: p.y }
  })

  const edgelayouts: EdgeLayout[] = options.edges.map((edge) => {
    const from = pos.get(edge.from) ?? { x: 0, y: 0 }
    const to = pos.get(edge.to) ?? { x: 0, y: 0 }
    const isbackedge = backedges.has(`${edge.from}->${edge.to}`)

    if (direction === 'vertical') {
      return {
        from: edge.from,
        to: edge.to,
        sourceX: from.x + nodewidth / 2,
        sourceY: from.y + nodeheight,
        targetX: to.x + nodewidth / 2,
        targetY: to.y,
        isBackEdge: isbackedge,
      }
    }

    return {
      from: edge.from,
      to: edge.to,
      sourceX: from.x + nodewidth,
      sourceY: from.y + nodeheight / 2,
      targetX: to.x,
      targetY: to.y + nodeheight / 2,
      isBackEdge: isbackedge,
    }
  })

  return {
    width: maxx,
    height: maxy,
    ranks: ranklayouts,
    edges: edgelayouts,
    nodes: nodelayouts,
  }
}
