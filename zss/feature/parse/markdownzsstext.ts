import { Marked, Token, Tokens } from 'marked'
import { ispresent } from 'zss/mapping/types'

/** Width for `hr` / thematic break tbar (purple `$196`). */
export const MARKDOWN_HR_TBAR_WIDTH = 10

const EDGE = '$dkpurple'

/** Top / thematic bar (`$196`), matches zsstextui `CHR_TM`. */
const CHR_TM = '$196'
const BAR = '$205'
const RESET = '$white'

const graphemer = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function graphemelength(source: string): number {
  return [...graphemer.segment(source)].length
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function escapezedollar(source: string): string {
  return source.replaceAll('$', '$$')
}

/** Inline-only zed text (no block tokens). */
export function inlinetostring(tokens: Token[] | undefined): string {
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
        // out += `$cyan${inlinetostring(t.tokens) || t.text}${RESET}`
        break
      default:
        if ('text' in t && typeof (t as { text?: string }).text === 'string') {
          out += (t as { text: string }).text
        }
        break
    }
  }
  return out
}

export type MarkdownZedSink = {
  line: (s: string) => void
  hyperlink: (command: string, label: string) => void
}

function buildlinkcommand(token: Tokens.Link): string {
  const parts = token.text.split('|').map((item: string) => item.trim())
  const mods = parts.slice(1)
  return [...mods, token.href ?? ''].join(' ')
}

function linklabeltext(token: Tokens.Link): string {
  const parts = token.text.split('|').map((item: string) => item.trim())
  const label = parts[0]?.trim() ?? ''
  return label
}

/**
 * Zed scroll tape line: `!command;label` — not markdown images `![`.
 * Used only outside fenced code blocks in `preparemarkdownforscroll`.
 */
function ispassthroughscrollline(line: string): boolean {
  const t = line.trimStart()
  if (!t.startsWith('!') || t.startsWith('![')) {
    return false
  }
  return t.includes(';')
}

function ismarkdownfenceline(line: string): boolean {
  return line.trimStart().startsWith('```')
}

/** Reserved hook: per-line transforms for tape lines (avoid mutating fenced literals). */
function preparepassthroughscrolllineoutsidfence(line: string): string {
  return line
}

/** Fence-aware: walk physical lines so passthrough hooks run only outside fenced code blocks. */
function preparemarkdownforscroll(content: string): string {
  const lines = content.split('\n')
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

function shouldflushline(buf: string, prefix: string): boolean {
  if (prefix.length === 0) {
    return buf.length > 0
  }
  return buf.length > prefix.length
}

function flushline(sink: MarkdownZedSink, buf: string, prefix: string): string {
  if (!shouldflushline(buf, prefix)) {
    return prefix.length === 0 ? buf : prefix
  }
  sink.line(buf)
  return prefix
}

/** Walk top-level paragraph inline tokens: `br` starts a new scroll row. */
function walkparagraphinlines(
  sink: MarkdownZedSink,
  toks: Token[],
  buf: string,
  prefix: string,
): string {
  let b = buf
  for (let i = 0; i < toks.length; ++i) {
    const t = toks[i]
    if (t.type === 'br') {
      b = flushline(sink, b, prefix)
      continue
    }
    if (t.type === 'link') {
      b = flushline(sink, b, prefix)
      const lt = t as Tokens.Link
      sink.hyperlink(buildlinkcommand(lt), linklabeltext(lt))
      continue
    }
    b += inlinetostring([t])
  }
  return b
}

function paragraphemit(sink: MarkdownZedSink, token: Tokens.Paragraph) {
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

function shallowheadinglines(
  depth: 3 | 4 | 5 | 6,
  titlezed: string,
  plaintitle: string,
): string[] {
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
  }
}

function emitheading(sink: MarkdownZedSink, token: Tokens.Heading) {
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
    const lines = shallowheadinglines(
      depth as 3 | 4 | 5 | 6,
      titlezed,
      plaintitle,
    )
    for (let i = 0; i < lines.length; ++i) {
      sink.line(lines[i])
    }
    sink.line(' ')
  }
}

