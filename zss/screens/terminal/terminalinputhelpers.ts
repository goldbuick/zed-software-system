import { useTerminal } from 'zss/gadget/data/state'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'

export type TerminalSelection = {
  ii1: number
  ii2: number
  iic: number
  hasselection: boolean
  inputstateselected: string
}

export function computeTerminalSelection(
  xcursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  inputstate: string,
): TerminalSelection {
  let ii1 = xcursor
  let ii2 = xcursor
  let hasselection = false

  if (ispresent(xselect) && ispresent(yselect)) {
    hasselection = true
    ii1 = Math.min(xcursor, xselect)
    ii2 = Math.max(xcursor, xselect)
    if (xcursor !== xselect) {
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate
  return { ii1, ii2, iic, hasselection, inputstateselected }
}

export function trackselection(active: boolean) {
  const { xcursor, xselect } = useTerminal.getState()
  if (active) {
    if (!ispresent(xselect)) {
      useTerminal.setState({ xselect: xcursor, yselect: 0 })
    }
  } else {
    useTerminal.setState({ xselect: undefined, yselect: undefined })
  }
}

export function inputstateswitch(switchto: number) {
  const { buffer } = useTerminal.getState()
  const ir = buffer.length - 1
  const index = Math.max(0, Math.min(switchto, ir))
  useTerminal.setState({
    bufferindex: index,
    scroll: 0,
    xcursor: buffer[index].length,
    ycursor: 0,
    xselect: undefined,
    yselect: undefined,
  })
}

export function drawTerminalCursor(
  blink: boolean,
  xcursor: number,
  tapeycursor: number,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!blink) {
    return
  }
  const edge = textformatreadedges(context)
  const x = edge.left + xcursor
  const y = edge.top + tapeycursor
  if (x >= edge.left && x <= edge.right && y >= edge.top && y <= edge.bottom) {
    const atchar = x + y * context.width
    applystrtoindex(atchar, String.fromCharCode(221), context)
    applycolortoindexes(atchar, atchar, COLOR.WHITE, context.reset.bg, context)
  }
}

export function drawTerminalSelection(
  xcursor: number,
  ycursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!ispresent(xselect) || !ispresent(yselect) || xcursor === xselect) {
    return
  }
  const edge = textformatreadedges(context)
  const x1 = Math.min(xcursor, xselect)
  const y1 = Math.min(ycursor, yselect)
  const x2 = Math.max(xcursor, xselect) - 1
  const y2 = Math.max(ycursor, yselect)
  for (let iy = y1; iy <= y2; ++iy) {
    const p1 = x1 + (edge.bottom - iy) * edge.width
    const p2 = x2 + (edge.bottom - iy) * edge.width
    applycolortoindexes(p1, p2, 15, 8, context)
  }
}

const CMD_COLOR = COLOR.DKGREEN
const HASH_COLOR = COLOR.YELLOW
const STAT_COLOR = COLOR.DKPURPLE
const LABEL_COLOR = COLOR.DKRED
const COMMENT_COLOR = COLOR.CYAN
const NUMBER_COLOR = COLOR.WHITE
const STRING_COLOR = COLOR.GREEN

const TEXTBODY_COMMANDS = new Set(['toast', 'ticker'])

const MUSICBODY_COMMANDS = new Set([
  'play',
  'bgplay',
  'bgplayon64n',
  'bgplayon32n',
  'bgplayon16n',
  'bgplayon8n',
  'bgplayon4n',
  'bgplayon2n',
  'bgplayon1n',
])

const MUSIC_NOTE_CHARS = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
const MUSIC_REST_CHARS = new Set(['x'])
const MUSIC_PITCH_CHARS = new Set(['#', '!'])
const MUSIC_TIME_CHARS = new Set(['y', 't', 's', 'i', 'q', 'h', 'w'])
const MUSIC_TIMEMOD_CHARS = new Set(['3', '.'])
const MUSIC_OCTAVE_CHARS = new Set(['+', '-'])
const MUSIC_DRUM_CHARS = new Set([
  '0',
  '1',
  '2',
  'p',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
])

enum MUSIC_MODE {
  NEEDS_SETUP,
  NOTES,
  MESSAGE,
}

function musiccharcolor(ch: string): COLOR {
  if (MUSIC_NOTE_CHARS.has(ch)) {
    return COLOR.GREEN
  }
  if (MUSIC_REST_CHARS.has(ch)) {
    return COLOR.DKGREEN
  }
  if (MUSIC_PITCH_CHARS.has(ch)) {
    return COLOR.DKYELLOW
  }
  if (MUSIC_TIME_CHARS.has(ch)) {
    return COLOR.DKCYAN
  }
  if (MUSIC_TIMEMOD_CHARS.has(ch)) {
    return COLOR.CYAN
  }
  if (MUSIC_OCTAVE_CHARS.has(ch)) {
    return COLOR.YELLOW
  }
  if (MUSIC_DRUM_CHARS.has(ch)) {
    return COLOR.PURPLE
  }
  return COLOR.GREEN
}

