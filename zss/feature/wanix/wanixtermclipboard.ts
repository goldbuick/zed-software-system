import type { WanixTermTileBuffer } from 'zss/feature/wanix/wanixtermbuffer'

export type WanixTermCellPos = {
  line: number
  col: number
}

const BRACKETED_PASTE_START = '\x1b[200~'
const BRACKETED_PASTE_END = '\x1b[201~'

export function readwanixtermlinecell(
  buffer: WanixTermTileBuffer,
  lineindex: number,
  col: number,
) {
  const cols = buffer.cols
  if (col < 0 || col >= cols) {
    return { char: 32, color: 15, bg: 0 }
  }
  if (lineindex < buffer.scrollbackrows) {
    const index = lineindex * cols + col
    return {
      char: buffer.scrollbackchar?.[index] ?? 32,
      color: buffer.scrollbackcolor?.[index] ?? 15,
      bg: buffer.scrollbackbg?.[index] ?? 0,
    }
  }
  const viewportline = lineindex - (buffer.scrollbackrows ?? 0)
  if (viewportline < 0 || viewportline >= buffer.rows) {
    return { char: 32, color: 15, bg: 0 }
  }
  const index = viewportline * cols + col
  return {
    char: buffer.char[index] ?? 32,
    color: buffer.color[index] ?? 15,
    bg: buffer.bg[index] ?? 0,
  }
}

export function haswanixtermselection(
  anchor: WanixTermCellPos | null,
  active: WanixTermCellPos | null,
): boolean {
  if (anchor == null || active == null) {
    return false
  }
  return anchor.line !== active.line || anchor.col !== active.col
}

function normalizewanixtermselectionrange(
  anchor: WanixTermCellPos,
  active: WanixTermCellPos,
) {
  const start =
    anchor.line < active.line ||
    (anchor.line === active.line && anchor.col <= active.col)
      ? anchor
      : active
  const end = start === anchor ? active : anchor
  return { start, end }
}

export function cellinwanixtermselection(
  line: number,
  col: number,
  anchor: WanixTermCellPos | null,
  active: WanixTermCellPos | null,
): boolean {
  if (!haswanixtermselection(anchor, active)) {
    return false
  }
  const { start, end } = normalizewanixtermselectionrange(anchor!, active!)
  if (line < start.line || line > end.line) {
    return false
  }
  if (line === start.line && line === end.line) {
    return col >= start.col && col <= end.col
  }
  if (line === start.line) {
    return col >= start.col
  }
  if (line === end.line) {
    return col <= end.col
  }
  return true
}

function trimtrailinglinechars(line: string) {
  return line.replace(/ +$/, '')
}

export function extractwanixtermselectiontext(
  buffer: WanixTermTileBuffer,
  anchor: WanixTermCellPos,
  active: WanixTermCellPos,
): string {
  if (!haswanixtermselection(anchor, active)) {
    return ''
  }
  const { start, end } = normalizewanixtermselectionrange(anchor, active)
  const lines: string[] = []
  for (let line = start.line; line <= end.line; line++) {
    const startcol = line === start.line ? start.col : 0
    const endcol = line === end.line ? end.col : buffer.cols - 1
    let text = ''
    for (let col = startcol; col <= endcol; col++) {
      const ch = readwanixtermlinecell(buffer, line, col).char
      text += ch >= 32 && ch <= 126 ? String.fromCharCode(ch) : ' '
    }
    lines.push(trimtrailinglinechars(text))
  }
  return lines.join('\n')
}

export function formatwanixtermpaste(text: string, bracketed: boolean): string {
  const cleaned = text.replaceAll('\r', '')
  if (!bracketed) {
    return cleaned
  }
  return `${BRACKETED_PASTE_START}${cleaned}${BRACKETED_PASTE_END}`
}

export function movewanixtermselection(
  active: WanixTermCellPos,
  key: string,
  buffer: WanixTermTileBuffer,
): WanixTermCellPos {
  const totallines = (buffer.scrollbackrows ?? 0) + buffer.rows
  const cols = buffer.cols
  let { line, col } = active
  switch (key) {
    case 'arrowleft':
      col = Math.max(0, col - 1)
      break
    case 'arrowright':
      col = Math.min(cols - 1, col + 1)
      break
    case 'arrowup':
      line = Math.max(0, line - 1)
      col = Math.min(col, cols - 1)
      break
    case 'arrowdown':
      line = Math.min(totallines - 1, line + 1)
      col = Math.min(col, cols - 1)
      break
  }
  return { line, col }
}

export function readwanixtermguestcursor(
  buffer: WanixTermTileBuffer,
): WanixTermCellPos {
  return {
    line: (buffer.scrollbackrows ?? 0) + buffer.cursory,
    col: buffer.cursorx,
  }
}
