import { cp437tochar } from './zns-cp437.js'
import { parsemarkdownwithzsstextsink } from './zns-markdown.js'
import {
  fghex,
  matchcolorname,
  resolvebgindex,
  resolveblindex,
  resolvefgindex,
} from './zns-palette.js'
import { highlightzsssource } from './zns-zss-syntax.js'

const COLOR_EDGE = '$dkpurple'
const CHR_BM = '$205'

const DEFAULT_PEN = { fg: 15, bg: null, blink: false }

function escapehtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pennormalized(pen) {
  return `${pen.fg}:${pen.bg ?? 'x'}:${pen.blink ? 1 : 0}`
}

function stripformatcodes(text) {
  let out = ''
  let rest = String(text ?? '')
  while (rest.length > 0) {
    if (rest.startsWith('$$')) {
      out += '$'
      rest = rest.slice(2)
      continue
    }
    const nummatch = rest.match(/^\$(\d+)/)
    if (nummatch) {
      out += cp437tochar(Number(nummatch[1]))
      rest = rest.slice(nummatch[0].length)
      continue
    }
    const colormatch = rest.match(/^\$([a-z]+)/i)
    if (colormatch) {
      const name = matchcolorname(colormatch[1])
      if (name.length > 0) {
        rest = rest.slice(name.length + 1)
        continue
      }
    }
    out += rest[0]
    rest = rest.slice(1)
  }
  return out
}

export function measuredrawnwidth(text) {
  return stripformatcodes(text).length
}

function applycolorname(pen, name) {
  if (name === 'onclear') {
    pen.fg = DEFAULT_PEN.fg
    pen.bg = DEFAULT_PEN.bg
    pen.blink = DEFAULT_PEN.blink
    return
  }
  const bgindex = resolvebgindex(name)
  if (bgindex !== undefined) {
    pen.bg = bgindex
    return
  }
  const blindex = resolveblindex(name)
  if (blindex !== undefined) {
    pen.fg = blindex
    pen.blink = true
    return
  }
  const fgindex = resolvefgindex(name)
  if (fgindex !== undefined) {
    pen.fg = fgindex
    pen.blink = false
  }
}

function pushpart(parts, pen, text) {
  if (!text) {
    return
  }
  const key = pennormalized(pen)
  const last = parts[parts.length - 1]
  if (last && last.key === key) {
    last.text += text
    return
  }
  parts.push({ key, pen: { ...pen }, text })
}

function parsetapeparts(line) {
  const parts = []
  const pen = { ...DEFAULT_PEN }
  let rest = String(line ?? '')
  while (rest.length > 0) {
    if (rest.startsWith('$$')) {
      pushpart(parts, pen, '$')
      rest = rest.slice(2)
      continue
    }
    const colormatch = rest.match(/^\$([a-z]+)/i)
    if (colormatch) {
      const name = matchcolorname(colormatch[1])
      if (name.length > 0) {
        applycolorname(pen, name)
        rest = rest.slice(name.length + 1)
        continue
      }
    }
    const nummatch = rest.match(/^\$(\d+)/)
    if (nummatch) {
      pushpart(parts, pen, cp437tochar(Number(nummatch[1])))
      rest = rest.slice(nummatch[0].length)
      continue
    }
    const next = rest.search(/\$(?:\$|[a-z]|\d)/i)
    if (next === 0) {
      pushpart(parts, pen, '$')
      rest = rest.slice(1)
      continue
    }
    const chunk = next === -1 ? rest : rest.slice(0, next)
    rest = next === -1 ? '' : rest.slice(next)
    pushpart(parts, pen, chunk)
  }
  return parts
}

function rendertapepart(part) {
  const fg = fghex(part.pen.fg)
  const bg =
    part.pen.bg != null ? fghex(part.pen.bg) : part.pen.blink ? fg : null
  let style = `color:${fg}`
  if (part.pen.bg != null) {
    style += `;background-color:${fghex(part.pen.bg)}`
  }
  const cls = part.pen.blink ? 'zns-tape-span zns-blink' : 'zns-tape-span'
  if (part.pen.blink) {
    style += `;--zns-fg:${fg};--zns-bg:${bg ?? fg}`
  }
  return `<span class="${cls}" style="${style}">${escapehtml(part.text)}</span>`
}

