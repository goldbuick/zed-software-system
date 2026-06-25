import {
  xtermcellcolortozss,
  xtermcolortozss,
} from 'zss/feature/wanix/wanixtermcolormap'
import type {
  XtermCell,
  XtermCellSource,
} from 'zss/feature/wanix/wanixtermxtermtypes'
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

function charcodefromcell(cell: XtermCell): number {
  const text = cell.getChars()
  if (!text.length) {
    return SPACE
  }
  return text.codePointAt(0) ?? SPACE
}

function readxtermcellcolor(cell: XtermCell, kind: 'fg' | 'bg'): COLOR {
  const isbg = kind === 'bg'
  const color = isbg ? cell.getBgColor() : cell.getFgColor()
  const mode = isbg ? cell.getBgColorMode?.() : cell.getFgColorMode?.()
  if (mode !== undefined) {
    return xtermcellcolortozss(mode, color, isbg)
  }
  return xtermcolortozss(color, isbg)
}

/** Read visible xterm viewport cells. Hint row is tile-side only (see wanixtermscreenshowdetachhint). */
export function readxtermcellsfromterm(
  term: XtermCellSource,
): WanixTermCellsSnapshot | null {
  if (term.cols <= 0 || term.rows <= 0) {
    return null
  }
  const cols = term.cols
  const rows = term.rows
  const active = term.buffer.active
  const basey = active.baseY ?? 0
  const size = cols * rows
  const char = new Array<number>(size).fill(SPACE)
  const color = new Array<number>(size).fill(COLOR.WHITE)
  const bg = new Array<number>(size).fill(COLOR.BLACK)

  for (let y = 0; y < rows; y++) {
    const line = active.getLine(basey + y)
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
      color[index] = readxtermcellcolor(cell, 'fg')
      bg[index] = readxtermcellcolor(cell, 'bg')
    }
  }

  let cursorx = active.cursorX
  const cursory = Math.min(active.cursorY, rows - 1)
  const cursorvisible = active.cursorY >= 0 && active.cursorY < term.rows
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
