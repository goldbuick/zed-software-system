import { scrolllinkunescapefrag } from 'zss/mapping/string'
import { HyperLinkText, tokenize } from 'zss/words/textformat'

export type ParsedZedLink = {
  chip: string
  /** Tape shared-widget modem key (`chip:target`), or '' */
  modemprefix: string
  label: string
  /** `[type, ...args]` command tokens */
  words: string[]
}

/** `!@mychip cmd args;label` uses `mychip` for that row. */
const ATCHIP_RE = /^@([a-zA-Z][a-zA-Z0-9_]*)\s+(.+)$/

/**
 * Whitespace-separated tokens for bang-line command parts; supports `"quoted"`
 * strings with `\"` / `\\` escapes (same rules as former scrolllinksplittokens).
 */
export function zedlinksplittokens(s: string): string[] {
  const out: string[] = []
  let i = 0
  const n = s.length
  while (i < n) {
    while (i < n && /\s/.test(s.charAt(i))) {
      i += 1
    }
    if (i >= n) {
      break
    }
    if (s.charAt(i) === '"') {
      i += 1
      let buf = ''
      while (i < n) {
        const c = s.charAt(i)
        if (c === '\\' && i + 1 < n) {
          const next = s.charAt(i + 1)
          if (next === '"' || next === '\\') {
            buf += next
            i += 2
            continue
          }
        }
        if (c === '"') {
          i += 1
          break
        }
        buf += c
        i += 1
      }
      out.push(buf)
      continue
    }
    const start = i
    while (i < n && !/\s/.test(s.charAt(i))) {
      i += 1
    }
    out.push(s.slice(start, i))
  }
  return out
}

function parselegacynosemi(body: string, defaultchip: string): ParsedZedLink {
  let label = 'PRESS ME'
  const words: string[] = []
  const result = tokenize(body, true)
  if (result.tokens) {
    for (let i = 0; i < result.tokens.length; ++i) {
      const tok = result.tokens[i]
      if (tok.tokenType === HyperLinkText) {
        label = tok.image.slice(1)
      } else {
        words.push(tok.image)
      }
    }
  }
  return { chip: defaultchip, modemprefix: '', label, words }
}

/**
 * Parse a Zed bang hyperlink line for scroll or terminal tape.
 *
 * Format: `![@chip ]command args;label` with `$59` for semicolons in fragments.
 * Terminal logs may use a leading double `!!` (empty modem prefix) or
 * `!chip:target!command;label` for shared-widget modem keys.
 */
export function parsezedlinkline(
  line: string,
  defaultchip = 'refscroll',
): ParsedZedLink | undefined {
  const trimmed = line.trim()
  if (!trimmed.startsWith('!')) {
    return undefined
  }

  // Strip one leading `!`. A second leading `!` is the empty terminal modem prefix
  // from terminallog (`!!cmd;label`).
  let rest = trimmed.slice(1)
  if (rest.startsWith('!')) {
    rest = rest.slice(1)
  }

  const semi = rest.indexOf(';')
  if (semi < 0) {
    return parselegacynosemi(rest, defaultchip)
  }

  let head = scrolllinkunescapefrag(rest.slice(0, semi).trimEnd())
  const label = scrolllinkunescapefrag(rest.slice(semi + 1).trim())

  let chip = defaultchip
  let modemprefix = ''
  let command = head

  const atchip = ATCHIP_RE.exec(head)
  if (atchip) {
    chip = atchip[1]
    command = atchip[2].trimStart()
  } else {
    const secondbang = head.indexOf('!')
    if (secondbang >= 0) {
      modemprefix = head.slice(0, secondbang)
      command = head.slice(secondbang + 1)
      const colon = modemprefix.indexOf(':')
      if (colon > 0 && !modemprefix.includes(':', colon + 1)) {
        const maybechip = modemprefix.slice(0, colon).trim()
        if (maybechip.length) {
          chip = maybechip
        }
      }
    }
  }

  return {
    chip,
    modemprefix,
    label,
    words: zedlinksplittokens(command),
  }
}
