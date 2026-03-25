import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import {
  scrolllinkescapefrag,
  scrolllinkunescapefrag,
} from 'zss/mapping/string'

export { scrolllinkescapefrag, scrolllinkunescapefrag }

/** Whitespace-separated tokens; `"..."` keeps inner spaces. Inside quotes, `\"` and `\\` are escapes. */
export function scrolllinksplittokens(s: string): string[] {
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

/** `!@mychip cmd args;label` uses `mychip` for that row; default `chip` from `scrollwritelines` otherwise. */
const SCROLL_LINE_ATCHIP_RE = /^!@([a-zA-Z][a-zA-Z0-9_]*)\s+(.+)$/

function pushscrollhyperlink(
  player: string,
  chip: string,
  leftwithbang: string,
  label: string,
) {
  const parts = scrolllinksplittokens(leftwithbang.trimStart().slice(1))
  gadgethyperlink(player, chip, label, parts)
}

/** One Zed scroll line `!cmd args;label` (optional `!@chip …`) → `gadgethyperlink`. No-op if not a bang hyperlink line. */
export function gadgethyperlinkfromzedline(
  player: string,
  line: string,
  chip = 'refscroll',
): void {
  const trimmed = line.trim()
  if (!trimmed.startsWith('!') || !trimmed.includes(';')) {
    return
  }
  const semi = trimmed.indexOf(';')
  let left = scrolllinkunescapefrag(trimmed.slice(0, semi).trimEnd())
  const label = scrolllinkunescapefrag(trimmed.slice(semi + 1).trim())
  let linechip = chip
  const atchip = SCROLL_LINE_ATCHIP_RE.exec(left)
  if (atchip) {
    linechip = atchip[1]
    left = `!${atchip[2].trimStart()}`
  }
  pushscrollhyperlink(player, linechip, left, label)
}

/** Whitespace-only physical lines become blank scroll rows (`gadgettext` empty string). */
export function scrollwritelines(
  player: string,
  scrollname: string,
  content: string,
  chip = 'refscroll',
): void {
  const shared = gadgetstate(player)
  shared.scrollname = scrollname
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (line.startsWith('!') && line.includes(';')) {
      gadgethyperlinkfromzedline(player, line, chip)
    } else {
      gadgettext(player, line)
    }
  }
  shared.scroll = gadgetcheckqueue(player)
}
