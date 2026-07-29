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
    // Cafe MetaKey ($META) -> cmd/ctrl; measure with ctrl (longer).
    const metamatch = rest.match(/^\$meta(?![a-z])/i)
    if (metamatch) {
      out += 'ctrl'
      rest = rest.slice(metamatch[0].length)
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
    // Cafe MetaKey ($META) -> platform cmd/ctrl (client fills .zns-meta).
    const metamatch = rest.match(/^\$meta(?![a-z])/i)
    if (metamatch) {
      const key = `${pennormalized(pen)}:meta`
      const last = parts[parts.length - 1]
      if (last && last.meta && last.key === key) {
        last.text += 'ctrl'
      } else {
        parts.push({ key, pen: { ...pen }, text: 'ctrl', meta: true })
      }
      rest = rest.slice(metamatch[0].length)
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
  let cls = part.pen.blink ? 'zns-tape-span zns-blink' : 'zns-tape-span'
  if (part.meta) {
    cls += ' zns-meta'
  }
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
  }
  // HTML has no modem prefix (`chip:target!cmd`). Do not split on `!` inside
  // the payload (e.g. copyit #play flats like d!e!f).
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

/** Cafe-only input widgets; omit from ZNS HTML (no panel/editor host). */
const INPUT_LINK_TYPES = new Set([
  'charedit',
  'coloredit',
  'bgedit',
  'text',
  'tx',
  'number',
  'nm',
  'range',
  'rn',
  'select',
  'sl',
  'zssedit',
])

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

function znscopyrowinner(rowtape, copytext) {
  const inner = textformatlinehtml(rowtape)
  return `<button type="button" class="zns-copy" data-copy="${escapehtml(copytext)}">${inner}</button>`
}

function znsrowfromtape(rowtape, href, opts = {}) {
  if (href) {
    return `<div class="zns-line">${znslinkrowinner(rowtape, href, opts)}</div>`
  }
  return `<div class="zns-line">${textformatlinehtml(rowtape)}</div>`
}

/** Match LinkHotkey / scroll row parity (iseven -> ltgray, else dkcyan). */
function hotkeybadgebg(iseven) {
  return iseven ? '$black$onltgray' : '$black$ondkcyan'
}

function hotkeybadgetext(shortcut, maybetext) {
  return maybetext || ` ${String(shortcut).toUpperCase()} `
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
  if (INPUT_LINK_TYPES.has(linktype)) {
    return ''
  }
  const label = parsed.label
  const iseven = opts.iseven === true
  const badgebg = hotkeybadgebg(iseven)
  switch (linktype) {
    case 'openit': {
      return zedopenitznslinkrowhtml(line, opts)
    }
    case 'hk':
    case 'hotkey': {
      const target = words[0] ?? ''
      const shortcut = words[1] ?? ''
      const maybetext = words[2] ?? ''
      const badge = hotkeybadgetext(shortcut, maybetext)
      const row = `${badgebg}${badge}$cyan$onclear ${label}`
      return znsrowfromtape(row, zedpathhref(target, opts), opts)
    }
    case 'copyit': {
      const content = words.filter((w) => w !== 'istargetless').join(' ')
      const row = `$purple$16 $yellowCOPYIT $cyan${label}`
      return `<div class="zns-line">${znscopyrowinner(row, content)}</div>`
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
  let linkrowindex = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      rows.push(znsrowhtml('', '', { raw: true }))
      continue
    }
    if (isopenitlinkline(trimmed)) {
      const row = zedopenitznslinkrowhtml(trimmed, {
        ...opts,
        iseven: linkrowindex % 2 === 0,
      })
      rows.push(row)
      linkrowindex += 1
      continue
    }
    if (iszedlinkline(trimmed)) {
      const row = zedzedlinkrowhtml(trimmed, {
        ...opts,
        iseven: linkrowindex % 2 === 0,
      })
      if (!row) {
        continue
      }
      rows.push(row)
      linkrowindex += 1
      continue
    }
    rows.push(`<div class="zns-line">${textformatlinehtml(line)}</div>`)
  }
  return rows.join('')
}

function parseopenit(line) {
  const body = line.replace(/^!openit\s*/i, '').trim()
  const semi = body.indexOf(';')
  const head = (semi === -1 ? body : body.slice(0, semi)).trim()
  const label = semi === -1 ? body : body.slice(semi + 1).trim()
  // Optional trailing: hk <key> ["badge"] [next]
  const hkmatch = head.match(
    /^(.*?)\s+hk(?:ey)?\s+(\S+)(?:\s+("([^"]*)"|[^\s]+))?(?:\s+next)?\s*$/i,
  )
  let href = head
  let shortcut = ''
  let maybetext = ''
  if (hkmatch) {
    href = hkmatch[1].trim()
    shortcut = hkmatch[2] ?? ''
    if (hkmatch[4] != null && hkmatch[4] !== '') {
      maybetext = hkmatch[4]
    } else if (hkmatch[3] && !String(hkmatch[3]).startsWith('"')) {
      maybetext = hkmatch[3]
    }
  }
  href = href.replace(/^inline\s+/i, '').trim()
  return { href, label, shortcut, maybetext }
}

export function zedopenitznslinkrowhtml(label, path, opts = {}) {
  if (typeof path === 'object' && path !== null) {
    opts = path
    path = label
  }
  let href = path
  let text = label
  let shortcut = ''
  let maybetext = ''
  if (String(label).startsWith('!openit')) {
    const parsed = parseopenit(String(label))
    href = parsed.href
    text = parsed.label
    shortcut = parsed.shortcut
    maybetext = parsed.maybetext
  }
  const base = opts.tenantbase ?? ''
  const url = String(href).startsWith('http') ? href : `${base}${href}`
  const linkopts = {
    ...opts,
    newtab: String(url).startsWith('http') ? true : opts.newtab,
  }
  if (shortcut) {
    const badgebg = hotkeybadgebg(opts.iseven === true)
    const badge = hotkeybadgetext(shortcut, maybetext)
    const row = `${badgebg}${badge}$cyan$onclear ${text}`
    return znsrowfromtape(row, url, linkopts)
  }
  const row = `$purple$16 $yellowOPENIT $white${text} `
  return `<div class="zns-line">${znslinkrowinner(row, url, linkopts)}</div>`
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
