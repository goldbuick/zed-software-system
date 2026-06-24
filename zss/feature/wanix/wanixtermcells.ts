import { xtermcolortozss } from 'zss/feature/wanix/wanixtermcolormap'
import { COLOR } from 'zss/words/types'

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
}

type XtermCell = {
  getChars: () => string
  getWidth: () => number
  getFgColor: () => number
  getBgColor: () => number
}

type XtermLine = {
  length: number
  translateToString: (trim?: boolean) => string
  getCell: (x: number) => XtermCell | undefined
}

type XtermBuffer = {
  length: number
  cursorX: number
  cursorY: number
  getLine: (index: number) => XtermLine | undefined
}

export type XtermCellSource = {
  cols: number
  rows: number
  buffer: { active: XtermBuffer }
}

function charcodefromcell(cell: XtermCell): number {
  const text = cell.getChars()
  if (!text.length) {
    return SPACE
  }
  return text.codePointAt(0) ?? SPACE
}

/** Read visible xterm buffer cells (excludes last xterm row — reserved for tile hints). */
export function readxtermcellsfromterm(
  term: XtermCellSource,
): WanixTermCellsSnapshot | null {
  if (term.cols <= 0 || term.rows <= 1) {
    return null
  }
  const cols = term.cols
  const rows = term.rows - 1
  const active = term.buffer.active
  const size = cols * rows
  const char = new Array<number>(size).fill(SPACE)
  const color = new Array<number>(size).fill(COLOR.WHITE)
  const bg = new Array<number>(size).fill(COLOR.BLACK)

  for (let y = 0; y < rows; y++) {
    const line = active.getLine(y)
    if (!line) {
      continue
    }
    const linelen = Math.min(cols, line.length)
    for (let x = 0; x < linelen; x++) {
      const cell = line.getCell(x)
      if (!cell) {
        continue
      }
      const index = x + y * cols
      char[index] = charcodefromcell(cell)
      color[index] = xtermcolortozss(cell.getFgColor(), false)
      bg[index] = xtermcolortozss(cell.getBgColor(), true)
    }
  }

  let cursorx = active.cursorX
  let cursory = active.cursorY
  let cursorvisible = true
  if (cursory >= rows) {
    cursorvisible = false
    cursory = Math.max(0, rows - 1)
  }
  if (cursorx >= cols) {
    cursorx = Math.max(0, cols - 1)
  }

  return {
    cols,
    rows,
    char,
    color,
    bg,
    cursorx,
    cursory,
    cursorvisible,
  }
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
