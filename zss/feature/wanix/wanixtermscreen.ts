import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermcells'
import { COLOR } from 'zss/words/types'
import { metakey } from 'zss/words/system'

const DEFAULT_FG = COLOR.WHITE
const DEFAULT_BG = COLOR.DKBLUE
const MIRROR_EMPTY_BG = COLOR.BLACK
const SPACE = 32

type WANIX_TERM_SCREEN = {
  width: number
  height: number
  char: number[]
  color: number[]
  bg: number[]
  cursorx: number
  cursory: number
  cursorvisible: boolean
  version: number
}

let screen: WANIX_TERM_SCREEN = createtermscreen(0, 0)
const listeners = new Set<() => void>()
let pendingout = ''
let outflushpending = false
let outflushhandle: number | undefined

function createtermscreen(width: number, height: number): WANIX_TERM_SCREEN {
  const size = Math.max(0, width * height)
  return {
    width,
    height,
    char: new Array(size).fill(SPACE),
    color: new Array(size).fill(DEFAULT_FG),
    bg: new Array(size).fill(DEFAULT_BG),
    cursorx: 0,
    cursory: 0,
    cursorvisible: false,
    version: 0,
  }
}

function bump() {
  screen = { ...screen, version: screen.version + 1 }
  for (const listener of listeners) {
    listener()
  }
}

function cellindex(x: number, y: number) {
  if (x < 0 || y < 0 || x >= screen.width || y >= screen.height) {
    return -1
  }
  return x + y * screen.width
}

function putcell(
  x: number,
  y: number,
  ch: number,
  fg = DEFAULT_FG,
  bg = DEFAULT_BG,
) {
  const index = cellindex(x, y)
  if (index < 0) {
    return
  }
  screen.char[index] = ch
  screen.color[index] = fg
  screen.bg[index] = bg
}

function scrollup() {
  if (screen.height <= 1) {
    return
  }
  const rowsize = screen.width
  for (let y = 1; y < screen.height; ++y) {
    for (let x = 0; x < rowsize; ++x) {
      const from = x + y * rowsize
      const to = x + (y - 1) * rowsize
      screen.char[to] = screen.char[from]
      screen.color[to] = screen.color[from]
      screen.bg[to] = screen.bg[from]
    }
  }
  const lastrow = (screen.height - 1) * rowsize
  for (let x = 0; x < rowsize; ++x) {
    const index = lastrow + x
    screen.char[index] = SPACE
    screen.color[index] = DEFAULT_FG
    screen.bg[index] = DEFAULT_BG
  }
}

function newline() {
  screen.cursorx = 0
  if (screen.cursory >= screen.height - 1) {
    scrollup()
  } else {
    screen.cursory += 1
  }
}

function writechar(ch: number, fg = DEFAULT_FG, bg = DEFAULT_BG) {
  if (ch === 10) {
    newline()
    return
  }
  if (ch === 13) {
    screen.cursorx = 0
    return
  }
  if (ch === 8 || ch === 127) {
    if (screen.cursorx > 0) {
      screen.cursorx -= 1
      putcell(screen.cursorx, screen.cursory, SPACE, fg, bg)
    }
    return
  }
  if (ch < 32 && ch !== 9) {
    return
  }
  if (ch === 9) {
    const tabstop = 8
    const next = Math.ceil((screen.cursorx + 1) / tabstop) * tabstop
    screen.cursorx = Math.min(next, Math.max(0, screen.width - 1))
    return
  }
  putcell(screen.cursorx, screen.cursory, ch, fg, bg)
  screen.cursorx += 1
  if (screen.cursorx >= screen.width) {
    newline()
  }
}

function parsecsi(seq: string) {
  if (seq === '2J' || seq === 'H') {
    wanixtermscreenresetcells()
    return
  }
  const cursor = /^(\d*);(\d*)H$/.exec(seq)
  if (cursor) {
    const row = Math.max(0, (parseInt(cursor[1] || '1', 10) || 1) - 1)
    const col = Math.max(0, (parseInt(cursor[2] || '1', 10) || 1) - 1)
    screen.cursory = Math.min(row, Math.max(0, screen.height - 1))
    screen.cursorx = Math.min(col, Math.max(0, screen.width - 1))
    return
  }
  const sgr = /^(\d*)m$/.exec(seq)
  if (sgr) {
    // v1: ignore SGR beyond default colors
    return
  }
}

function writechunkinternal(chunk: string) {
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
      parsecsi(seq)
      continue
    }
    writechar(ch)
    ++i
  }
}

function flushpendingout() {
  outflushpending = false
  outflushhandle = undefined
  if (!pendingout.length || screen.width <= 0 || screen.height <= 0) {
    return
  }
  const chunk = pendingout
  pendingout = ''
  writechunkinternal(chunk)
  bump()
}

