/** Source of truth: zss/feature/parse/markdownzsstext.ts */
import { Marked } from 'marked'
import { highlightzssline } from './zns-zss-syntax.js'

export const MARKDOWN_HR_TBAR_WIDTH = 10

const EDGE = '$dkpurple'
const CHR_TM = '$196'
const BAR = '$205'
const RESET = '$white'

function graphemelength(source) {
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...segmenter.segment(source)].length
  } catch {
    return [...source].length
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function ispresent(value) {
  return value !== undefined && value !== null
}

export function escapezedollar(source) {
  return String(source ?? '').replaceAll('$', '$$')
}

export function inlinetostring(tokens) {
  if (!ispresent(tokens) || tokens.length === 0) {
    return ''
  }
  let out = ''
  for (let i = 0; i < tokens.length; ++i) {
    const t = tokens[i]
    switch (t.type) {
      case 'text':
        out += t.text
        break
      case 'escape':
        out += t.text
        break
      case 'strong':
        out += `$yellow${inlinetostring(t.tokens)}${RESET}`
        break
      case 'em':
        out += `$cyan${inlinetostring(t.tokens)}${RESET}`
        break
      case 'codespan':
        out += `$purple ${escapezedollar(t.text)} ${RESET}`
        break
      case 'del':
        out += `$dkgray${inlinetostring(t.tokens)}${RESET}`
        break
      case 'br':
        out += '\n'
        break
      case 'link':
        break
      default:
        if ('text' in t && typeof t.text === 'string') {
          out += t.text
        }
        break
    }
  }
  return out
}

function buildlinkcommand(token) {
  const parts = token.text.split('|').map((item) => item.trim())
  const mods = parts.slice(1)
  return [...mods, token.href ?? ''].join(' ')
}

function linklabeltext(token) {
  const parts = token.text.split('|').map((item) => item.trim())
  return parts[0]?.trim() ?? ''
}

function buildimagecommand(im) {
  return `viewit ${im.href}`
}

function imagelinklabel(im) {
  const showlabel = im.title ?? (im.text?.trim() ? im.text.trim() : im.href)
  return `view ${showlabel}`
}

function ispassthroughscrollline(line) {
  const t = line.trimStart()
  if (!t.startsWith('!') || t.startsWith('![')) {
    return false
  }
  return t.includes(';')
}

function ismarkdownfenceline(line) {
  return line.trimStart().startsWith('```')
}

function preparepassthroughscrolllineoutsidfence(line) {
  return line
}

function preparemarkdownforscroll(content) {
  const lines = String(content ?? '').split('\n')
  let infence = false
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i]
    if (infence) {
      if (ismarkdownfenceline(line)) {
        infence = false
      }
      continue
    }
    if (ismarkdownfenceline(line)) {
      infence = true
      continue
    }
    if (ispassthroughscrollline(line)) {
      lines[i] = preparepassthroughscrolllineoutsidfence(line)
    }
  }
  return lines.join('\n')
}

function shouldflushline(buf, prefix) {
  if (prefix.length === 0) {
    return buf.length > 0
  }
  return buf.length > prefix.length
}

function flushline(sink, buf, prefix) {
  if (!shouldflushline(buf, prefix)) {
    return prefix.length === 0 ? buf : prefix
  }
  sink.line(buf)
  return prefix
}

function walkparagraphinlines(sink, toks, buf, prefix) {
  let b = buf
  for (let i = 0; i < toks.length; ++i) {
    const t = toks[i]
    if (t.type === 'br') {
      b = flushline(sink, b, prefix)
      continue
    }
    if (t.type === 'link') {
      b = flushline(sink, b, prefix)
      sink.hyperlink(buildlinkcommand(t), linklabeltext(t))
      continue
    }
    if (t.type === 'image') {
      b = flushline(sink, b, prefix)
      sink.hyperlink(buildimagecommand(t), imagelinklabel(t))
      continue
    }
    b += inlinetostring([t])
  }
  return b
}

function paragraphemit(sink, token) {
  const toks = token.tokens
  if (!toks?.length) {
    sink.line('')
    return
  }
  const buf = walkparagraphinlines(sink, toks, '', '')
  if (buf.length) {
    sink.line(buf)
  }
}

function shallowheadinglines(depth, titlezed, plaintitle) {
  const n = Math.max(graphemelength(plaintitle), 1)
  const barlen = clamp(n + 2, 8, 48)
  switch (depth) {
    case 3:
      return [
        `${EDGE}$yellow${titlezed}${RESET}`,
        `${EDGE}${BAR.repeat(barlen)}`,
      ]
    case 4:
      return [`${EDGE}$cyan${titlezed}${RESET}`]
    case 5:
      return [`$gray${titlezed}${RESET}`]
    case 6:
      return [`$dkgray${titlezed}${RESET}`]
    default:
      return []
  }
}