export function textformatlinehtml(line) {
  return parsetapeparts(line).map(rendertapepart).join('')
}

export function znsrowhtml(content, classname = '', opts = {}) {
  const inner = opts.raw ? content : escapehtml(content)
  const cls = classname ? ` zns-line ${classname}` : ' zns-line'
  return `<div class="${cls.trim()}">${inner}</div>`
}

function isopenitlinkline(line) {
  return /^!openit\b/i.test(String(line ?? '').trim())
}

function iszedlinkline(line) {
  const trimmed = String(line ?? '').trim()
  return trimmed.startsWith('!') && trimmed.includes(';')
}

/** Match zss/mapping/string scrolllinkunescapefrag ($59 -> ';'). */
function unescapezedfrag(s) {
  return String(s ?? '').replace(/\$59(?!\d)/g, ';')
}

/** Quoted-token split; mirrors zss/feature/zedlinkparse zedlinksplittokens. */
function zedlinksplittokens(s) {
  const out = []
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

const ATCHIP_RE = /^@([a-zA-Z][a-zA-Z0-9_]*)\s+(.+)$/

/**
 * Parse `!command;label` for HTML (chip/modem unused). Mirrors parsezedlinkline.
 * @returns {{ label: string, words: string[] } | undefined}
 */
function parsezedlinklinehtml(line) {
  const trimmed = String(line ?? '').trim()
  if (!trimmed.startsWith('!')) {
    return undefined
  }
  let rest = trimmed.slice(1)
  if (rest.startsWith('!')) {
    rest = rest.slice(1)
  }
  const semi = rest.indexOf(';')
  if (semi < 0) {
    return undefined
  }
  let head = unescapezedfrag(rest.slice(0, semi).trimEnd())
  const label = unescapezedfrag(rest.slice(semi + 1).trim())
  const atchip = ATCHIP_RE.exec(head)
  if (atchip) {
    head = atchip[2].trimStart()
  } else {
    const secondbang = head.indexOf('!')
    if (secondbang >= 0) {
      head = head.slice(secondbang + 1)
    }
  }
  return { label, words: zedlinksplittokens(head) }
}

const KNOWN_LINK_TYPES = new Set([
  'copyit',
  'openit',
  'viewit',
  'runit',
  'hk',
  'hotkey',
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
  'zssedit',
  'charedit',
  'coloredit',
  'bgedit',
  'hyperlink',
])

const TARGETLESS_LINK_TYPES = new Set(['copyit', 'openit', 'viewit', 'runit'])

/** Path keys served under tenantbase (docs.at.zed.cafe/{key}). */
const ZNS_PATH_KEY_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/i

function namelower(word) {
  return String(word ?? '').toLowerCase()
}

function resolvelinktypeandwords(rawwords) {
  const words = rawwords.map((w) => `${w}`)
  if (words.length === 0) {
    return { linktype: 'hyperlink', words: [] }
  }
  const w0 = namelower(words[0])
  const w1 = namelower(words[1])
  if (KNOWN_LINK_TYPES.has(w0)) {
    if (w0 === 'hyperlink') {
      return { linktype: 'hyperlink', words: words.slice(1) }
    }
    if (TARGETLESS_LINK_TYPES.has(w0)) {
      return {
        linktype: w0,
        words: ['istargetless', ...words.slice(1)],
      }
    }
    return { linktype: w0, words: words.slice(1) }
  }
  if (KNOWN_LINK_TYPES.has(w1)) {
    return {
      linktype: w1,
      words: [words[0], ...words.slice(2)],
    }
  }
  return { linktype: 'hyperlink', words }
}

function zedpathhref(target, opts = {}) {
  const t = String(target ?? '').trim()
  if (!t || t === 'istargetless') {
    return ''
  }
  if (/^https?:\/\//i.test(t)) {
    return t
  }
  if (t.startsWith('/')) {
    return t
  }
  if (!ZNS_PATH_KEY_RE.test(t)) {
    return ''
  }
  const base = opts.tenantbase ?? ''
  return `${base}${t}`
}

function znslinkrowinner(label, href, opts = {}) {
  const target = opts.newtab ? ' target="_blank" rel="noopener noreferrer"' : ''
  const inner = textformatlinehtml(label)
  return `<a class="zns-link" href="${escapehtml(href)}"${target}>${inner}</a>`
}

function znsrowfromtape(rowtape, href, opts = {}) {
  if (href) {
    return `<div class="zns-line">${znslinkrowinner(rowtape, href, opts)}</div>`
  }
  return `<div class="zns-line">${textformatlinehtml(rowtape)}</div>`
}

/**
 * Render bang hyperlinks as label chrome (hotkey badge / purple bullet), not
 * raw `!cmd;label` source. Navigable scroll targets become tenant `<a href>`.
 */
export function zedzedlinkrowhtml(line, opts = {}) {
  const parsed = parsezedlinklinehtml(line)
  if (!parsed) {
    return `<div class="zns-line">${textformatlinehtml(line)}</div>`
  }
  const { linktype, words } = resolvelinktypeandwords(parsed.words)
  const label = parsed.label
  switch (linktype) {
    case 'openit': {
      return zedopenitznslinkrowhtml(line, opts)
    }
    case 'hk':
    case 'hotkey': {
      const target = words[0] ?? ''
      const shortcut = words[1] ?? ''
      const maybetext = words[2] ?? ''
      const badge = maybetext || ` ${String(shortcut).toUpperCase()} `
      const row = `$black$ondkcyan${badge}$cyan$onclear ${label}`
      return znsrowfromtape(row, zedpathhref(target, opts), opts)
    }
    case 'copyit': {
      const row = `$purple$16 $yellowCOPYIT $cyan${label}`
      return znsrowfromtape(row, '', opts)
    }
    case 'viewit': {
      const content = words.filter((w) => w !== 'istargetless').join(' ')
      const row = `$purple$16 $cyanVIEWIT $white${label}`
      const href = zedpathhref(content, opts)
      return znsrowfromtape(row, href, {
        ...opts,
        newtab: href.startsWith('http') ? true : opts.newtab,
      })
    }
    case 'runit': {
      const row = `$purple$16 $yellowRUNIT $cyan${label}`
      return znsrowfromtape(row, '', opts)
    }
    case 'charedit':
    case 'coloredit':
    case 'bgedit':
    case 'text':
    case 'tx':
    case 'number':
    case 'nm':
    case 'range':
    case 'rn':
    case 'select':
    case 'sl':
    case 'zssedit': {
      const row = `$purple$16 $cyan${label}`
      return znsrowfromtape(row, '', opts)
    }
    case 'hyperlink':
    default: {
      const target = words[0] ?? ''
      const row = `$purple$16 $cyan${label}`
      return znsrowfromtape(row, zedpathhref(target, opts), opts)
    }
  }
}

export function zedtaperowshtml(tape, opts = {}) {
  const lines = String(tape ?? '').split('\n')
  const rows = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      rows.push(znsrowhtml('', '', { raw: true }))
      continue
    }
    if (isopenitlinkline(trimmed)) {
      rows.push(zedopenitznslinkrowhtml(trimmed, opts))
      continue
    }
    if (iszedlinkline(trimmed)) {
      rows.push(zedzedlinkrowhtml(trimmed, opts))
      continue
    }
    rows.push(`<div class="zns-line">${textformatlinehtml(line)}</div>`)
  }
  return rows.join('')
}