function highlightMusicBody(
  inputline: string,
  from: number,
  base: number,
  context: WRITE_TEXT_CONTEXT,
) {
  let mode = MUSIC_MODE.NEEDS_SETUP
  for (let j = from; j < inputline.length; j++) {
    const ch = inputline[j]
    switch (ch) {
      case ';':
        mode = MUSIC_MODE.NEEDS_SETUP
        break
      case ' ':
        break
      default:
        if (mode === MUSIC_MODE.NEEDS_SETUP) {
          mode = MUSIC_MODE.NOTES
        }
        break
      case '#':
        if (mode === MUSIC_MODE.NEEDS_SETUP) {
          mode = MUSIC_MODE.MESSAGE
        }
        break
    }
    let color: COLOR
    switch (mode) {
      case MUSIC_MODE.NEEDS_SETUP:
        color = COLOR.LTGRAY
        break
      case MUSIC_MODE.NOTES:
        color = musiccharcolor(ch)
        break
      case MUSIC_MODE.MESSAGE:
        color = COLOR.CYAN
        break
    }
    applycolortoindexes(base + j, base + j, color, context.reset.bg, context)
  }
}

export function highlightTerminalInput(
  inputline: string,
  inputy: number,
  wordcolors: Map<string, number>,
  context: WRITE_TEXT_CONTEXT,
) {
  if (inputline.length === 0) {
    return
  }
  const edge = textformatreadedges(context)
  const base = edge.left + inputy * context.width

  const trimmed = inputline.trimStart()
  const leadingspaces = inputline.length - trimmed.length

  if (trimmed.startsWith(`'`)) {
    applycolortoindexes(
      base + leadingspaces,
      base + inputline.length - 1,
      COMMENT_COLOR,
      context.reset.bg,
      context,
    )
    return
  }

  if (trimmed.startsWith(':')) {
    applycolortoindexes(
      base + leadingspaces,
      base + inputline.length - 1,
      LABEL_COLOR,
      context.reset.bg,
      context,
    )
    return
  }

  if (trimmed.startsWith('@')) {
    applycolortoindexes(
      base + leadingspaces,
      base + inputline.length - 1,
      STAT_COLOR,
      context.reset.bg,
      context,
    )
    return
  }

  let i = leadingspaces
  let afterhash = false

  while (i < inputline.length) {
    const ch = inputline[i]

    if (ch === '#') {
      applycolortoindexes(
        base + i,
        base + i,
        HASH_COLOR,
        context.reset.bg,
        context,
      )
      afterhash = true
      i++
      continue
    }

    if (ch === `'`) {
      applycolortoindexes(
        base + i,
        base + inputline.length - 1,
        COMMENT_COLOR,
        context.reset.bg,
        context,
      )
      break
    }

    if (ch === '"') {
      const start = i
      i++
      while (i < inputline.length && inputline[i] !== '"') {
        i++
      }
      if (i < inputline.length) {
        i++
      }
      applycolortoindexes(
        base + start,
        base + i - 1,
        STRING_COLOR,
        context.reset.bg,
        context,
      )
      continue
    }

    if (/\d/.test(ch)) {
      const start = i
      while (i < inputline.length && /[\d.]/.test(inputline[i])) {
        i++
      }
      if (start > 0 && !/\w/.test(inputline[start - 1])) {
        applycolortoindexes(
          base + start,
          base + i - 1,
          NUMBER_COLOR,
          context.reset.bg,
          context,
        )
      }
      continue
    }

    if (/\w/.test(ch)) {
      const start = i
      while (i < inputline.length && /\w/.test(inputline[i])) {
        i++
      }
      const word = inputline.substring(start, i)
      const lower = NAME(word)

      if (afterhash) {
        applycolortoindexes(
          base + start,
          base + i - 1,
          CMD_COLOR,
          context.reset.bg,
          context,
        )

        if (TEXTBODY_COMMANDS.has(lower) && i < inputline.length) {
          applycolortoindexes(
            base + i,
            base + inputline.length - 1,
            STRING_COLOR,
            context.reset.bg,
            context,
          )
          return
        }

        if (MUSICBODY_COMMANDS.has(lower) && i < inputline.length) {
          highlightMusicBody(inputline, i, base, context)
          return
        }

        afterhash = false
        continue
      }

      const color = wordcolors.get(lower)
      if (color !== undefined) {
        applycolortoindexes(
          base + start,
          base + i - 1,
          color,
          context.reset.bg,
          context,
        )
      }
      continue
    }

    i++
  }
}
