import { COLOR } from 'zss/words/types'

const DEFAULT_FG = COLOR.WHITE
const DEFAULT_BG = COLOR.BLACK
const SPACE = 32

export type WanixTermCellsSnapshot = {
  cols: number
  rows: number
  char: number[]
  color: number[]
  bg: number[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
  digest: string
}

export type WANIX_TERM_GRID = {
  cols: number
  rows: number
  char: number[]
  color: number[]
  bg: number[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
}

function cellindex(grid: WANIX_TERM_GRID, x: number, y: number) {
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) {
    return -1
  }
  return x + y * grid.cols
}

function putcell(
  grid: WANIX_TERM_GRID,
  x: number,
  y: number,
  ch: number,
  fg = DEFAULT_FG,
  bg = DEFAULT_BG,
) {
  const index = cellindex(grid, x, y)
  if (index < 0) {
    return
  }
  grid.char[index] = ch
  grid.color[index] = fg
  grid.bg[index] = bg
}

function scrollup(grid: WANIX_TERM_GRID) {
  if (grid.rows <= 1) {
    return
  }
  const rowsize = grid.cols
  for (let y = 1; y < grid.rows; ++y) {
    for (let x = 0; x < rowsize; ++x) {
      const from = x + y * rowsize
      const to = x + (y - 1) * rowsize
      grid.char[to] = grid.char[from]
      grid.color[to] = grid.color[from]
      grid.bg[to] = grid.bg[from]
    }
  }
  const lastrow = (grid.rows - 1) * rowsize
  for (let x = 0; x < rowsize; ++x) {
    const index = lastrow + x
    grid.char[index] = SPACE
    grid.color[index] = DEFAULT_FG
    grid.bg[index] = DEFAULT_BG
  }
}

function newline(grid: WANIX_TERM_GRID) {
  grid.cursorx = 0
  if (grid.cursory >= grid.rows - 1) {
    scrollup(grid)
  } else {
    grid.cursory += 1
  }
}

function writechar(
  grid: WANIX_TERM_GRID,
  ch: number,
  fg = DEFAULT_FG,
  bg = DEFAULT_BG,
) {
  if (ch === 10) {
    newline(grid)
    return
  }
  if (ch === 13) {
    grid.cursorx = 0
    return
  }
  if (ch === 8 || ch === 127) {
    if (grid.cursorx > 0) {
      grid.cursorx -= 1
      putcell(grid, grid.cursorx, grid.cursory, SPACE, fg, bg)
    }
    return
  }
  if (ch < 32 && ch !== 9) {
    return
  }
  if (ch === 9) {
    const tabstop = 8
    const next = Math.ceil((grid.cursorx + 1) / tabstop) * tabstop
    grid.cursorx = Math.min(next, Math.max(0, grid.cols - 1))
    return
  }
  putcell(grid, grid.cursorx, grid.cursory, ch, fg, bg)
  grid.cursorx += 1
  if (grid.cursorx >= grid.cols) {
    newline(grid)
  }
}

function resetgridcells(grid: WANIX_TERM_GRID) {
  grid.char.fill(SPACE)
  grid.color.fill(DEFAULT_FG)
  grid.bg.fill(DEFAULT_BG)
  grid.cursorx = 0
  grid.cursory = 0
  grid.cursorvisible = true
}

function parsecsi(grid: WANIX_TERM_GRID, seq: string) {
  if (seq === '2J' || seq === 'H') {
    resetgridcells(grid)
    return
  }
  const cursor = /^(\d*);(\d*)H$/.exec(seq)
  if (cursor) {
    const row = Math.max(0, (parseInt(cursor[1] || '1', 10) || 1) - 1)
    const col = Math.max(0, (parseInt(cursor[2] || '1', 10) || 1) - 1)
    grid.cursory = Math.min(row, Math.max(0, grid.rows - 1))
    grid.cursorx = Math.min(col, Math.max(0, grid.cols - 1))
    return
  }
  const sgr = /^(\d*)m$/.exec(seq)
  if (sgr) {
    return
  }
}

function writechunkinternal(grid: WANIX_TERM_GRID, chunk: string) {
  let i = 0
  while (i < chunk.length) {
    const ch = chunk.charCodeAt(i)
    if (ch === 27 && chunk.charCodeAt(i + 1) === 91) {
      i += 2
      let seq = ''
      while (i < chunk.length) {
        const code = chunk.charCodeAt(i)
        if (code >= 0x40 && code <= 0x7e) {
          seq += chunk[i]
          ++i
          break
        }
        seq += chunk[i]
        ++i
      }
      parsecsi(grid, seq)
      continue
    }
    writechar(grid, ch)
    ++i
  }
}

export function createwanixtermgrid(cols: number, rows: number): WANIX_TERM_GRID {
  const nextcols = Math.max(1, cols)
  const nextrows = Math.max(1, rows)
  const size = nextcols * nextrows
  const grid: WANIX_TERM_GRID = {
    cols: nextcols,
    rows: nextrows,
    char: new Array(size).fill(SPACE),
    color: new Array(size).fill(DEFAULT_FG),
    bg: new Array(size).fill(DEFAULT_BG),
    cursorx: 0,
    cursory: 0,
    cursorvisible: true,
  }
  return grid
}

export function wanixtermgridresize(
  grid: WANIX_TERM_GRID,
  cols: number,
  rows: number,
): WANIX_TERM_GRID {
  const nextcols = Math.max(1, cols)
  const nextrows = Math.max(1, rows)
  if (grid.cols === nextcols && grid.rows === nextrows) {
    return grid
  }
  return createwanixtermgrid(nextcols, nextrows)
}

export function wanixtermgridwritebytes(
  grid: WANIX_TERM_GRID,
  bytes: Uint8Array,
  decoder?: TextDecoder,
) {
  if (!bytes.length) {
    return
  }
  const textdecoder = decoder ?? new TextDecoder()
  writechunkinternal(grid, textdecoder.decode(bytes))
}

export function readwanixtermgridsnapshot(
  grid: WANIX_TERM_GRID,
): WanixTermCellsSnapshot {
  const snapshot: WanixTermCellsSnapshot = {
    cols: grid.cols,
    rows: grid.rows,
    char: [...grid.char],
    color: [...grid.color],
    bg: [...grid.bg],
    cursorx: grid.cursorx,
    cursory: grid.cursory,
    cursorvisible: grid.cursorvisible,
    digest: '',
  }
  snapshot.digest = digestwanixtermcells(snapshot)
  return snapshot
}

export function digestwanixtermcells(snapshot: WanixTermCellsSnapshot): string {
  let hash = snapshot.cols * 65537 + snapshot.rows
  hash = hash * 31 + snapshot.cursorx
  hash = hash * 31 + snapshot.cursory
  hash = hash * 31 + (snapshot.cursorvisible ? 1 : 0)
  for (let i = 0; i < snapshot.char.length; i++) {
    hash = (hash * 33 + snapshot.char[i]) | 0
    hash = (hash * 33 + snapshot.color[i]) | 0
    hash = (hash * 33 + snapshot.bg[i]) | 0
  }
  return String(hash)
}

export function readwanixtermgridpreview(
  snapshot: WanixTermCellsSnapshot,
  maxrows = 3,
): string {
  const lines: string[] = []
  for (let y = 0; y < Math.min(snapshot.rows, maxrows); y++) {
    let line = ''
    for (let x = 0; x < snapshot.cols; x++) {
      const ch = snapshot.char[x + y * snapshot.cols] ?? SPACE
      line += ch >= 32 && ch <= 126 ? String.fromCharCode(ch) : ' '
    }
    const trimmed = line.trimEnd()
    if (trimmed.length) {
      lines.push(trimmed)
    }
  }
  return lines.join(' | ')
}