function emitcodeblock(sink: MarkdownZedSink, token: Tokens.Code) {
  const lines = token.text.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const raw = lines[i]
    sink.line(`$green$186$white ${escapezedollar(raw)}${RESET}`)
  }
  sink.line(' ')
}

function emitblockquote(sink: MarkdownZedSink, token: Tokens.Blockquote) {
  token.text.split('\n').forEach((ln: string) => {
    sink.line(`$purple$221$white ${ln}`)
  })
  sink.line(' ')
}

function emitthematicbreak(sink: MarkdownZedSink) {
  sink.line(' ')
  sink.line(`${EDGE}${CHR_TM.repeat(MARKDOWN_HR_TBAR_WIDTH)}`)
  sink.line(' ')
}

function listitemprefix(item: Tokens.ListItem): string {
  if (!item.task) {
    return ''
  }
  return item.checked ? '$green[x]$white ' : '$grey[ ]$white '
}

function emitlistitembody(sink: MarkdownZedSink, item: Tokens.ListItem) {
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
      const pt = t as Tokens.Paragraph
      const inner = pt.tokens
      if (!inner?.length) {
        buf += pt.text ?? ''
        continue
      }
      buf = walkparagraphinlines(sink, inner, buf, prefix)
      continue
    }
    if (t.type === 'link') {
      flushifcontent()
      const lt = t as Tokens.Link
      sink.hyperlink(buildlinkcommand(lt), linklabeltext(lt))
      continue
    }
    if (t.type === 'text') {
      buf += (t as Tokens.Text).text
      continue
    }
    buf += inlinetostring([t])
  }
  flushifcontent()
}

export function parsetokenzsstext(sink: MarkdownZedSink, token: Token) {
  switch (token.type) {
    default:
      console.info('markdownzsstext unknown', token)
      break
    case 'space':
      break
    case 'heading':
      emitheading(sink, token as Tokens.Heading)
      break
    case 'hr':
      emitthematicbreak(sink)
      break
    case 'paragraph':
      paragraphemit(sink, token as Tokens.Paragraph)
      break
    case 'code':
      emitcodeblock(sink, token as Tokens.Code)
      break
    case 'text':
      sink.line((token as Tokens.Text).text)
      break
    case 'link': {
      const lt = token as Tokens.Link
      sink.hyperlink(buildlinkcommand(lt), linklabeltext(lt))
      break
    }
    case 'image': {
      const im = token as Tokens.Image
      const showlabel = im.title ?? (im.text?.trim() ? im.text.trim() : im.href)
      sink.hyperlink(`openit ${im.href}`, `show ${showlabel}`)
      break
    }
    case 'blockquote':
      emitblockquote(sink, token as Tokens.Blockquote)
      break
    case 'list': {
      const list = token as Tokens.List
      for (let i = 0; i < (list.items?.length ?? 0); ++i) {
        const it = list.items[i]
        if (ispresent(it)) {
          parsetokenzsstext(sink, it)
        }
      }
      sink.line(' ')
      break
    }
    case 'list_item':
      emitlistitembody(sink, token as Tokens.ListItem)
      break
  }
}

function createrenderer(sink: MarkdownZedSink) {
  return {
    heading(t: Tokens.Heading) {
      parsetokenzsstext(sink, t)
      return ''
    },
    blockquote(t: Tokens.Blockquote) {
      parsetokenzsstext(sink, t)
      return ''
    },
    hr(_t: Tokens.Hr) {
      parsetokenzsstext(sink, _t)
      return ''
    },
    list(t: Tokens.List) {
      parsetokenzsstext(sink, t)
      return ''
    },
    listitem(t: Tokens.ListItem) {
      parsetokenzsstext(sink, t)
      return ''
    },
    paragraph(t: Tokens.Paragraph) {
      parsetokenzsstext(sink, t)
      return ''
    },
    code(t: Tokens.Code) {
      parsetokenzsstext(sink, t)
      return ''
    },
    html() {
      return ''
    },
  }
}

export function parsemarkdownwithzsstextsink(
  sink: MarkdownZedSink,
  content: string,
) {
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
      /** GFM bare-URL autolinks break `!command https://…;label` tape lines (see scrollwritelines). */
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
