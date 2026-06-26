/** Minimal xterm.js shapes used by wanix term probe + cell reader. */

export type XtermCell = {
  getChars: () => string
  getWidth: () => number
  getFgColor: () => number
  getBgColor: () => number
  getFgColorMode?: () => number
  getBgColorMode?: () => number
}

export type XtermLine = {
  length: number
  translateToString: (trim?: boolean) => string
  getCell: (x: number) => XtermCell | undefined
}

export type XtermBuffer = {
  length: number
  cursorX: number
  cursorY: number
  baseY?: number
  getLine: (index: number) => XtermLine | undefined
}

export type XtermInstance = {
  cols: number
  rows: number
  buffer: { active: XtermBuffer }
  input: (data: string) => void
  focus: () => void
  resize: (cols: number, rows: number) => void
}

export type XtermCellSource = {
  cols: number
  rows: number
  buffer: { active: XtermBuffer }
}

export type WanixTermElement = HTMLElement & {
  _term?: XtermInstance | null
  focus?: () => void
}
