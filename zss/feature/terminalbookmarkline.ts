import { scrolllinkunescapefrag } from 'zss/mapping/string'

/** Label segment for `!runit` fallback when bookmarking non-bang lines. */
export const BOOKMARK_TERMINAL_RUNIT_LABEL = 'Bookmark'

/**
 * Double-quote a string for use after `!runit ` so tokenization keeps one argument
 * (same escape rules as scroll link quoted tokens: `\` and `"`).
 */
export function bookmarkquotedrunitpayload(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function bookmarkruniteunquotedpayload(left: string): string | undefined {
  const head = '!runit '
  if (!left.startsWith(head)) {
    return undefined
  }
  const rest = left.slice(head.length).trim()
  if (!rest.startsWith('"')) {
    return undefined
  }
  let i = 1
  let buf = ''
  while (i < rest.length) {
    const c = rest.charAt(i)
    if (c === '\\' && i + 1 < rest.length) {
      const n = rest.charAt(i + 1)
      if (n === '\\' || n === '"') {
        buf += n
        i += 2
        continue
      }
    }
    if (c === '"') {
      return buf
    }
    buf += c
    i += 1
  }
  return undefined
}

/** One-line label for the pin row (pin rows are plain `$…` lines, not `!` links). */
export function terminalbookmarkpindisplaylabel(text: string): string {
  const t = text.trim()
  if (t.startsWith('!') && t.includes(';')) {
    const semi = t.indexOf(';')
    const left = t.slice(0, semi).trimEnd()
    const rightraw = t.slice(semi + 1).trim()
    let right = scrolllinkunescapefrag(rightraw)
    if (right === BOOKMARK_TERMINAL_RUNIT_LABEL && left.startsWith('!runit ')) {
      const unquoted = bookmarkruniteunquotedpayload(left)
      if (unquoted !== undefined) {
        right = unquoted
      }
    }
    const oneline = right.replace(/[\r\n]/g, ' ').trim()
    return oneline.length > 52 ? `${oneline.slice(0, 49)}...` : oneline || '*'
  }
  const oneline = text.replace(/[\r\n;]/g, ' ').trim()
  return oneline.length > 52 ? `${oneline.slice(0, 49)}...` : oneline || '*'
}
