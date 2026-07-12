import {
  cellinwanixtermselection,
  extractwanixtermselectiontext,
  formatwanixtermpaste,
  haswanixtermselection,
} from 'zss/device/wanixclient/wanixtermclipboard'
import type { WanixTermTileBuffer } from 'zss/device/wanixclient/state'

function makebuffer(
  lines: string[],
  opts?: { cols?: number; scrollbacklines?: string[] },
): WanixTermTileBuffer {
  const cols = opts?.cols ?? Math.max(...lines.map((line) => line.length), 1)
  const rows = lines.length
  const char = new Array(cols * rows).fill(32)
  for (let y = 0; y < lines.length; y++) {
    for (let x = 0; x < lines[y].length; x++) {
      char[y * cols + x] = lines[y].charCodeAt(x)
    }
  }
  const scrollbacklines = opts?.scrollbacklines ?? []
  const scrollbackrows = scrollbacklines.length
  const scrollbackchar = new Array(scrollbackrows * cols).fill(32)
  for (let y = 0; y < scrollbacklines.length; y++) {
    for (let x = 0; x < scrollbacklines[y].length; x++) {
      scrollbackchar[y * cols + x] = scrollbacklines[y].charCodeAt(x)
    }
  }
  return {
    cols,
    rows,
    char,
    color: new Array(cols * rows).fill(15),
    bg: new Array(cols * rows).fill(0),
    cursorx: 0,
    cursory: 0,
    cursorvisible: true,
    scrollbackrows,
    scrollbackchar,
    scrollbackcolor: new Array(scrollbackrows * cols).fill(15),
    scrollbackbg: new Array(scrollbackrows * cols).fill(0),
    bracketedpaste: false,
    altactive: false,
    digest: '',
    version: 1,
  }
}

describe('wanixtermclipboard', () => {
  it('detects empty and non-empty selection', () => {
    expect(haswanixtermselection(null, null)).toBe(false)
    expect(
      haswanixtermselection({ line: 0, col: 0 }, { line: 0, col: 0 }),
    ).toBe(false)
    expect(
      haswanixtermselection({ line: 0, col: 0 }, { line: 0, col: 2 }),
    ).toBe(true)
  })

  it('extracts a single-line selection and trims trailing spaces', () => {
    const buffer = makebuffer(['hello     '])
    const text = extractwanixtermselectiontext(
      buffer,
      { line: 0, col: 0 },
      { line: 0, col: 4 },
    )
    expect(text).toBe('hello')
  })

  it('extracts a multi-line selection across physical rows', () => {
    const buffer = makebuffer(['abc', 'def'])
    const text = extractwanixtermselectiontext(
      buffer,
      { line: 0, col: 1 },
      { line: 1, col: 1 },
    )
    expect(text).toBe('bc\nde')
  })

  it('extracts selection spanning scrollback and viewport', () => {
    const buffer = makebuffer(['live'], {
      scrollbacklines: ['old'],
      cols: 4,
    })
    const text = extractwanixtermselectiontext(
      buffer,
      { line: 0, col: 0 },
      { line: 1, col: 3 },
    )
    expect(text).toBe('old\nlive')
  })

  it('highlights cells inside a normalized selection range', () => {
    expect(
      cellinwanixtermselection(1, 0, { line: 1, col: 2 }, { line: 0, col: 1 }),
    ).toBe(true)
    expect(
      cellinwanixtermselection(0, 0, { line: 1, col: 2 }, { line: 0, col: 1 }),
    ).toBe(false)
  })

  it('formats paste text and optional bracketed mode', () => {
    expect(formatwanixtermpaste('a\r\nb', false)).toBe('a\nb')
    expect(formatwanixtermpaste('hi', true)).toBe('\x1b[200~hi\x1b[201~')
  })
})
