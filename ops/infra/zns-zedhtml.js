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
    if (iszedlinkline(trimmed) && !trimmed.startsWith('!@')) {
      rows.push(`<div class="zns-line">${textformatlinehtml(trimmed)}</div>`)
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

function znslinkrowinner(label, href, opts = {}) {
  const target = opts.newtab ? ' target="_blank" rel="noopener noreferrer"' : ''
  const inner = textformatlinehtml(label)
  return `<a class="zns-link" href="${escapehtml(href)}"${target}>${inner}</a>`
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

/** Raw ZSS codepage (text-kind tenant scrolls) with editor-style syntax colors. */
export function zedzsshtml(source, opts = {}) {
  const tape = highlightzsssource(source)
  return `<div class="zns-tape">${zedtaperowshtml(tape, opts)}</div>`
}

/** Route text-kind scrolls: raw ZSS codepages vs markdown+tape scrolls. */
export function scrollsourceisrawzss(source) {
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
