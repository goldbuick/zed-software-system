import type { WanixTermTileBuffer } from 'zss/device/wanixclient/wanixtermbuffer'
import {
  dumpwanixtermbuffertext,
  readwanixtermlinestring,
  readwanixtermtotallines,
} from 'zss/device/wanixclient/wanixtermtext'

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

function searchwanixtermbuffer(
  buffer: WanixTermTileBuffer,
  pattern: string,
): { line: number; col: number; match: string }[] {
  const matches: { line: number; col: number; match: string }[] = []
  const totallines = readwanixtermtotallines(buffer)
  for (let line = 0; line < totallines; line++) {
    const text = readwanixtermlinestring(buffer, line)
    let index = text.indexOf(pattern)
    while (index >= 0) {
      matches.push({ line, col: index, match: pattern })
      index = text.indexOf(pattern, index + 1)
    }
  }
  return matches
}

describe('wanixtermtext', () => {
  it('counts total lines across scrollback and viewport', () => {
    const buffer = makebuffer(['live'], { scrollbacklines: ['old', 'older'] })
    expect(readwanixtermtotallines(buffer)).toBe(3)
  })

  it('reads one line with trailing spaces trimmed', () => {
    const buffer = makebuffer(['hello     '])
    expect(readwanixtermlinestring(buffer, 0)).toBe('hello')
  })

  it('dumps scrollback and viewport together', () => {
    const buffer = makebuffer(['live'], { scrollbacklines: ['old'] })
    expect(dumpwanixtermbuffertext(buffer)).toBe('old\nlive')
  })

  it('dumps viewport only and supports tail', () => {
    const buffer = makebuffer(['one', 'two', 'three'], {
      scrollbacklines: ['a', 'b'],
    })
    expect(dumpwanixtermbuffertext(buffer, { viewportonly: true })).toBe(
      'one\ntwo\nthree',
    )
    expect(dumpwanixtermbuffertext(buffer, { tail: 2 })).toBe('two\nthree')
  })

  it('searches across scrollback and viewport', () => {
    const buffer = makebuffer(['live err'], { scrollbacklines: ['old ok'] })
    const matches = searchwanixtermbuffer(buffer, 'ok')
    expect(matches).toEqual([{ line: 0, col: 4, match: 'ok' }])
  })

  it('asserts buffer contains text', () => {
    const buffer = makebuffer(['export ready'])
    expect(dumpwanixtermbuffertext(buffer).includes('ready')).toBe(true)
    expect(dumpwanixtermbuffertext(buffer).includes('missing')).toBe(false)
  })
})