function schedulependingout() {
  if (outflushpending) {
    return
  }
  outflushpending = true
  if (typeof requestAnimationFrame === 'function') {
    outflushhandle = requestAnimationFrame(flushpendingout)
    return
  }
  flushpendingout()
}

function writechunk(chunk: string) {
  writechunkinternal(chunk)
  bump()
}

function wanixtermscreenresetcells() {
  screen.char.fill(SPACE)
  screen.color.fill(DEFAULT_FG)
  screen.bg.fill(DEFAULT_BG)
  screen.cursorx = 0
  screen.cursory = 0
  screen.cursorvisible = false
}

export function readwanixtermscreenversion() {
  return screen.version
}

export function subscribewanixtermscreen(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readwanixtermscreencells() {
  return {
    width: screen.width,
    height: screen.height,
    char: screen.char,
    color: screen.color,
    bg: screen.bg,
    cursorx: screen.cursorx,
    cursory: screen.cursory,
    cursorvisible: screen.cursorvisible,
    version: screen.version,
  }
}

export function wanixtermscreensync(snapshot: WanixTermCellsSnapshot) {
  if (screen.width <= 0 || screen.height <= 0) {
    return
  }
  const mirrorrows = Math.min(snapshot.rows, Math.max(0, screen.height - 1))
  const mirrorcols = Math.min(snapshot.cols, screen.width)

  for (let y = 0; y < mirrorrows; y++) {
    for (let x = 0; x < mirrorcols; x++) {
      const from = x + y * snapshot.cols
      const to = x + y * screen.width
      screen.char[to] = snapshot.char[from] ?? SPACE
      screen.color[to] = snapshot.color[from] ?? DEFAULT_FG
      screen.bg[to] = snapshot.bg[from] ?? MIRROR_EMPTY_BG
    }
    for (let x = mirrorcols; x < screen.width; x++) {
      const to = x + y * screen.width
      screen.char[to] = SPACE
      screen.color[to] = DEFAULT_FG
      screen.bg[to] = MIRROR_EMPTY_BG
    }
  }

  screen.cursorx = snapshot.cursorx
  screen.cursory = snapshot.cursory
  screen.cursorvisible = snapshot.cursorvisible
  bump()
}

export function wanixtermscreenresize(width: number, height: number) {
  if (width === screen.width && height === screen.height) {
    return
  }
  screen = createtermscreen(width, height)
  bump()
}

export function wanixtermscreenreset() {
  if (
    outflushhandle !== undefined &&
    typeof cancelAnimationFrame === 'function'
  ) {
    cancelAnimationFrame(outflushhandle)
  }
  outflushpending = false
  outflushhandle = undefined
  screen = createtermscreen(screen.width, screen.height)
  wanixtermscreenresetcells()
  bump()
  if (pendingout.length > 0 && screen.width > 0 && screen.height > 0) {
    schedulependingout()
  }
}

export function wanixtermscreenwrite(chunk: string) {
  if (!chunk.length) {
    return
  }
  pendingout += chunk
  if (screen.width <= 0 || screen.height <= 0) {
    return
  }
  schedulependingout()
}

/** Flush coalesced term-out (tests and teardown). */
export function flushwanixtermscreenpending() {
  if (
    outflushhandle !== undefined &&
    typeof cancelAnimationFrame === 'function'
  ) {
    cancelAnimationFrame(outflushhandle)
  }
  flushpendingout()
}

export function wanixtermscreenechochar(ch: string) {
  if (!ch.length) {
    return
  }
  writechunk(ch)
}

export function wanixtermscreenecholine(line: string) {
  writechunk(`${line}\r\n`)
}

export function wanixtermscreenwritepong() {
  writechunk('pong\r\n')
}

export function wanixtermscreenshowclihint() {
  if (screen.height <= 0 || screen.width <= 0) {
    return
  }
  const hint = 'ctrl+\\  cli (# commands)'
  const y = screen.height - 1
  for (let i = 0; i < hint.length && i < screen.width; ++i) {
    putcell(i, y, hint.charCodeAt(i), COLOR.DKGRAY, MIRROR_EMPTY_BG)
  }
  bump()
}

export function wanixtermscreenshowdetachhint() {
  if (screen.height <= 0 || screen.width <= 0) {
    return
  }
  const hint = `${metakey}+\\ detach`
  const y = screen.height - 1
  for (let i = 0; i < hint.length && i < screen.width; ++i) {
    putcell(i, y, hint.charCodeAt(i), COLOR.DKGRAY, MIRROR_EMPTY_BG)
  }
  bump()
}

/** Test hook — reset module state. */
export function resetwanixtermscreenfortest() {
  if (
    outflushhandle !== undefined &&
    typeof cancelAnimationFrame === 'function'
  ) {
    cancelAnimationFrame(outflushhandle)
  }
  pendingout = ''
  outflushpending = false
  outflushhandle = undefined
  screen = createtermscreen(0, 0)
  listeners.clear()
}
