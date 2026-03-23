import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'

/** Zed `NumberLiteral` for ASCII `;` (59); use inside `!left;right` when payload or label contains a semicolon. */
const SCROLL_SEMI_ZED = '$59'

/** Escape `;` for storage in the command or label segment of a bang scroll line. */
export function scrolllinkescapefrag(s: string): string {
  return s.replaceAll(';', SCROLL_SEMI_ZED)
}

/** Undo `scrolllinkescapefrag` after splitting on the first raw `;`. `$590` etc. stay unchanged. */
export function scrolllinkunescapefrag(s: string): string {
  return s.replace(/\$59(?!\d)/g, ';')
}

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

function pushscrollhyperlink(
  player: string,
  chip: string,
  leftwithbang: string,
  label: string,
) {
  const parts = scrolllinksplittokens(leftwithbang.trimStart().slice(1))
  gadgethyperlink(player, chip, label, parts)
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
      const semi = line.indexOf(';')
      const left = scrolllinkunescapefrag(line.slice(0, semi).trimEnd())
      const label = scrolllinkunescapefrag(line.slice(semi + 1).trim())
      pushscrollhyperlink(player, chip, left, label)
    } else {
      gadgettext(player, line)
    }
  }
  shared.scroll = gadgetcheckqueue(player)
}
