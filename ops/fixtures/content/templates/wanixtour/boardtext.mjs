/** Authoring helper — not wired into content:book:build. */

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25

export function textline(line, y, opts = {}) {
  const x0 = opts.x0 ?? 5
  const color = opts.color ?? 11
  const kind = opts.kind ?? 'fake'
  const terrain = []
  for (let col = 0; col < line.length; col++) {
    terrain.push({
      kind,
      char: line.charCodeAt(col),
      color,
      x: x0 + col,
      y,
    })
  }
  return terrain
}

export function textblock(lines, starty, opts = {}) {
  const rowgap = opts.rowgap ?? 0
  const terrain = []
  let y = starty
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 0) {
      terrain.push(...textline(lines[i], y, opts))
    }
    y += 1 + rowgap
  }
  return terrain
}

/** Corner solids only on N/S rows — middle stays open for @exitnorth/@exitsouth (coolregionsbow style). */
export function solidborder(width = BOARD_WIDTH, height = BOARD_HEIGHT, opts = {}) {
  const corner = opts.corner ?? 8
  const terrain = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isedge = y === 0 || y === height - 1 || x === 0 || x === width - 1
      if (!isedge) {
        continue
      }
      const iscornerband =
        y === 0 || y === height - 1
          ? x < corner || x >= width - corner
          : x === 0 || x === width - 1
      if (iscornerband) {
        terrain.push({ kind: 'solid', x, y })
      }
    }
  }
  return terrain
}

function hashseed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makerng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function intextzone(x, y) {
  return x >= 7 && x <= 57 && y >= 2 && y <= 21
}

function inexitlane(x, y, width = BOARD_WIDTH, height = BOARD_HEIGHT) {
  if (y !== 0 && y !== height - 1) {
    return false
  }
  const corner = 8
  return x >= corner && x < width - corner
}

/** Random `water` pools for side margins — seeded per board for stable regen. */
export function waterpools(seedstr, opts = {}) {
  const count = opts.count ?? 3
  const rng = makerng(hashseed(seedstr))
  const terrain = []
  const used = new Set()

  function key(x, y) {
    return `${x},${y}`
  }

  function canplace(x, y) {
    if (x <= 0 || x >= BOARD_WIDTH - 1 || y <= 0 || y >= BOARD_HEIGHT - 1) {
      return false
    }
    if (intextzone(x, y) || inexitlane(x, y)) {
      return false
    }
    return !used.has(key(x, y))
  }

  for (let p = 0; p < count; p++) {
    const side = rng() < 0.5 ? 0 : 1
    const cx =
      side === 0
        ? 2 + Math.floor(rng() * 5)
        : BOARD_WIDTH - 7 + Math.floor(rng() * 5)
    const cy = 4 + Math.floor(rng() * 16)
    const radius = 1 + Math.floor(rng() * 3)
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius + rng() * 0.8) {
          continue
        }
        const x = cx + dx
        const y = cy + dy
        if (!canplace(x, y)) {
          continue
        }
        used.add(key(x, y))
        terrain.push({ kind: 'water', x, y })
      }
    }
  }
  return terrain
}

export function flattenboardterrain(sparse, width = BOARD_WIDTH, height = BOARD_HEIGHT) {
  const size = width * height
  const flat = new Array(size).fill(null)
  for (let i = 0; i < sparse.length; ++i) {
    const tile = sparse[i]
    if (!tile || typeof tile.x !== 'number' || typeof tile.y !== 'number') {
      continue
    }
    if (tile.x < 0 || tile.x >= width || tile.y < 0 || tile.y >= height) {
      continue
    }
    const idx = tile.x + tile.y * width
    const { x, y, ...rest } = tile
    flat[idx] = rest
  }
  return flat
}

/** Build board JSON with a full row-major terrain grid (1500 cells). */
export function makeboard(name, code, sparseterrain) {
  return {
    code,
    board: {
      name,
      terrain: flattenboardterrain(sparseterrain),
      objects: {},
    },
  }
}
