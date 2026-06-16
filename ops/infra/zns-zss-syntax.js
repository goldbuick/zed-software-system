/**
 * ZSS source → zsstext tape colors for ZNS text-kind scrolls.
 * Mirrors editor defaults in zss/screens/tape/colors.ts (stat / label / comment / # / play).
 */

const TAPE_COLOR = {
  DKGREEN: 'dkgreen',
  DKPURPLE: 'dkpurple',
  DKRED: 'dkred',
  DKYELLOW: 'dkyellow',
  LTGRAY: 'ltgray',
  GREEN: 'green',
  CYAN: 'cyan',
  YELLOW: 'yellow',
  WHITE: 'white',
  PURPLE: 'purple',
  DKCYAN: 'dkcyan',
}

const PLAY_COMMAND_RE =
  /^(play|bgplay|bgplayon64n|bgplayon32n|bgplayon16n|bgplayon8n|bgplayon4n|bgplayon2n|bgplayon1n)(?=$|\s)/i

const MUSIC_COLOR = new Map([
  ['a', TAPE_COLOR.GREEN],
  ['b', TAPE_COLOR.GREEN],
  ['c', TAPE_COLOR.GREEN],
  ['d', TAPE_COLOR.GREEN],
  ['e', TAPE_COLOR.GREEN],
  ['f', TAPE_COLOR.GREEN],
  ['g', TAPE_COLOR.GREEN],
  ['x', TAPE_COLOR.DKGREEN],
  ['#', TAPE_COLOR.DKYELLOW],
  ['!', TAPE_COLOR.DKYELLOW],
  ['y', TAPE_COLOR.DKCYAN],
  ['t', TAPE_COLOR.DKCYAN],
  ['s', TAPE_COLOR.DKCYAN],
  ['i', TAPE_COLOR.DKCYAN],
  ['q', TAPE_COLOR.DKCYAN],
  ['h', TAPE_COLOR.DKCYAN],
  ['w', TAPE_COLOR.DKCYAN],
  ['3', TAPE_COLOR.CYAN],
  ['.', TAPE_COLOR.CYAN],
  ['+', TAPE_COLOR.YELLOW],
  ['-', TAPE_COLOR.YELLOW],
  ['0', TAPE_COLOR.PURPLE],
  ['1', TAPE_COLOR.PURPLE],
  ['2', TAPE_COLOR.PURPLE],
  ['p', TAPE_COLOR.PURPLE],
  ['4', TAPE_COLOR.PURPLE],
  ['5', TAPE_COLOR.PURPLE],
  ['6', TAPE_COLOR.PURPLE],
  ['7', TAPE_COLOR.PURPLE],
  ['8', TAPE_COLOR.PURPLE],
  ['9', TAPE_COLOR.PURPLE],
  [';', TAPE_COLOR.YELLOW],
])

function tapecolor(name) {
  return `$${name}`
}

function appendcolored(out, name, text) {
  if (!text) {
    return out
  }
  return `${out}${tapecolor(name)}${text}`
}

function zssmusiccolor(ch) {
  return MUSIC_COLOR.get(ch) ?? TAPE_COLOR.GREEN
}

/** Port of zssplaywordcolor — per-char play/bgplay argument coloring. */
function highlightplayargs(text) {
  let out = ''
  let mode = 'setup'
  for (let i = 0; i < text.length; ++i) {
    const ch = text[i]
    if (ch === ';') {
      mode = 'setup'
    } else if (ch === ' ') {
      // keep mode
    } else if (ch === '#') {
      if (mode === 'setup') {
        mode = 'message'
      }
    } else if (mode === 'setup') {
      mode = 'notes'
    }
    let name = TAPE_COLOR.LTGRAY
    if (mode === 'notes') {
      name = zssmusiccolor(ch)
    } else if (mode === 'message') {
      name = TAPE_COLOR.CYAN
    }
    out = appendcolored(out, name, ch)
  }
  return out
}

function highlightcommandline(line) {
  const match = line.match(/^(\s*)(#)([\s\S]*)$/)
  if (!match) {
    return line
  }
  const [, indent, hash, rest] = match
  let out = appendcolored('', TAPE_COLOR.WHITE, indent)
  out = appendcolored(out, TAPE_COLOR.YELLOW, hash)
  const body = rest.replace(/^\s+/, '')
  const leadspace = rest.slice(0, rest.length - body.length)
  if (leadspace) {
    out = appendcolored(out, TAPE_COLOR.WHITE, leadspace)
  }
  const play = PLAY_COMMAND_RE.exec(body)
  if (play) {
    const cmd = play[1]
    out = appendcolored(out, TAPE_COLOR.DKGREEN, cmd)
    out += highlightplayargs(body.slice(cmd.length))
    return out
  }
  return appendcolored(out, TAPE_COLOR.GREEN, body)
}

/** One physical source line → tape color codes (no HTML). */
export function highlightzssline(line) {
  const source = String(line ?? '')
  if (source.length === 0) {
    return ''
  }
  const trimmed = source.trimStart()
  const indent = source.slice(0, source.length - trimmed.length)
  if (trimmed.startsWith('@')) {
    let out = appendcolored('', TAPE_COLOR.WHITE, indent)
    return appendcolored(out, TAPE_COLOR.DKPURPLE, trimmed)
  }
  if (trimmed.startsWith(':')) {
    let out = appendcolored('', TAPE_COLOR.WHITE, indent)
    return appendcolored(out, TAPE_COLOR.DKRED, trimmed)
  }
  if (trimmed.startsWith("'")) {
    let out = appendcolored('', TAPE_COLOR.WHITE, indent)
    return appendcolored(out, TAPE_COLOR.CYAN, trimmed)
  }
  if (trimmed.startsWith('#')) {
    return highlightcommandline(source)
  }
  return appendcolored('', TAPE_COLOR.GREEN, source)
}

/** Full ZSS codepage / script body → tape lines joined with newlines. */
export function highlightzsssource(source) {
  return String(source ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => highlightzssline(line))
    .join('\n')
}