function parseopenit(line) {
  const body = line.replace(/^!openit\s*/i, '').trim()
  const semi = body.indexOf(';')
  if (semi === -1) {
    return { href: body, label: body }
  }
  return {
    href: body.slice(0, semi).replace(/^inline\s+/i, '').trim(),
    label: body.slice(semi + 1).trim(),
  }
}

export function zedopenitznslinkrowhtml(label, path, opts = {}) {
  if (typeof path === 'object' && path !== null) {
    opts = path
    path = label
  }
  let href = path
  let text = label
  if (String(label).startsWith('!openit')) {
    const parsed = parseopenit(String(label))
    href = parsed.href
    text = parsed.label
  }
  const base = opts.tenantbase ?? ''
  const url = String(href).startsWith('http') ? href : `${base}${href}`
  const row = `$purple$16 $yellowOPENIT $white${text} `
  return `<div class="zns-line">${znslinkrowinner(row, url, opts)}</div>`
}

export function zederrorlinehtml(msg, key) {
  return `<div class="zns-tape"><div class="zns-line"><span class="zns-err">${escapehtml(msg)}</span> <span class="zns-muted">${escapehtml(key)}</span></div></div>`
}

export function zsssectionlines(kind) {
  const label = String(kind ?? '')
  const width = label.length + 2
  return [
    `${COLOR_EDGE} ${' '.repeat(label.length)} `,
    `${COLOR_EDGE} $gray${label} `,
    `${COLOR_EDGE}${CHR_BM.repeat(width)}`,
  ]
}

