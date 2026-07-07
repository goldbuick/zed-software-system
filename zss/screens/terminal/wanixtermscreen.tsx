import { useEffect, useRef, useState } from 'react'
import { callwanixtermwrite } from 'zss/feature/wanix/wanixbridge'
import {
  detachwanixterm,
  readattachedsession,
  subscribewanixattach,
} from 'zss/feature/wanix/wanixattachstate'
import {
  readwanixtermbuffer,
  readwanixtermnotifyversion,
  subscribewanixtermbuffer,
} from 'zss/feature/wanix/wanixtermbuffer'
import type { WanixTermTileBuffer } from 'zss/feature/wanix/wanixtermbuffer'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { NAME } from 'zss/words/types'
import { textformatreadedges } from 'zss/words/textformat'

function usewanixattachsessionkey() {
  const [sessionkey, setsessionkey] = useState(readattachedsession)
  useEffect(() => subscribewanixattach(() => setsessionkey(readattachedsession())), [])
  return sessionkey
}

function usewanixtermbufferversion() {
  const [version, setversion] = useState(readwanixtermnotifyversion)
  useEffect(
    () => subscribewanixtermbuffer(() => setversion(readwanixtermnotifyversion())),
    [],
  )
  return version
}

function readlinecell(
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

function encodekeyboard(event: KeyboardEvent): string | null {
  const rawkey = event.key
  const key = rawkey.toLowerCase()
  if (event.ctrlKey && rawkey === '\\') {
    return null
  }
  if (key === 'pageup' || key === 'pagedown') {
    return null
  }
  if (event.ctrlKey && rawkey.length === 1) {
    const code = rawkey.toLowerCase().charCodeAt(0)
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(code - 96)
    }
    if (code >= 91 && code <= 95) {
      return String.fromCharCode(code - 64)
    }
  }
  switch (key) {
    case 'enter':
      return '\r'
    case 'backspace':
      return '\x7f'
    case 'delete':
      return '\x7f'
    case 'tab':
      return '\t'
    case 'arrowup':
      return '\x1b[A'
    case 'arrowdown':
      return '\x1b[B'
    case 'arrowright':
      return '\x1b[C'
    case 'arrowleft':
      return '\x1b[D'
    case 'escape':
      return '\x1b'
  }
  if (rawkey.length === 1 && !event.ctrlKey && !event.metaKey) {
    return rawkey
  }
  return null
}

export function WanixTermScreen() {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const sessionkey = usewanixattachsessionkey()
  usewanixtermbufferversion()
  const lastframe = useRef<WanixTermTileBuffer | null>(null)
  const [scrolloffset, setscrolloffset] = useState(0)

  const buffer =
    sessionkey != null ? readwanixtermbuffer(sessionkey) : null
  if (buffer) {
    lastframe.current = buffer
  }
  const frame = buffer ?? lastframe.current

  useEffect(() => {
    setscrolloffset(0)
  }, [sessionkey])

  if (!frame) {
    return null
  }

  const scrollbackrows = frame.scrollbackrows ?? 0
  const cols = Math.min(frame.cols, edge.width)
  const visibleheight = edge.height
  const totallines = scrollbackrows + frame.rows
  const maxscrolloffset = Math.max(0, totallines - visibleheight)
  const clampedoffset = Math.min(scrolloffset, maxscrolloffset)
  const startline = Math.max(0, totallines - visibleheight - clampedoffset)
  const atliveline = clampedoffset === 0

  for (let screeny = 0; screeny < visibleheight; screeny++) {
    const lineindex = startline + screeny
    for (let x = 0; x < cols; x++) {
      const drawx = edge.left + x
      const drawy = edge.top + screeny
      let { char, color, bg } = readlinecell(frame, lineindex, x)
      if (
        atliveline &&
        frame.cursorvisible &&
        lineindex === scrollbackrows + frame.cursory &&
        x === frame.cursorx
      ) {
        const swapfg = color >= 33 ? color - 33 : color
        const swapbg = bg
        color = swapbg
        bg = swapfg
      }
      writetile(context, context.width, context.height, drawx, drawy, {
        char,
        color,
        bg,
      })
    }
  }
  context.changed()

  return (
    <UserInput
      keydown={(event) => {
        const key = NAME(event.key)
        if (event.ctrlKey && key === '\\') {
          event.preventDefault()
          detachwanixterm()
          return
        }
        if (key === 'pageup') {
          event.preventDefault()
          setscrolloffset((prev) =>
            Math.min(maxscrolloffset, prev + (event.ctrlKey ? 10 : 1)),
          )
          return
        }
        if (key === 'pagedown') {
          event.preventDefault()
          setscrolloffset((prev) => Math.max(0, prev - (event.ctrlKey ? 10 : 1)))
          return
        }
        if (!atliveline) {
          return
        }
        const payload = encodekeyboard(event)
        const targetkey = sessionkey ?? readattachedsession()
        if (payload != null && targetkey) {
          event.preventDefault()
          void callwanixtermwrite(payload, targetkey)
        }
      }}
    />
  )
}
