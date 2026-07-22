import { COLOR } from 'zss/words/types'

const DEFAULT_FG = COLOR.WHITE
const DEFAULT_BG = COLOR.BLACK
const SPACE = 32
const BLINK_FG_OFFSET = 33
const BRIGHT_FG_OFFSET = 8
const SCROLLBACK_MAX = 500

const ANSI_FG: Record<number, number> = {
  0: COLOR.BLACK,
  1: COLOR.DKRED,
  2: COLOR.DKGREEN,
  3: COLOR.DKYELLOW,
  4: COLOR.DKBLUE,
  5: COLOR.DKPURPLE,
  6: COLOR.DKCYAN,
  7: COLOR.LTGRAY,
}

const ANSI_FG_BRIGHT: Record<number, number> = {
  0: COLOR.DKGRAY,
  1: COLOR.RED,
  2: COLOR.GREEN,
  3: COLOR.YELLOW,
  4: COLOR.BLUE,
  5: COLOR.PURPLE,
  6: COLOR.CYAN,
  7: COLOR.WHITE,
}

export type WanixTermScrollbackLine = {
  char: number[]
  color: number[]
  bg: number[]
  wrapped: boolean
}

export type WanixTermCellsSnapshot = {
  cols: number
  rows: number
  char: number[]
  color: number[]
  bg: number[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
  scrollbackrows: number
  scrollbackchar: number[]
  scrollbackcolor: number[]
  scrollbackbg: number[]
  digest: string
  altactive: boolean
  bracketedpaste: boolean
}

export type WanixTermNormalSave = {
  cols: number
  rows: number
  char: number[]
  color: number[]
  bg: number[]
  wrapped: boolean[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
  curfg: number
  curbg: number
  blink: boolean
  reverse: boolean
  scrollback: WanixTermScrollbackLine[]
}

export type WanixSavedCursor = {
  cursorx: number
  cursory: number
  cursorvisible: boolean
}

export type WANIX_TERM_GRID = {
  cols: number
  rows: number
  char: number[]
  color: number[]
  bg: number[]
  wrapped: boolean[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
  curfg: number
  curbg: number
  blink: boolean
  reverse: boolean
  scrollback: WanixTermScrollbackLine[]
  altactive: boolean
  savednormal: WanixTermNormalSave | null
  savedcursor: WanixSavedCursor | null
}

type WanixTermCell = {
  ch: number
  color: number
  bg: number
}

type WanixTermPhysicalRow = {
  char: number[]
  color: number[]
  bg: number[]
  wrapped: boolean
}

function ansifgtocolor(index: number, bright: boolean) {
  const palette = bright ? ANSI_FG_BRIGHT : ANSI_FG
  return palette[index] ?? DEFAULT_FG
}

function ansibgtocolor(index: number, bright: boolean) {
  const palette = bright ? ANSI_FG_BRIGHT : ANSI_FG
  return palette[index] ?? DEFAULT_BG
}

function brightenfg(fg: number) {
  if ((fg as COLOR) >= COLOR.BLACK && (fg as COLOR) <= COLOR.LTGRAY) {
    return fg + BRIGHT_FG_OFFSET
  }
  return fg
}

function normalizefg(color: number) {
  if ((color as COLOR) >= COLOR.BLBLACK) {
    return color - BLINK_FG_OFFSET
  }
  return color
}

function resolvecellcolors(grid: WANIX_TERM_GRID) {
  let fg = grid.curfg
  let bg = grid.curbg
  if (grid.reverse) {
    const swapfg = normalizefg(fg)
    const swapbg = normalizefg(bg)
    fg = swapbg
    bg = swapfg
  }
  if (
    grid.blink &&
    (fg as COLOR) >= COLOR.BLACK &&
    (fg as COLOR) <= COLOR.WHITE
  ) {
    fg += BLINK_FG_OFFSET
  }
  return { fg, bg }
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
  fg?: number,
  bg?: number,
) {
  const index = cellindex(grid, x, y)
  if (index < 0) {
    return
  }
  const colors = resolvecellcolors(grid)
  grid.char[index] = ch
  grid.color[index] = fg ?? colors.fg
  grid.bg[index] = bg ?? colors.bg
}

function emptyphysicalrow(cols: number): WanixTermPhysicalRow {
  return {
    char: new Array(cols).fill(SPACE),
    color: new Array(cols).fill(DEFAULT_FG),
    bg: new Array(cols).fill(DEFAULT_BG),
    wrapped: false,
  }
}

function isphysicalrowempty(row: WanixTermPhysicalRow): boolean {
  for (let i = 0; i < row.char.length; i++) {
    if ((row.char[i] ?? SPACE) !== SPACE) {
      return false
    }
  }
  return true
}

function copysavenormal(grid: WANIX_TERM_GRID): WanixTermNormalSave {
  return {
    cols: grid.cols,
    rows: grid.rows,
    char: [...grid.char],
    color: [...grid.color],
    bg: [...grid.bg],
    wrapped: [...grid.wrapped],
    cursorx: grid.cursorx,
    cursory: grid.cursory,
    cursorvisible: grid.cursorvisible,
    curfg: grid.curfg,
    curbg: grid.curbg,
    blink: grid.blink,
    reverse: grid.reverse,
    scrollback: grid.scrollback.map((line) => ({
      char: [...line.char],
      color: [...line.color],
      bg: [...line.bg],
      wrapped: line.wrapped,
    })),
  }
}

function gridfromsaved(save: WanixTermNormalSave): WANIX_TERM_GRID {
  const grid = createwanixtermgrid(save.cols, save.rows)
  grid.char = [...save.char]
  grid.color = [...save.color]
  grid.bg = [...save.bg]
  grid.wrapped = [...save.wrapped]
  grid.cursorx = save.cursorx
  grid.cursory = save.cursory
  grid.cursorvisible = save.cursorvisible
  grid.curfg = save.curfg
  grid.curbg = save.curbg
  grid.blink = save.blink
  grid.reverse = save.reverse
  grid.scrollback = save.scrollback.map((line) => ({
    char: [...line.char],
    color: [...line.color],
    bg: [...line.bg],
    wrapped: line.wrapped,
  }))
  return grid
}

function savetocopy(grid: WANIX_TERM_GRID): WanixTermNormalSave {
  return copysavenormal(grid)
}

function pushscrollbackline(grid: WANIX_TERM_GRID) {
  if (grid.altactive) {
    return
  }
  const rowsize = grid.cols
  const line: WanixTermScrollbackLine = {
    char: grid.char.slice(0, rowsize),
    color: grid.color.slice(0, rowsize),
    bg: grid.bg.slice(0, rowsize),
    wrapped: grid.wrapped[0] ?? false,
  }
  grid.scrollback.push(line)
  if (grid.scrollback.length > SCROLLBACK_MAX) {
    grid.scrollback.shift()
  }
}

function scrollup(grid: WANIX_TERM_GRID) {
  if (grid.rows <= 1) {
    return
  }
  pushscrollbackline(grid)
  const rowsize = grid.cols
  for (let y = 1; y < grid.rows; ++y) {
    for (let x = 0; x < rowsize; ++x) {
      const from = x + y * rowsize
      const to = x + (y - 1) * rowsize
      grid.char[to] = grid.char[from]
      grid.color[to] = grid.color[from]
      grid.bg[to] = grid.bg[from]
    }
    grid.wrapped[y - 1] = grid.wrapped[y] ?? false
  }
  const colors = resolvecellcolors(grid)
  const lastrow = (grid.rows - 1) * rowsize
  for (let x = 0; x < rowsize; ++x) {
    const index = lastrow + x
    grid.char[index] = SPACE
    grid.color[index] = colors.fg
    grid.bg[index] = colors.bg
  }
  grid.wrapped[grid.rows - 1] = false
}

function newline(grid: WANIX_TERM_GRID, iswrap = false) {
  grid.cursorx = 0
  if (grid.cursory >= grid.rows - 1) {
    scrollup(grid)
    grid.wrapped[grid.cursory] = iswrap
  } else {
    grid.cursory += 1
    grid.wrapped[grid.cursory] = iswrap
  }
}

function writechar(grid: WANIX_TERM_GRID, ch: number) {
  if (ch === 10) {
    newline(grid, false)
    return
  }
  if (ch === 13) {
    grid.cursorx = 0
    return
  }
  if (ch === 8) {
    if (grid.cursorx > 0) {
      grid.cursorx -= 1
    }
    return
  }
  if (ch === 127) {
    if (grid.cursorx > 0) {
      grid.cursorx -= 1
      putcell(grid, grid.cursorx, grid.cursory, SPACE)
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
  putcell(grid, grid.cursorx, grid.cursory, ch)
  grid.cursorx += 1
  if (grid.cursorx >= grid.cols) {
    newline(grid, true)
  }
}

function resetsgr(grid: WANIX_TERM_GRID) {
  grid.curfg = DEFAULT_FG
  grid.curbg = DEFAULT_BG
  grid.blink = false
  grid.reverse = false
}

function applysgrcode(grid: WANIX_TERM_GRID, code: number) {
  if (code === 0) {
    resetsgr(grid)
    return
  }
  if (code === 1) {
    grid.curfg = brightenfg(grid.curfg)
    return
  }
  if (code === 5 || code === 6) {
    grid.blink = true
    return
  }
  if (code === 7) {
    grid.reverse = !grid.reverse
    return
  }
  if (code === 22) {
    grid.curfg = normalizefg(grid.curfg)
    if (
      (grid.curfg as COLOR) >= COLOR.DKGRAY &&
      (grid.curfg as COLOR) <= COLOR.WHITE
    ) {
      grid.curfg -= BRIGHT_FG_OFFSET
    }
    return
  }
  if (code === 25) {
    grid.blink = false
    return
  }
  if (code === 27) {
    grid.reverse = false
    return
  }
  if (code >= 30 && code <= 37) {
    grid.curfg = ansifgtocolor(code - 30, false)
    return
  }
  if (code >= 90 && code <= 97) {
    grid.curfg = ansifgtocolor(code - 90, true)
    return
  }
  if (code >= 40 && code <= 47) {
    grid.curbg = ansibgtocolor(code - 40, false)
    return
  }
  if (code >= 100 && code <= 107) {
    grid.curbg = ansibgtocolor(code - 100, true)
  }
}

function resetgridcells(grid: WANIX_TERM_GRID) {
  grid.char.fill(SPACE)
  grid.color.fill(DEFAULT_FG)
  grid.bg.fill(DEFAULT_BG)
  grid.wrapped.fill(false)
  grid.cursorx = 0
  grid.cursory = 0
  grid.cursorvisible = true
  resetsgr(grid)
}

function restorenormal(grid: WANIX_TERM_GRID, save: WanixTermNormalSave) {
  grid.cols = save.cols
  grid.rows = save.rows
  grid.char = [...save.char]
  grid.color = [...save.color]
  grid.bg = [...save.bg]
  grid.wrapped = [...save.wrapped]
  grid.cursorx = save.cursorx
  grid.cursory = save.cursory
  grid.cursorvisible = save.cursorvisible
  grid.curfg = save.curfg
  grid.curbg = save.curbg
  grid.blink = save.blink
  grid.reverse = save.reverse
  grid.scrollback = save.scrollback.map((line) => ({
    char: [...line.char],
    color: [...line.color],
    bg: [...line.bg],
    wrapped: line.wrapped,
  }))
}

function enteraltscreen(grid: WANIX_TERM_GRID) {
  if (grid.altactive) {
    return
  }
  grid.savednormal = copysavenormal(grid)
  resetgridcells(grid)
  grid.scrollback = []
  grid.altactive = true
}

function exitaltscreen(grid: WANIX_TERM_GRID) {
  if (!grid.altactive || grid.savednormal == null) {
    return
  }
  restorenormal(grid, grid.savednormal)
  grid.altactive = false
  grid.savednormal = null
}

function clampcursorx(grid: WANIX_TERM_GRID, x: number) {
  return Math.min(Math.max(0, x), Math.max(0, grid.cols - 1))
}

function clampcursory(grid: WANIX_TERM_GRID, y: number) {
  return Math.min(Math.max(0, y), Math.max(0, grid.rows - 1))
}

function readcsiparam(
  seq: string,
  final: string,
  defaultparam = 1,
): number | null {
  if (seq.length === 0 || !seq.endsWith(final)) {
    return null
  }
  const body = seq.slice(0, -1)
  if (body.includes(';') || body.includes('?')) {
    return null
  }
  if (body === '') {
    return defaultparam
  }
  const parsed = parseInt(body, 10)
  if (Number.isNaN(parsed)) {
    return defaultparam
  }
  return Math.max(0, parsed)
}

function clearcellat(grid: WANIX_TERM_GRID, x: number, y: number) {
  putcell(grid, x, y, SPACE)
}

function eraseline(grid: WANIX_TERM_GRID, mode: number) {
  const y = grid.cursory
  const x = grid.cursorx
  if (mode === 0) {
    for (let col = x; col < grid.cols; ++col) {
      clearcellat(grid, col, y)
    }
    return
  }
  if (mode === 1) {
    for (let col = 0; col <= x && col < grid.cols; ++col) {
      clearcellat(grid, col, y)
    }
    return
  }
  if (mode === 2) {
    for (let col = 0; col < grid.cols; ++col) {
      clearcellat(grid, col, y)
    }
  }
}

function erasedisplay(grid: WANIX_TERM_GRID, mode: number) {
  if (mode === 2) {
    resetgridcells(grid)
    return
  }
  if (mode === 0) {
    for (let row = grid.cursory; row < grid.rows; ++row) {
      const startcol = row === grid.cursory ? grid.cursorx : 0
      for (let col = startcol; col < grid.cols; ++col) {
        clearcellat(grid, col, row)
      }
    }
    return
  }
  if (mode === 1) {
    for (let row = 0; row <= grid.cursory && row < grid.rows; ++row) {
      const endcol = row === grid.cursory ? grid.cursorx : grid.cols - 1
      for (let col = 0; col <= endcol; ++col) {
        clearcellat(grid, col, row)
      }
    }
  }
}

function erasechars(grid: WANIX_TERM_GRID, count: number) {
  const n = Math.max(1, count)
  const y = grid.cursory
  for (let i = 0; i < n; ++i) {
    const x = grid.cursorx + i
    if (x >= grid.cols) {
      break
    }
    clearcellat(grid, x, y)
  }
}

function insertchars(grid: WANIX_TERM_GRID, count: number) {
  const n = Math.max(1, count)
  const y = grid.cursory
  const offset = y * grid.cols
  const x = grid.cursorx
  const shift = Math.min(n, grid.cols - x)
  if (shift <= 0) {
    return
  }
  for (let col = grid.cols - 1; col >= x + shift; --col) {
    const from = offset + col - shift
    const to = offset + col
    grid.char[to] = grid.char[from]
    grid.color[to] = grid.color[from]
    grid.bg[to] = grid.bg[from]
  }
  for (let col = x; col < x + shift; ++col) {
    clearcellat(grid, col, y)
  }
}

function deletechars(grid: WANIX_TERM_GRID, count: number) {
  const n = Math.max(1, count)
  const y = grid.cursory
  const offset = y * grid.cols
  const x = grid.cursorx
  const shift = Math.min(n, grid.cols - x)
  if (shift <= 0) {
    return
  }
  for (let col = x; col < grid.cols - shift; ++col) {
    const from = offset + col + shift
    const to = offset + col
    grid.char[to] = grid.char[from]
    grid.color[to] = grid.color[from]
    grid.bg[to] = grid.bg[from]
  }
  for (let col = grid.cols - shift; col < grid.cols; ++col) {
    clearcellat(grid, col, y)
  }
}

function parsecup(seq: string): { row: number; col: number } | null {
  if (!seq.endsWith('H') || seq.startsWith('?')) {
    return null
  }
  const body = seq.slice(0, -1)
  if (body.includes('?')) {
    return null
  }
  if (body === '') {
    return { row: 0, col: 0 }
  }
  const parts = body.split(';')
  if (parts.length === 1) {
    const row = Math.max(0, (parseInt(parts[0] || '1', 10) || 1) - 1)
    return { row, col: 0 }
  }
  if (parts.length === 2) {
    const row = Math.max(0, (parseInt(parts[0] || '1', 10) || 1) - 1)
    const col = Math.max(0, (parseInt(parts[1] || '1', 10) || 1) - 1)
    return { row, col }
  }
  return null
}

function applycup(grid: WANIX_TERM_GRID, row: number, col: number) {
  grid.cursory = clampcursory(grid, row)
  grid.cursorx = clampcursorx(grid, col)
}

function savecursor(grid: WANIX_TERM_GRID) {
  grid.savedcursor = {
    cursorx: grid.cursorx,
    cursory: grid.cursory,
    cursorvisible: grid.cursorvisible,
  }
}

function restorecursor(grid: WANIX_TERM_GRID) {
  if (!grid.savedcursor) {
    return
  }
  grid.cursorx = clampcursorx(grid, grid.savedcursor.cursorx)
  grid.cursory = clampcursory(grid, grid.savedcursor.cursory)
  grid.cursorvisible = grid.savedcursor.cursorvisible
}

function parsecsi(grid: WANIX_TERM_GRID, seq: string) {
  if (seq === '?1049h' || seq === '?47h' || seq === '?1047h') {
    enteraltscreen(grid)
    return
  }
  if (seq === '?1049l' || seq === '?47l' || seq === '?1047l') {
    exitaltscreen(grid)
    return
  }
  if (seq === 's') {
    savecursor(grid)
    return
  }
  if (seq === 'u') {
    restorecursor(grid)
    return
  }
  const sgr = /^([\d;]*)m$/.exec(seq)
  if (sgr) {
    const parts = sgr[1] ? sgr[1].split(';') : ['0']
    for (let i = 0; i < parts.length; i++) {
      const code = parseInt(parts[i] || '0', 10)
      if (!Number.isNaN(code)) {
        applysgrcode(grid, code)
      }
    }
    return
  }
  const cup = parsecup(seq)
  if (cup) {
    applycup(grid, cup.row, cup.col)
    return
  }
  const cha = readcsiparam(seq, 'G', 1)
  if (cha != null) {
    grid.cursorx = clampcursorx(grid, cha - 1)
    return
  }
  const vpa = readcsiparam(seq, 'd', 1)
  if (vpa != null) {
    grid.cursory = clampcursory(grid, vpa - 1)
    return
  }
  const cub = readcsiparam(seq, 'D', 1)
  if (cub != null) {
    grid.cursorx = clampcursorx(grid, grid.cursorx - cub)
    return
  }
  const cuf = readcsiparam(seq, 'C', 1)
  if (cuf != null) {
    grid.cursorx = clampcursorx(grid, grid.cursorx + cuf)
    return
  }
  const cuu = readcsiparam(seq, 'A', 1)
  if (cuu != null) {
    grid.cursory = clampcursory(grid, grid.cursory - cuu)
    return
  }
  const cud = readcsiparam(seq, 'B', 1)
  if (cud != null) {
    grid.cursory = clampcursory(grid, grid.cursory + cud)
    return
  }
  const el = readcsiparam(seq, 'K', 0)
  if (el != null) {
    eraseline(grid, el)
    return
  }
  const ed = readcsiparam(seq, 'J', 0)
  if (ed != null) {
    erasedisplay(grid, ed)
    return
  }
  const ech = readcsiparam(seq, 'X', 1)
  if (ech != null) {
    erasechars(grid, ech)
    return
  }
  const ich = readcsiparam(seq, '@', 1)
  if (ich != null) {
    insertchars(grid, ich)
    return
  }
  const dch = readcsiparam(seq, 'P', 1)
  if (dch != null) {
    deletechars(grid, dch)
  }
}

function viewportrowsfromgrid(grid: WANIX_TERM_GRID): WanixTermPhysicalRow[] {
  const rows: WanixTermPhysicalRow[] = []
  for (let y = 0; y < grid.rows; y++) {
    const offset = y * grid.cols
    rows.push({
      char: grid.char.slice(offset, offset + grid.cols),
      color: grid.color.slice(offset, offset + grid.cols),
      bg: grid.bg.slice(offset, offset + grid.cols),
      wrapped: grid.wrapped[y] ?? false,
    })
  }
  return rows
}

function scrollbacktophysical(
  lines: WanixTermScrollbackLine[],
): WanixTermPhysicalRow[] {
  return lines.map((line) => ({
    char: [...line.char],
    color: [...line.color],
    bg: [...line.bg],
    wrapped: line.wrapped,
  }))
}

function physicaltoscrollback(
  row: WanixTermPhysicalRow,
): WanixTermScrollbackLine {
  return {
    char: [...row.char],
    color: [...row.color],
    bg: [...row.bg],
    wrapped: row.wrapped,
  }
}

function trimtrailingcells(cells: WanixTermCell[]) {
  while (cells.length > 0 && cells[cells.length - 1].ch === SPACE) {
    cells.pop()
  }
}

function applyphysicalrowstogrid(
  grid: WANIX_TERM_GRID,
  scrollbacklines: WanixTermScrollbackLine[],
  viewportlines: WanixTermPhysicalRow[],
) {
  grid.scrollback = scrollbacklines
  grid.rows = viewportlines.length
  const size = grid.cols * grid.rows
  grid.char = new Array(size).fill(SPACE)
  grid.color = new Array(size).fill(DEFAULT_FG)
  grid.bg = new Array(size).fill(DEFAULT_BG)
  grid.wrapped = new Array(grid.rows).fill(false)
  for (let y = 0; y < viewportlines.length; y++) {
    const row = viewportlines[y]
    const offset = y * grid.cols
    for (let x = 0; x < grid.cols; x++) {
      const index = offset + x
      grid.char[index] = row.char[x] ?? SPACE
      grid.color[index] = row.color[x] ?? DEFAULT_FG
      grid.bg[index] = row.bg[x] ?? DEFAULT_BG
    }
    grid.wrapped[y] = row.wrapped
  }
}

function reflowgridcontent(
  scrollback: WanixTermScrollbackLine[],
  viewport: WanixTermPhysicalRow[],
  newcols: number,
  newrows: number,
  abslrow: number,
  abslcol: number,
) {
  const allrows: WanixTermPhysicalRow[] = [
    ...scrollbacktophysical(scrollback),
    ...viewport,
  ]

  let cursorlogicalline = 0
  let cursorlogicalcol = 0
  let foundcursor = false

  const logicallines: WanixTermCell[][] = []
  let physidx = 0
  while (physidx < allrows.length) {
    const startphys = physidx
    const cells: WanixTermCell[] = []
    for (;;) {
      const row = allrows[physidx]
      for (let x = 0; x < row.char.length; x++) {
        cells.push({
          ch: row.char[x] ?? SPACE,
          color: row.color[x] ?? DEFAULT_FG,
          bg: row.bg[x] ?? DEFAULT_BG,
        })
      }
      physidx += 1
      if (physidx >= allrows.length || !allrows[physidx].wrapped) {
        break
      }
    }
    if (!foundcursor && abslrow >= startphys && abslrow < physidx) {
      let offset = 0
      for (let r = startphys; r < abslrow; r++) {
        offset += allrows[r].char.length
      }
      offset += abslcol
      cursorlogicalline = logicallines.length
      cursorlogicalcol = offset
      foundcursor = true
    }
    trimtrailingcells(cells)
    logicallines.push(cells)
  }

  const newphysrows: WanixTermPhysicalRow[] = []
  let newcursorabslrow = 0
  let newcursorabslcol = 0
  let segmentabslrow = 0

  for (let li = 0; li < logicallines.length; li++) {
    const cells = logicallines[li]
    if (cells.length === 0) {
      if (li === cursorlogicalline && foundcursor) {
        newcursorabslrow = segmentabslrow
        newcursorabslcol = 0
      }
      newphysrows.push(emptyphysicalrow(newcols))
      segmentabslrow += 1
      continue
    }
    let cellidx = 0
    let segmentinlogicalline = 0
    while (cellidx < cells.length) {
      const segcells = cells.slice(cellidx, cellidx + newcols)
      const row = emptyphysicalrow(newcols)
      for (let i = 0; i < segcells.length; i++) {
        row.char[i] = segcells[i].ch
        row.color[i] = segcells[i].color
        row.bg[i] = segcells[i].bg
      }
      row.wrapped = segmentinlogicalline > 0
      if (li === cursorlogicalline && foundcursor) {
        const segstart = cellidx
        const segend = cellidx + newcols
        if (cursorlogicalcol >= segstart && cursorlogicalcol < segend) {
          newcursorabslrow = segmentabslrow
          newcursorabslcol = cursorlogicalcol - segstart
        }
      }
      newphysrows.push(row)
      cellidx += newcols
      segmentinlogicalline += 1
      segmentabslrow += 1
    }
  }

  // Unused blank rows below the cursor are viewport padding, not content.
  // Keeping them as logical lines shoves short stdout into scrollback on the
  // first termfit shrink (default 80x24 -> attach panel) and leaves a blank
  // gap between the text and the cursor.
  while (
    newphysrows.length > newcursorabslrow + 1 &&
    isphysicalrowempty(newphysrows[newphysrows.length - 1]!)
  ) {
    newphysrows.pop()
  }

  const scrollbackcount = Math.max(0, newphysrows.length - newrows)
  let scrollbacklines = newphysrows
    .slice(0, scrollbackcount)
    .map(physicaltoscrollback)
  while (scrollbacklines.length > SCROLLBACK_MAX) {
    const removed = scrollbacklines.length - SCROLLBACK_MAX
    scrollbacklines = scrollbacklines.slice(removed)
    newcursorabslrow = Math.max(0, newcursorabslrow - removed)
  }

  const viewportlines = newphysrows.slice(scrollbackcount)
  while (viewportlines.length < newrows) {
    viewportlines.push(emptyphysicalrow(newcols))
  }

  return {
    scrollbacklines,
    viewportlines: viewportlines.slice(0, newrows),
    cursory: Math.min(
      Math.max(0, newcursorabslrow - scrollbacklines.length),
      newrows - 1,
    ),
    cursorx: Math.min(Math.max(0, newcursorabslcol), newcols - 1),
  }
}

function reflowgrid(grid: WANIX_TERM_GRID, newcols: number, newrows: number) {
  const abslrow = grid.scrollback.length + grid.cursory
  const abslcol = grid.cursorx
  const viewport = viewportrowsfromgrid(grid)
  const reflowed = reflowgridcontent(
    grid.scrollback,
    viewport,
    newcols,
    newrows,
    abslrow,
    abslcol,
  )
  grid.cols = newcols
  applyphysicalrowstogrid(
    grid,
    reflowed.scrollbacklines,
    reflowed.viewportlines,
  )
  grid.cursory = reflowed.cursory
  grid.cursorx = reflowed.cursorx
}

function resizealtviewport(
  grid: WANIX_TERM_GRID,
  newcols: number,
  newrows: number,
) {
  grid.cols = newcols
  grid.rows = newrows
  const size = newcols * newrows
  grid.char = new Array(size).fill(SPACE)
  grid.color = new Array(size).fill(DEFAULT_FG)
  grid.bg = new Array(size).fill(DEFAULT_BG)
  grid.wrapped = new Array(newrows).fill(false)
  grid.cursorx = Math.min(grid.cursorx, Math.max(0, newcols - 1))
  grid.cursory = Math.min(grid.cursory, Math.max(0, newrows - 1))
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

function flattenscrollback(grid: WANIX_TERM_GRID) {
  const scrollbackchar: number[] = []
  const scrollbackcolor: number[] = []
  const scrollbackbg: number[] = []
  for (let i = 0; i < grid.scrollback.length; i++) {
    const line = grid.scrollback[i]
    scrollbackchar.push(...line.char)
    scrollbackcolor.push(...line.color)
    scrollbackbg.push(...line.bg)
  }
  return {
    scrollbackrows: grid.scrollback.length,
    scrollbackchar,
    scrollbackcolor,
    scrollbackbg,
  }
}

export function createwanixtermgrid(
  cols: number,
  rows: number,
): WANIX_TERM_GRID {
  const nextcols = Math.max(1, cols)
  const nextrows = Math.max(1, rows)
  const size = nextcols * nextrows
  const grid: WANIX_TERM_GRID = {
    cols: nextcols,
    rows: nextrows,
    char: new Array(size).fill(SPACE),
    color: new Array(size).fill(DEFAULT_FG),
    bg: new Array(size).fill(DEFAULT_BG),
    wrapped: new Array(nextrows).fill(false),
    cursorx: 0,
    cursory: 0,
    cursorvisible: true,
    curfg: DEFAULT_FG,
    curbg: DEFAULT_BG,
    blink: false,
    reverse: false,
    scrollback: [],
    altactive: false,
    savednormal: null,
    savedcursor: null,
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
  if (grid.altactive) {
    resizealtviewport(grid, nextcols, nextrows)
    if (grid.savednormal != null) {
      const savedgrid = gridfromsaved(grid.savednormal)
      reflowgrid(savedgrid, nextcols, nextrows)
      grid.savednormal = savetocopy(savedgrid)
    }
    return grid
  }
  reflowgrid(grid, nextcols, nextrows)
  return grid
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
  const scrollback = flattenscrollback(grid)
  const snapshot: WanixTermCellsSnapshot = {
    cols: grid.cols,
    rows: grid.rows,
    char: [...grid.char],
    color: [...grid.color],
    bg: [...grid.bg],
    cursorx: grid.cursorx,
    cursory: grid.cursory,
    cursorvisible: grid.cursorvisible,
    scrollbackrows: scrollback.scrollbackrows,
    scrollbackchar: scrollback.scrollbackchar,
    scrollbackcolor: scrollback.scrollbackcolor,
    scrollbackbg: scrollback.scrollbackbg,
    digest: '',
    altactive: grid.altactive,
    bracketedpaste: false,
  }
  snapshot.digest = digestwanixtermcells(snapshot)
  return snapshot
}

export function digestwanixtermcells(snapshot: WanixTermCellsSnapshot): string {
  let hash = snapshot.cols * 65537 + snapshot.rows
  hash = hash * 31 + snapshot.cursorx
  hash = hash * 31 + snapshot.cursory
  hash = hash * 31 + (snapshot.cursorvisible ? 1 : 0)
  hash = hash * 31 + snapshot.scrollbackrows
  for (let i = 0; i < snapshot.char.length; i++) {
    hash = (hash * 33 + snapshot.char[i]) | 0
    hash = (hash * 33 + snapshot.color[i]) | 0
    hash = (hash * 33 + snapshot.bg[i]) | 0
  }
  for (let i = 0; i < snapshot.scrollbackchar.length; i++) {
    hash = (hash * 37 + snapshot.scrollbackchar[i]) | 0
    hash = (hash * 37 + snapshot.scrollbackcolor[i]) | 0
    hash = (hash * 37 + snapshot.scrollbackbg[i]) | 0
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