export function zedtapehtml(markdown, opts = {}) {
  const sinklines = []
  parsemarkdownwithzsstextsink(
    {
      line: (s) => sinklines.push(s),
      hyperlink: (command, label) => {
        sinklines.push(`!${command};${label}`)
      },
    },
    markdown,
  )
  const rows = []
  for (const line of sinklines) {
    for (const row of line.split('\n')) {
      rows.push(row)
    }
  }
  return `<div class="zns-tape">${zedtaperowshtml(rows.join('\n'), opts)}</div>`
}

/** Txt codepage (`@txt <name>` first line): markdown body, no ZSS lexer highlight. */
export function scrollsourceistxtcodepage(source) {
  const lines = String(source ?? '').split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      continue
    }
    return /^@txt\s+\S/i.test(t)
  }
  return false
}

export function striptxtcodepageheader(source) {
  const lines = String(source ?? '').split('\n')
  let skippedheader = false
  const out = []
  for (const line of lines) {
    const t = line.trim()
    if (!skippedheader && t && /^@txt\s+\S/i.test(t)) {
      skippedheader = true
      continue
    }
    out.push(line)
  }
  while (out.length > 0 && out[0].trim() === '') {
    out.shift()
  }
  return out.join('\n')
}

export function zedtxthtml(source, opts = {}) {
  return zedtapehtml(striptxtcodepageheader(source), opts)
}

/** Raw ZSS codepage (text-kind tenant scrolls) with editor-style syntax colors. */
export function zedzsshtml(source, opts = {}) {
  const tape = highlightzsssource(source)
  return `<div class="zns-tape">${zedtaperowshtml(tape, opts)}</div>`
}

/** Route text-kind scrolls: txt codepage vs raw ZSS vs markdown+tape scrolls. */
export function scrollsourceisrawzss(source) {
  if (scrollsourceistxtcodepage(source)) {
    return false
  }
  const lines = String(source ?? '').split('\n')
  let skippedscrolltitle = false
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      continue
    }
    if (!skippedscrolltitle && /^@\w+$/.test(t)) {
      skippedscrolltitle = true
      continue
    }
    if (/^@\w/.test(t)) {
      return true
    }
    if (/^\$/.test(t)) {
      return false
    }
    if (/^#+\s/.test(t)) {
      return false
    }
    if (/^\[[^\]]+\]\(/.test(t)) {
      return false
    }
    break
  }
  const text = String(source ?? '')
  const zss = (text.match(/^@\w+/gm) ?? []).length
  const md =
    (text.match(/^\[[^\]]+\]\(/gm) ?? []).length +
    (text.match(/^#+\s/gm) ?? []).length
  return zss > md && zss > 0
}