function emitheading(sink, token) {
  const depth = token.depth
  const titlezed = inlinetostring(token.tokens) || token.text
  const plaintitle = token.text
  if (depth === 1) {
    const w = titlezed.length + 2
    sink.line(`${EDGE}${CHR_TM.repeat(w)}`)
    sink.line(`${EDGE} $white${titlezed} `)
    sink.line(`${EDGE}${BAR.repeat(w)}`)
    sink.line(' ')
    return
  }
  if (depth === 2) {
    const w = titlezed.length + 2
    sink.line(`${EDGE} $gray${titlezed} `)
    sink.line(`${EDGE}${BAR.repeat(w)}`)
    sink.line(' ')
    return
  }
  if (depth >= 3 && depth <= 6) {
    const lines = shallowheadinglines(depth, titlezed, plaintitle)
    for (let i = 0; i < lines.length; ++i) {
      sink.line(lines[i])
    }
    sink.line(' ')
  }
}

function emitcodeblock(sink, token) {
  const lines = token.text.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const raw = escapezedollar(lines[i])
    sink.line(`$green$186$white ${highlightzssline(raw)}${RESET}`)
  }
  sink.line(' ')
}

function emitblockquote(sink, token) {
  token.text.split('\n').forEach((ln) => {
    sink.line(`$purple$221$white ${ln}`)
  })
  sink.line(' ')
}

function emitthematicbreak(sink) {
  sink.line(' ')
  sink.line(`${EDGE}${CHR_TM.repeat(MARKDOWN_HR_TBAR_WIDTH)}`)
  sink.line(' ')
}

function listitemprefix(item) {
  if (!item.task) {
    return ''
  }
  return item.checked ? '$green[x]$white ' : '$grey[ ]$white '
}

function emitlistitembody(sink, item) {
  const prefix = ` $grey$7 ${listitemprefix(item)}`
  const toks = item.tokens
  if (!toks?.length) {
    sink.line(`${prefix}${item.text.trim()}`)
    return
  }
  let buf = prefix
  function flushifcontent() {
    if (buf.length > prefix.length) {
      sink.line(buf)
      buf = prefix
    }
  }
  for (let i = 0; i < toks.length; ++i) {
    const t = toks[i]
    if (t.type === 'br') {
      if (buf.length > prefix.length) {
        sink.line(buf)
        buf = prefix
      }
      continue
    }
    if (t.type === 'list') {
      if (buf.length > prefix.length) {
        sink.line(buf)
      } else {
        sink.line(prefix)
      }
      buf = prefix
      parsetokenzsstext(sink, t)
      continue
    }
    if (t.type === 'paragraph') {
      const inner = t.tokens
      if (!inner?.length) {
        buf += t.text ?? ''
        continue
      }
      buf = walkparagraphinlines(sink, inner, buf, prefix)
      continue
    }
    if (t.type === 'link') {
      flushifcontent()
      sink.hyperlink(buildlinkcommand(t), linklabeltext(t))
      continue
    }
    if (t.type === 'image') {
      flushifcontent()
      sink.hyperlink(buildimagecommand(t), imagelinklabel(t))
      continue
    }
    if (t.type === 'text') {
      buf += t.text
      continue
    }
    buf += inlinetostring([t])
  }
  flushifcontent()
}

function parsetokenzsstext(sink, token) {
  switch (token.type) {
    default:
      break
    case 'space':
      break
    case 'heading':
      emitheading(sink, token)
      break
    case 'hr':
      emitthematicbreak(sink)
      break
    case 'paragraph':
      paragraphemit(sink, token)
      break
    case 'code':
      emitcodeblock(sink, token)
      break
    case 'text':
      sink.line(token.text)
      break
    case 'link':
      sink.hyperlink(buildlinkcommand(token), linklabeltext(token))
      break
    case 'image':
      sink.hyperlink(buildimagecommand(token), imagelinklabel(token))
      break
    case 'blockquote':
      emitblockquote(sink, token)
      break
    case 'list': {
      for (let i = 0; i < (token.items?.length ?? 0); ++i) {
        const it = token.items[i]
        if (ispresent(it)) {
          parsetokenzsstext(sink, it)
        }
      }
      sink.line(' ')
      break
    }
    case 'list_item':
      emitlistitembody(sink, token)
      break
  }
}

function createrenderer(sink) {
  let hasemitted = false
  function emitblock(token) {
    parsetokenzsstext(sink, token)
    hasemitted = true
    return ''
  }
  return {
    space() {
      if (hasemitted) {
        sink.line('')
      }
      return ''
    },
    heading(t) {
      return emitblock(t)
    },
    blockquote(t) {
      return emitblock(t)
    },
    hr(_t) {
      return emitblock(_t)
    },
    list(t) {
      return emitblock(t)
    },
    listitem(t) {
      return emitblock(t)
    },
    paragraph(t) {
      return emitblock(t)
    },
    code(t) {
      return emitblock(t)
    },
    html() {
      return ''
    },
  }
}

export function parsemarkdownwithzsstextsink(sink, content) {
  const md = new Marked({
    pedantic: false,
    gfm: true,
    breaks: false,
  })
  md.use({
    renderer: createrenderer(sink),
    tokenizer: {
      html() {
        return undefined
      },
      autolink() {
        return undefined
      },
      url() {
        return undefined
      },
    },
  })
  md.parse(preparemarkdownforscroll(content), { async: false })
}
