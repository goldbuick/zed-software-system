/**
 * Converts ZSS format strings ($COLOR, $ON*, $BL*, $0-255) to ANSI terminal output
 * with CP437 Unicode characters. Supports foreground, background, and blinking
 * foreground colors. Used by the CLI Ink REPL.
 */
import { cp437ToChar } from './cp437.js'

// Name aliases → canonical color (matches zss/words/colorconsts)
const COLOR_ALIASES: Record<string, string> = {
  black: 'BLACK',
  dkblue: 'DKBLUE',
  dkgreen: 'DKGREEN',
  dkcyan: 'DKCYAN',
  dkred: 'DKRED',
  dkpurple: 'DKPURPLE',
  dkyellow: 'DKYELLOW',
  ltgray: 'LTGRAY',
  dkgray: 'DKGRAY',
  blue: 'BLUE',
  green: 'GREEN',
  cyan: 'CYAN',
  red: 'RED',
  purple: 'PURPLE',
  yellow: 'YELLOW',
  white: 'WHITE',
  brown: 'DKYELLOW',
  dkwhite: 'LTGRAY',
  ltgrey: 'LTGRAY',
  gray: 'LTGRAY',
  grey: 'LTGRAY',
  dkgrey: 'DKGRAY',
  ltblack: 'DKGRAY',
  onblack: 'ONBLACK',
  ondkblue: 'ONDKBLUE',
  ondkgreen: 'ONDKGREEN',
  ondkcyan: 'ONDKCYAN',
  ondkred: 'ONDKRED',
  ondkpurple: 'ONDKPURPLE',
  ondkyellow: 'ONDKYELLOW',
  onltgray: 'ONLTGRAY',
  ondkgray: 'ONDKGRAY',
  onblue: 'ONBLUE',
  ongreen: 'ONGREEN',
  oncyan: 'ONCYAN',
  onred: 'ONRED',
  onpurple: 'ONPURPLE',
  onyellow: 'ONYELLOW',
  onwhite: 'ONWHITE',
  onbrown: 'ONDKYELLOW',
  ondkwhite: 'ONLTGRAY',
  onltgrey: 'ONLTGRAY',
  ongray: 'ONLTGRAY',
  ongrey: 'ONLTGRAY',
  ondkgrey: 'ONDKGRAY',
  onltblack: 'ONDKGRAY',
  onclear: 'ONCLEAR',
  blblack: 'BLBLACK',
  bldkblue: 'BLDKBLUE',
  bldkgreen: 'BLDKGREEN',
  bldkcyan: 'BLDKCYAN',
  bldkred: 'BLDKRED',
  bldkpurple: 'BLDKPURPLE',
  bldkyellow: 'BLDKYELLOW',
  blltgray: 'BLLTGRAY',
  bldkgray: 'BLDKGRAY',
  blblue: 'BLBLUE',
  blgreen: 'BLGREEN',
  blcyan: 'BLCYAN',
  blred: 'BLRED',
  blpurple: 'BLPURPLE',
  blyellow: 'BLYELLOW',
  blwhite: 'BLWHITE',
  blbrown: 'BLDKYELLOW',
  bldkwhite: 'BLLTGRAY',
  blltgrey: 'BLLTGRAY',
  blgray: 'BLLTGRAY',
  blgrey: 'BLLTGRAY',
  bldkgrey: 'BLDKGRAY',
  blltblack: 'BLDKGRAY',
}

// Canonical color → ANSI SGR (foreground 30–37, 90–97; blink fg uses 5;XX)
const FG_ANSI: Record<string, string> = {
  BLACK: '\x1b[30m',
  DKBLUE: '\x1b[34m',
  DKGREEN: '\x1b[32m',
  DKCYAN: '\x1b[36m',
  DKRED: '\x1b[31m',
  DKPURPLE: '\x1b[35m',
  DKYELLOW: '\x1b[33m',
  LTGRAY: '\x1b[37m',
  DKGRAY: '\x1b[90m',
  BLUE: '\x1b[94m',
  GREEN: '\x1b[92m',
  CYAN: '\x1b[96m',
  RED: '\x1b[91m',
  PURPLE: '\x1b[95m',
  YELLOW: '\x1b[93m',
  WHITE: '\x1b[97m',
  BLBLACK: '\x1b[5;30m',
  BLDKBLUE: '\x1b[5;34m',
  BLDKGREEN: '\x1b[5;32m',
  BLDKCYAN: '\x1b[5;36m',
  BLDKRED: '\x1b[5;31m',
  BLDKPURPLE: '\x1b[5;35m',
  BLDKYELLOW: '\x1b[5;33m',
  BLLTGRAY: '\x1b[5;37m',
  BLDKGRAY: '\x1b[5;90m',
  BLBLUE: '\x1b[5;94m',
  BLGREEN: '\x1b[5;92m',
  BLCYAN: '\x1b[5;96m',
  BLRED: '\x1b[5;91m',
  BLPURPLE: '\x1b[5;95m',
  BLYELLOW: '\x1b[5;93m',
  BLWHITE: '\x1b[5;97m',
}

const BG_ANSI: Record<string, string> = {
  ONBLACK: '\x1b[40m',
  ONDKBLUE: '\x1b[44m',
  ONDKGREEN: '\x1b[42m',
  ONDKCYAN: '\x1b[46m',
  ONDKRED: '\x1b[41m',
  ONDKPURPLE: '\x1b[45m',
  ONDKYELLOW: '\x1b[43m',
  ONLTGRAY: '\x1b[47m',
  ONDKGRAY: '\x1b[100m',
  ONBLUE: '\x1b[104m',
  ONGREEN: '\x1b[102m',
  ONCYAN: '\x1b[106m',
  ONRED: '\x1b[101m',
  ONPURPLE: '\x1b[105m',
  ONYELLOW: '\x1b[103m',
  ONWHITE: '\x1b[107m',
  ONCLEAR: '\x1b[0m',
}

const RESET = '\x1b[0m'

function resolveColor(name: string): string | undefined {
  return COLOR_ALIASES[name.toLowerCase()]
}

function applyColor(name: string, out: string[]): void {
  const canonical = resolveColor(name)
  if (!canonical) {
    return
  }
  const fg = FG_ANSI[canonical]
  const bg = BG_ANSI[canonical]
  if (canonical === 'ONCLEAR') {
    out.push(RESET)
  } else if (bg) {
    out.push(bg)
  } else if (fg) {
    out.push(fg)
  }
}

/**
 * Convert a ZSS format string to ANSI + CP437 for terminal display.
 * Handles: $COLOR (fg), $ON* (bg), $BL* (blink fg), $0-255 (CP437), $$
 */
export function formatlogforterminal(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return ''
  }
  const out: string[] = []
  let i = 0
  while (i < raw.length) {
    if (raw[i] !== '$') {
      out.push(raw[i])
      i++
      continue
    }
    if (raw[i + 1] === '$') {
      out.push('$')
      i += 2
      continue
    }
    const numMatch = /^(-?\d+)/.exec(raw.slice(i + 1))
    if (numMatch) {
      const code = parseInt(numMatch[1], 10)
      if (code >= 0 && code <= 255) {
        out.push(cp437ToChar(code))
      }
      i += 1 + numMatch[1].length
      continue
    }
    const wordMatch = /^([A-Za-z][A-Za-z0-9]*)/.exec(raw.slice(i + 1))
    if (wordMatch) {
      const word = wordMatch[1]
      applyColor(word, out)
      i += 1 + word.length
      continue
    }
    out.push('$')
    i++
  }
  out.push(RESET)
  return out.join('')
}
