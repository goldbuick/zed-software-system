import { NAME } from 'zss/words/types'

/** Undo `$59` → `;` for ROM option/link fragments (matches applyscrolllines). */
function scrolllinkunescapefrag(s: string): string {
  return s.replace(/\$59(?!\d)/g, ';')
}

/** Escape `]` and `\` for safe use inside `[...](...)` link text. */
function escapemdlinktext(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll(']', '\\]')
}

/** Wrap href in `<>` when spaces or risky chars would break CommonMark. */
function mdhref(href: string): string {
  const h = href.trim()
  if (!h.length) {
    return '<>'
  }
  if (/[\s<>]/.test(h) || h.includes('(')) {
    return `<${h.replaceAll('<', '\\<').replaceAll('>', '\\>')}>`
  }
  return escapemdlinktext(h).replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function mdlink(label: string, href: string): string {
  return `[${escapemdlinktext(label)}](${mdhref(href)})`
}

/**
 * One-time / tooling: convert legacy refscroll ROM lines (`romparse`: split each
 * physical line on `;`) into markdown for `parsemarkdownforscroll`.
 */
export function refscrollromtomarkdown(source: string): string {
  const physical = source.split('\n')
  const out: string[] = []
  let plainbuf: string[] = []

  function flushplain() {
    if (!plainbuf.length) {
      return
    }
    const chunk = plainbuf.join('  \n')
    plainbuf = []
    if (chunk.trim().length) {
      out.push(chunk)
    }
  }

  for (let i = 0; i < physical.length; ++i) {
    const rawline = physical[i]
    const fields = rawline.split(';')
    const op = fields[0] ?? ''
    const values = fields.slice(1)
    const arg1raw = values[0] ?? ''
    const arg2raw = values[1] ?? ''

    if (!rawline.length && i < physical.length - 1) {
      flushplain()
      out.push('')
      continue
    }

    const optrim = op.trim()
    if (!optrim.length) {
      plainbuf.push('')
      continue
    }

    switch (NAME(optrim)) {
      case 'header': {
        flushplain()
        out.push(`# ${scrolllinkunescapefrag(arg1raw).trim()}`)
        break
      }
      case 'section': {
        flushplain()
        out.push(`## ${scrolllinkunescapefrag(arg1raw).trim()}`)
        break
      }
      case 'option': {
        flushplain()
        const left = scrolllinkunescapefrag(arg1raw).trim()
        const right = scrolllinkunescapefrag(arg2raw).trim()
        out.push(right.length ? `- ${left} — ${right}` : `- ${left}`)
        break
      }
      default: {
        if (op.trimStart().startsWith('!')) {
          flushplain()
          const bang = op.trimStart()
          const cmd = bang.slice(1).trim()
          const label = scrolllinkunescapefrag(arg1raw).trim()
          if (label.length) {
            out.push(mdlink(label, cmd))
          } else {
            out.push(mdlink(cmd, cmd))
          }
        } else if (op.trimStart().startsWith('"')) {
          flushplain()
          const text = op.trimStart().slice(1)
          if (text.length) {
            out.push(`> ${text}`)
          }
        } else {
          plainbuf.push(op)
        }
        break
      }
    }
  }

  flushplain()
  return out.join('\n\n')
}
