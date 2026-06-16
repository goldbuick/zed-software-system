/**
 * ZNS: email + OTP login, namespace claim, long-lived token, KV pairs.
 * API reference: ops/infra/README.md#zns-net-zns-workerjs
 */

import { ZNS_VGA_FONT_DATA_URI } from './generated/zns-vga-font.js'

const ZNS_PEER_KEY = 'peer'
const ZNS_DOCS_NAMESPACE = 'docs'
const ZNS_APEX_DEFAULT = 'zns.zed.cafe'
const ZNS_TENANT_SUFFIX_DEFAULT = 'at.zed.cafe'
const BYTES_ORIGIN_DEFAULT = 'https://bytes.zed.cafe'
const JOIN_ORIGIN_DEFAULT = 'https://zed.cafe'
const RESERVED_NS = new Set(['www', 'api', 'mail', 'ftp'])

const corsheaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

/** bytes short keys: 4 letter + base36 time slice (see net-bytes-worker.js) */
const BYTES_HASH_RE = /^[A-Za-z0-9]{8,96}$/

/** PeerJS ids: permissive safe string */
const PEER_ID_RE = /^[a-zA-Z0-9_-]{4,256}$/

const NS_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
const PATH_KEY_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/

const TEXT_MAX_BYTES = 512 * 1024

const ZNS_KIND_ORDER = ['bytes', 'peer', 'text']

const tenantcorsheaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Allow-Origin': '*',
}

function flatstr(value) {
  return (value ?? '').toString().trim().toLowerCase()
}

function digitrandom() {
  return 1 + Math.round(Math.random() * 8)
}

function gentoken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingstringequal(a, b) {
  if (a.length !== b.length) {
    return false
  }
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

function userstoragekey(email) {
  return `user:${email}`
}

function nsstoragekey(namespace) {
  return `ns:${namespace}`
}

function pairstoragekey(namespace, pathkey) {
  return `pair:${namespace}:${pathkey}`
}

function apexhost(env) {
  return env.ZNS_APEX ?? ZNS_APEX_DEFAULT
}

function tenantsuffix(env) {
  return env.ZNS_TENANT_SUFFIX ?? ZNS_TENANT_SUFFIX_DEFAULT
}

function bytesorigin(env) {
  const o = env.BYTES_ORIGIN ?? BYTES_ORIGIN_DEFAULT
  return o.replace(/\/+$/, '')
}

function joinorigin(env) {
  const o = env.JOIN_ORIGIN ?? JOIN_ORIGIN_DEFAULT
  return o.replace(/\/+$/, '')
}

function validatenamespace(ns) {
  if (!ns || !NS_RE.test(ns) || RESERVED_NS.has(ns)) {
    return false
  }
  return true
}

function validatepathkey(pathkey) {
  if (!pathkey || pathkey.includes('/') || !PATH_KEY_RE.test(pathkey)) {
    return false
  }
  return true
}

function validatepeerid(value) {
  return typeof value === 'string' && PEER_ID_RE.test(value)
}

function normalizebytesvalue(raw) {
  const s = String(raw ?? '').trim()
  if (!s) {
    return null
  }
  if (/^https:\/\/bytes\.zed\.cafe\//i.test(s)) {
    try {
      const u = new URL(s)
      const seg = u.pathname.replace(/^\//, '').split('/')[0]
      if (BYTES_HASH_RE.test(seg)) {
        return seg
      }
    } catch {
      return null
    }
  }
  if (BYTES_HASH_RE.test(s)) {
    return s
  }
  return null
}

function validatetextvalue(raw) {
  const s = String(raw ?? '')
  if (!s.trim()) {
    return null
  }
  const bytes = new TextEncoder().encode(s)
  if (bytes.length > TEXT_MAX_BYTES) {
    return null
  }
  return s
}

function resolvepairkind(pathkey, stored, metadata) {
  const kind = metadata?.kind
  if (kind === 'peer' || kind === 'bytes' || kind === 'text') {
    return kind
  }
  if (pathkey === ZNS_PEER_KEY) {
    return 'peer'
  }
  if (typeof stored === 'string' && BYTES_HASH_RE.test(stored)) {
    return 'bytes'
  }
  return 'text'
}

function escapehtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** zss/feature/palette.ts — ZZT 16-color palette (hex used in login email) */
const ZSS_PALETTE = {
  black: '#000000',
  dkblue: '#00002a',
  ltgray: '#2a2a2a',
  blue: '#15153f',
  green: '#153f15',
  cyan: '#153f3f',
  yellow: '#3f3f15',
  white: '#3f3f3f',
}

const ZSS_MONO =
  'ui-monospace,"Cascadia Code","Source Code Pro",Menlo,Consolas,monospace'

const ZNS_EMAIL_INNER_WIDTH = 40

const ZNS_VGA_FONT =
  "'Perfect DOS VGA 437', Fixedsys, Terminal, 'Lucida Console', Consolas, monospace"

const ZNS_VGA_PIXEL = 16

/** Readable EGA colors for browser HTML (not ZZT index-as-hex). */
const ZNS_VGA_HTML = {
  bg: '#0000AA',
  frame: '#AAAAAA',
  text: '#FFFFFF',
  brand: '#55FFFF',
  command: '#55FF55',
  cmdbg: '#000000',
  link: '#55FFFF',
  hint: '#FFFF55',
  muted: '#AAAAAA',
}

/** CP437 box drawing for decorative frames (width fits content, not fixed 80). */
const ZNS_CP437 = {
  TL: '\u250c',
  TR: '\u2510',
  BL: '\u2514',
  BR: '\u2518',
  H: '\u2500',
  V: '\u2502',
  TLR: '\u251c',
  TRR: '\u2524',
}

function padterminalline(text, width) {
  const s = String(text ?? '')
  if (s.length >= width) {
    return s.slice(0, width)
  }
  return s + ' '.repeat(width - s.length)
}

function znsframetop(decorinner) {
  return `${ZNS_CP437.TL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TR}`
}

function znsframebottom(decorinner) {
  return `${ZNS_CP437.BL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.BR}`
}

function znsframerule(decorinner) {
  return `${ZNS_CP437.TLR}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TRR}`
}

function znsframerow(content, decorinner) {
  return `${ZNS_CP437.V} ${padterminalline(content, decorinner)} ${ZNS_CP437.V}`
}

function znsheaderrow(decorinner, left, right) {
  const gap = Math.max(1, decorinner - left.length - right.length)
  return znsframerow(`${left}${' '.repeat(gap)}${right}`, decorinner)
}

function znscmdbox(command, indent = 2) {
  const pad = 2
  const inner = command.length + pad * 2
  const prefix = ' '.repeat(indent)
  const top = `${prefix}${ZNS_CP437.TL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.TR}`
  const mid =
    `${prefix}${ZNS_CP437.V}` +
    ' '.repeat(pad) +
    command +
    ' '.repeat(pad) +
    `${ZNS_CP437.V}`
  const bottom = `${prefix}${ZNS_CP437.BL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.BR}`
  return [top, mid, bottom].join('\n')
}

function znsartpre(text, extra = '') {
  const extrahtml = extra ? ` ${extra.trim()}` : ''
  return `<pre class="zns-vga zns-art${extrahtml}">${escapehtml(text)}</pre>`
}

function buildznsvgastylesheet(bg) {
  const v = ZNS_VGA_HTML
  return `@font-face {
  font-family: 'Perfect DOS VGA 437';
  src: url('${ZNS_VGA_FONT_DATA_URI}') format('woff2'),
       url('/fonts/PerfectDOSVGA437.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
html, body { height: 100%; }
body.zns-page {
  margin: 0;
  padding: 16px;
  background: ${bg};
  color: ${v.text};
  box-sizing: border-box;
}
.zns-vga {
  margin: 0;
  font-family: ${ZNS_VGA_FONT};
  font-size: ${ZNS_VGA_PIXEL}px;
  line-height: 1.35;
  letter-spacing: 0;
  font-weight: normal;
  font-style: normal;
  font-kerning: none;
  font-variant-ligatures: none;
  font-feature-settings: "kern" 0, "liga" 0, "calt" 0;
  font-synthesis: none;
  text-rendering: geometricPrecision;
}
.zns-vga p {
  margin: 0 0 12px;
}
.zns-vga header {
  margin: 0 0 12px;
}
.zns-art {
  color: ${v.frame};
  margin: 0 0 12px;
  white-space: pre;
  width: fit-content;
  max-width: 100%;
}
.zns-art.zns-cmdbox {
  color: ${v.command};
  background: ${v.cmdbg};
}
.zns-brand { color: ${v.brand}; }
.zns-text { color: ${v.text}; }
.zns-muted { color: ${v.muted}; }
.zns-hint { color: ${v.hint}; }
.zns-cmd {
  color: ${v.command};
  background: ${v.cmdbg};
  display: inline-block;
  padding: 0;
  margin: 0 0 12px;
}
.zns-err { color: #ff5555; }
.zns-link {
  font: inherit;
  color: ${v.link};
  text-decoration: none;
}
.zns-link:hover { text-decoration: underline; }
.zns-vga-scroll {
  margin-top: 16px;
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: anywhere;
  overflow-y: auto;
  max-height: 85vh;
}`
}

function znslink(href, label) {
  return `<a class="zns-link" href="${escapehtml(href)}">${escapehtml(label)}</a>`
}

function buildznsvgapage({ title, bodyhtml, scrollbody }) {
  const v = ZNS_VGA_HTML
  const titlehtml = escapehtml(title)
  const scroll = scrollbody
    ? `<div class="zns-vga zns-vga-scroll">${scrollbody}</div>`
    : ''
  const scrollclass = scrollbody ? ' zns-scroll' : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titlehtml}</title>
<style>
${buildznsvgastylesheet(v.bg)}
</style>
</head>
<body class="zns-page${scrollclass}">
${bodyhtml}
${scroll}
</body>
</html>`
}

function padterminalcenter(text, width) {
  const s = String(text ?? '')
  if (s.length >= width) {
    return s.slice(0, width)
  }
  const left = Math.floor((width - s.length) / 2)
  return ' '.repeat(left) + s + ' '.repeat(width - s.length - left)
}

function wrapterminallines(text, width) {
  const s = String(text ?? '')
  if (!s) {
    return [padterminalline('', width)]
  }
  const lines = []
  for (let i = 0; i < s.length; i += width) {
    lines.push(padterminalline(s.slice(i, i + width), width))
  }
  return lines
}

function buildznsterminalframe({ namespace, command, deeplink }) {
  const w = ZNS_EMAIL_INNER_WIDTH
  const inner = w - 2
  const top = `╔${'═'.repeat(w + 2)}╗`
  const header = `║ ${padterminalline('zed.cafe', 19)}${padterminalline('ZNS LOGIN', w - 19)} ║`
  const rule = `╠${'═'.repeat(w + 2)}╣`
  const blank = `║ ${padterminalline('', w)} ║`
  const finish = `║ ${padterminalline(`Finish login to ${namespace}`, w)} ║`
  const copyhint = `║ ${padterminalline('Copy into the zed.cafe terminal:', w)} ║`
  const cmdtop = `║  ┌${'─'.repeat(inner)}┐  ║`
  const cmdline = `║  │${padterminalcenter(command, inner)}│  ║`
  const cmdbot = `║  └${'─'.repeat(inner)}┘  ║`
  const openline = `║ ${padterminalline('> Open in zed.cafe', w)} ║`
  const linklines = wrapterminallines(deeplink, w).map((line) => `║ ${line} ║`)
  const hint1 = `║ ${padterminalline('Open on any device — phone, tablet, or', w)} ║`
  const hint2 = `║ ${padterminalline('desktop. Or copy the command above.', w)} ║`
  const bottom = `╚${'═'.repeat(w + 2)}╝`
  return [
    top,
    header,
    rule,
    blank,
    finish,
    blank,
    copyhint,
    blank,
    cmdtop,
    cmdline,
    cmdbot,
    blank,
    openline,
    blank,
    ...linklines,
    blank,
    hint1,
    hint2,
    bottom,
  ].join('\n')
}

function buildznscodeemail({ code, email, namespace, joinorigin }) {
  const command = `#zns ${code}`
  const subject = `${code} — finish login to ${namespace} on zed.cafe`
  const preheader = `Paste ${command} into the terminal or tap Open in zed.cafe`
  const query = new URLSearchParams({
    'zns-code': code,
    'zns-email': email,
    'zns-namespace': namespace,
  })
  const deeplink = `${joinorigin}/?${query.toString()}`
  const frame = buildznsterminalframe({
    namespace,
    command,
    deeplink,
  })
  const text = `${subject}\n\n${command}\n\nPaste into the zed.cafe terminal, or open:\n${deeplink}\n\n${frame}\n`
  const p = ZSS_PALETTE
  const ns = escapehtml(namespace)
  const cmd = escapehtml(command)
  const link = escapehtml(deeplink)
  const subjecthtml = escapehtml(subject)
  const preheaderhtml = escapehtml(preheader)
  const w = ZNS_EMAIL_INNER_WIDTH
  const inner = w - 2
  const gray = (s) => `<span style="color:${p.ltgray}">${s}</span>`
  const white = (s) => `<span style="color:${p.white}">${s}</span>`
  const htmlframe = [
    gray(`╔${'═'.repeat(w + 2)}╗`),
    `${gray('║ ')}<span style="color:${p.blue}">zed.cafe</span>${gray(`${' '.repeat(19 - 'zed.cafe'.length)}${padterminalline('ZNS LOGIN', w - 19)} ║`)}`,
    gray(`╠${'═'.repeat(w + 2)}╣`),
    gray(`║ ${padterminalline('', w)} ║`),
    `${gray('║ ')}${white(padterminalline(`Finish login to ${ns}`, w))}${gray(' ║')}`,
    gray(`║ ${padterminalline('', w)} ║`),
    `${gray('║ ')}${white(padterminalline('Copy into the zed.cafe terminal:', w))}${gray(' ║')}`,
    gray(`║ ${padterminalline('', w)} ║`),
    gray(`║  ┌${'─'.repeat(inner)}┐  ║`),
    `${gray('║  │')}<span style="color:${p.green};background:${p.black}">${padterminalcenter(cmd, inner)}</span>${gray('│  ║')}`,
    gray(`║  └${'─'.repeat(inner)}┘  ║`),
    gray(`║ ${padterminalline('', w)} ║`),
    `${gray('║  ')}<a href="${link}" style="color:${p.cyan};text-decoration:none">&gt; Open in zed.cafe</a>${gray(`${padterminalline('', w - 18)} ║`)}`,
    gray(`║ ${padterminalline('', w)} ║`),
    ...wrapterminallines(deeplink, w).map((line, i) => {
      const chunk = deeplink.slice(i * w, i * w + w)
      return `${gray('║ ')}<a href="${link}" style="color:${p.cyan};text-decoration:none">${escapehtml(chunk)}</a>${gray(`${padterminalline('', w - chunk.length)} ║`)}`
    }),
    gray(`║ ${padterminalline('', w)} ║`),
    `${gray('║ ')}<span style="color:${p.yellow}">${padterminalline('Open on any device — phone, tablet, or', w)}</span>${gray(' ║')}`,
    `${gray('║ ')}<span style="color:${p.yellow}">${padterminalline('desktop. Or copy the command above.', w)}</span>${gray(' ║')}`,
    gray(`╚${'═'.repeat(w + 2)}╝`),
  ].join('\n')
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subjecthtml}</title>
</head>
<body style="margin:0;padding:16px;background:${p.dkblue};color:${p.white};font-family:${ZSS_MONO};font-size:13px;line-height:1.45;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheaderhtml}</div>
<pre style="margin:0 auto;max-width:520px;padding:16px;background:${p.dkblue};white-space:pre-wrap;word-break:break-word;font-family:${ZSS_MONO};font-size:13px;line-height:1.45">${htmlframe}</pre>
</body>
</html>`
  return { subject, html, text }
}

function buildznsapexlanding({ joinorigin, tenantsuffix }) {
  const command = '#zns <email> <namespace>'
  const title = 'ZNS — zed.cafe namespace service'
  const exampleurl = `https://docs.${tenantsuffix}/algoscroll`
  const publishhint = `Publish to https://you.${tenantsuffix}/key`
  const cmdbox = znscmdbox(command)
  const decorinner = Math.max(
    36,
    'Namespace publishing for zed.cafe'.length,
    publishhint.length,
    exampleurl.length,
    '> Open zed.cafe'.length,
    'zed.cafe'.length + 'ZNS'.length + 1,
  )
  const frameopen = [
    znsframetop(decorinner),
    znsheaderrow(decorinner, 'zed.cafe', 'ZNS'),
    znsframerule(decorinner),
  ].join('\n')
  const frameclose = znsframebottom(decorinner)

  const frame = [
    frameopen,
    '',
    'Namespace publishing for zed.cafe',
    '',
    'Log in from the terminal:',
    cmdbox,
    '',
    '> Open zed.cafe',
    '',
    publishhint,
    '',
    'Example:',
    exampleurl,
    '',
    frameclose,
  ].join('\n')

  const bodyhtml = `<article class="zns-vga">
${znsartpre(frameopen)}
<p class="zns-text">Namespace publishing for zed.cafe</p>
<p class="zns-text">Log in from the terminal:</p>
${znsartpre(cmdbox, 'zns-cmdbox')}
<p>${znslink(joinorigin, '> Open zed.cafe')}</p>
<p class="zns-hint">${escapehtml(publishhint)}</p>
<p class="zns-text">Example:</p>
<p>${znslink(exampleurl, exampleurl)}</p>
${znsartpre(frameclose)}
</article>`

  const html = buildznsvgapage({ title, bodyhtml })
  return { title, frame, html }
}

function rendertenantmarkdownline(line) {
  const escaped = escapehtml(line)
  if (line.startsWith('## ')) {
    return `<span class="zns-text">${escaped}</span>`
  }
  if (line.startsWith('!')) {
    return `<span class="zns-cmd">${escaped}</span>`
  }
  return `<span class="zns-text">${escaped}</span>`
}

function rendertenantmarkdown(markdown) {
  return String(markdown ?? '')
    .split('\n')
    .map(rendertenantmarkdownline)
    .join('\n')
}

function buildznstenantscrollhtml({
  namespace,
  key,
  markdown,
  notfound,
  tenantsuffix: suffix,
}) {
  const tenantsfx = suffix ?? ZNS_TENANT_SUFFIX_DEFAULT
  const host = `${namespace}.${tenantsfx}`
  const pathlabel = `${host} / ${key}`
  const pagetitle = notfound
    ? `Not found — ${key}`
    : `${key} — ${host}`
  const decorinner = Math.max(
    32,
    pathlabel.length,
    'zed.cafe'.length + namespace.length + 1,
  )
  const frameopen = [
    znsframetop(decorinner),
    znsheaderrow(decorinner, 'zed.cafe', namespace),
    znsframerule(decorinner),
    znsframerow(pathlabel, decorinner),
    znsframebottom(decorinner),
  ].join('\n')
  const bodyhtml = `<article class="zns-vga">
${znsartpre(frameopen)}
</article>`
  const content = notfound
    ? `<span class="zns-err">doc not found</span>\n<span class="zns-text">${escapehtml(key)}</span>`
    : rendertenantmarkdown(markdown)
  const html = buildznsvgapage({
    title: pagetitle,
    bodyhtml,
    scrollbody: content,
  })
  return { title: pagetitle, html }
}

function buildznstenantindexhtml({ namespace, tenantsuffix: suffix, entries }) {
  const tenantsfx = suffix ?? ZNS_TENANT_SUFFIX_DEFAULT
  const host = `${namespace}.${tenantsfx}`
  const pagetitle = `${namespace} — ${host}`
  const decorinner = Math.max(
    32,
    host.length,
    'zed.cafe'.length + namespace.length + 1,
  )
  const frameopen = [
    znsframetop(decorinner),
    znsheaderrow(decorinner, 'zed.cafe', namespace),
    znsframerule(decorinner),
    znsframerow(host, decorinner),
    znsframebottom(decorinner),
  ].join('\n')
  const bykind = new Map(ZNS_KIND_ORDER.map((kind) => [kind, []]))
  for (const entry of entries) {
    const bucket = bykind.get(entry.kind)
    if (bucket) {
      bucket.push(entry)
    }
  }
  let listhtml = ''
  if (!entries.length) {
    listhtml = '<p class="zns-muted">no keys published</p>'
  } else {
    for (const kind of ZNS_KIND_ORDER) {
      const group = bykind.get(kind) ?? []
      if (!group.length) {
        continue
      }
      listhtml += `<p class="zns-hint">${escapehtml(kind)}</p>\n`
      for (const entry of group) {
        listhtml += `<p>${znslink(`/${entry.key}`, entry.key)}</p>\n`
      }
    }
  }
  const bodyhtml = `<article class="zns-vga">
${znsartpre(frameopen)}
${listhtml}</article>`
  const html = buildznsvgapage({ title: pagetitle, bodyhtml })
  return { title: pagetitle, html }
}

function handleapexlanding(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null
  }
  const { html } = buildznsapexlanding({
    joinorigin: joinorigin(env),
    tenantsuffix: tenantsuffix(env),
  })
  const headers = {
    ...tenantcorsheaders,
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'X-Robots-Tag': 'noindex',
  }
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers })
  }
  return new Response(html, { status: 200, headers })
}

async function sendznscodeemail(apikey, email, code, namespace, joinorigin) {
  const { subject, html, text } = buildznscodeemail({
    code,
    email,
    namespace,
    joinorigin,
  })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apikey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'zed.cafe <login@zns.zed.cafe>',
      to: email,
      subject,
      html,
      text,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`resend ${res.status}: ${body}`)
  }
}

function parsenamespace(hostname, env) {
  const suffix = `.${tenantsuffix(env)}`
  if (!hostname.endsWith(suffix)) {
    return null
  }
  const ns = hostname.slice(0, -suffix.length).toLowerCase()
  if (!ns || ns.includes('.')) {
    return null
  }
  return ns
}

function publicpathkey(pathname) {
  const decoded = decodeURIComponent(pathname)
  const trimmed = decoded.replace(/^\/+/, '').split('/')[0] ?? ''
  return trimmed ? trimmed.toLowerCase() : ''
}

async function handlelogin(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const namespace = flatstr(formdata.get('namespace'))
  if (!email || !validatenamespace(namespace)) {
    return new Response(
      JSON.stringify({ message: 'invalid email or namespace' }),
      {
        status: 400,
        headers: corsheaders,
      },
    )
  }
  const nskey = nsstoragekey(namespace)
  const nsentry = await env.zns.getWithMetadata(nskey)
  if (nsentry.metadata?.email && nsentry.metadata.email !== email) {
    return new Response(
      JSON.stringify({
        message: `namespace ${namespace} is in use by another account`,
      }),
      { status: 403, headers: corsheaders },
    )
  }
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  if (
    userentry?.metadata?.namespace &&
    userentry.metadata.namespace !== namespace
  ) {
    return new Response(
      JSON.stringify({ message: `incorrect namespace for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  const code = [
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
  ].join('')
  await env.zns.put(ukey, '', {
    metadata: { namespace, code },
  })
  try {
    await sendznscodeemail(
      env.RESEND_API_KEY,
      email,
      code,
      namespace,
      joinorigin(env),
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ message: String(err?.message ?? err) }),
      {
        status: 502,
        headers: corsheaders,
      },
    )
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handlecode(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const code = flatstr(formdata.get('code'))
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  if (!userentry?.metadata?.code) {
    return new Response(
      JSON.stringify({ message: `no pending login for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  if (userentry.metadata.code !== code) {
    return new Response(
      JSON.stringify({ message: `incorrect code for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  const namespace = userentry.metadata.namespace
  if (!validatenamespace(namespace)) {
    return new Response(
      JSON.stringify({ message: 'invalid namespace on account' }),
      {
        status: 400,
        headers: corsheaders,
      },
    )
  }
  const nskey = nsstoragekey(namespace)
  const nsentry = await env.zns.getWithMetadata(nskey)
  if (nsentry.metadata?.email && nsentry.metadata.email !== email) {
    return new Response(
      JSON.stringify({
        message: `namespace ${namespace} is in use by another account; use #zns restart`,
      }),
      { status: 403, headers: corsheaders },
    )
  }
  await env.zns.put(nskey, '', { metadata: { email } })
  const token = gentoken()
  await env.zns.put(ukey, '', {
    metadata: { namespace, token },
  })
  return new Response(JSON.stringify({ success: true, token }), {
    status: 200,
    headers: corsheaders,
  })
}

async function verifytokenandnamespace(env, email, token) {
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  const stored = userentry.metadata?.token ?? ''
  if (!stored || !timingstringequal(stored, token)) {
    return { ok: false, message: 'invalid email or token' }
  }
  const namespace = userentry.metadata?.namespace
  if (!namespace || !validatenamespace(namespace)) {
    return { ok: false, message: 'account has no namespace' }
  }
  return { ok: true, namespace }
}

async function handleset(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const pathkey = flatstr(formdata.get('key'))
  const rawvalue = formdata.get('value')
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  if (!validatepathkey(pathkey)) {
    return new Response(JSON.stringify({ message: 'invalid key' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  if (pathkey === ZNS_PEER_KEY) {
    if (!validatepeerid(String(rawvalue ?? '').trim())) {
      return new Response(JSON.stringify({ message: 'invalid peer id' }), {
        status: 400,
        headers: corsheaders,
      })
    }
    const peerid = String(rawvalue).trim()
    await env.zns.put(pairstoragekey(namespace, pathkey), peerid, {
      metadata: { kind: 'peer', updatedAt: Date.now() },
    })
  } else {
    const hash = normalizebytesvalue(rawvalue)
    if (hash) {
      await env.zns.put(pairstoragekey(namespace, pathkey), hash, {
        metadata: { kind: 'bytes', updatedAt: Date.now() },
      })
    } else {
      const text = validatetextvalue(rawvalue)
      if (!text) {
        return new Response(
          JSON.stringify({ message: 'invalid bytes hash or text content' }),
          {
            status: 400,
            headers: corsheaders,
          },
        )
      }
      await env.zns.put(pairstoragekey(namespace, pathkey), text, {
        metadata: { kind: 'text', updatedAt: Date.now() },
      })
    }
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handlelist(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  const prefix = `pair:${namespace}:`
  const result = await env.zns.list({ prefix })
  const names = result.keys.map((k) => k.name)
  if (!names.length) {
    return new Response(JSON.stringify({ success: true, list: [] }), {
      status: 200,
      headers: corsheaders,
    })
  }
  const rows = await Promise.all(
    names.map((name) => env.zns.getWithMetadata(name)),
  )
  const list = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const row = rows[i]
    const shortkey = name.slice(prefix.length)
    list.push({
      key: shortkey,
      value: row?.value ?? '',
      metadata: row?.metadata ?? {},
    })
  }
  return new Response(JSON.stringify({ success: true, list }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handledelete(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const pathkey = flatstr(formdata.get('key'))
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  if (!validatepathkey(pathkey)) {
    return new Response(JSON.stringify({ message: 'invalid key' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  await env.zns.delete(pairstoragekey(namespace, pathkey))
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function readpair(env, namespace, pathkey) {
  const row = await env.zns.getWithMetadata(pairstoragekey(namespace, pathkey))
  const stored = row?.value
  if (stored == null || stored === '') {
    return null
  }
  return { stored, metadata: row?.metadata ?? {} }
}

function tenantscrollresponse(request, env, namespace, pathkey, opts) {
  const { html } = buildznstenantscrollhtml({
    namespace,
    key: pathkey,
    markdown: opts.markdown,
    notfound: opts.notfound,
    tenantsuffix: tenantsuffix(env),
  })
  const headers = {
    ...tenantcorsheaders,
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'X-Robots-Tag': 'noindex',
  }
  if (request.method === 'HEAD') {
    return new Response(null, { status: opts.status, headers })
  }
  return new Response(html, { status: opts.status, headers })
}

async function listtenantkvkeys(env, namespace) {
  const prefix = `pair:${namespace}:`
  const result = await env.zns.list({ prefix })
  const entries = []
  for (const keyobj of result.keys) {
    const shortkey = keyobj.name.slice(prefix.length)
    if (!validatepathkey(shortkey)) {
      continue
    }
    const row = await env.zns.getWithMetadata(keyobj.name)
    const stored = row?.value ?? ''
    const metadata = row?.metadata ?? {}
    const kind = resolvepairkind(shortkey, stored, metadata)
    entries.push({ key: shortkey, kind })
  }
  return entries
}

function sorttenantkeys(entries) {
  return [...entries].sort((a, b) => {
    const kinddelta =
      ZNS_KIND_ORDER.indexOf(a.kind) - ZNS_KIND_ORDER.indexOf(b.kind)
    if (kinddelta !== 0) {
      return kinddelta
    }
    return a.key.localeCompare(b.key)
  })
}

function tenantindexresponse(request, env, namespace, entries) {
  const { html } = buildznstenantindexhtml({
    namespace,
    tenantsuffix: tenantsuffix(env),
    entries,
  })
  const headers = {
    ...tenantcorsheaders,
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'X-Robots-Tag': 'noindex',
  }
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers })
  }
  return new Response(html, { status: 200, headers })
}

async function handletenantindex(request, env, namespace) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 })
  }
  let entries = await listtenantkvkeys(env, namespace)
  entries = sorttenantkeys(entries)
  return tenantindexresponse(request, env, namespace, entries)
}

async function handleread(request, env) {
  const formdata = await request.formData()
  const namespace = flatstr(formdata.get('namespace'))
  const pathkey = flatstr(formdata.get('key'))
  if (!validatenamespace(namespace)) {
    return new Response(JSON.stringify({ message: 'invalid namespace' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  if (!validatepathkey(pathkey)) {
    return new Response(JSON.stringify({ message: 'invalid key' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const row = await readpair(env, namespace, pathkey)
  if (!row) {
    return new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
      headers: corsheaders,
    })
  }
  return new Response(
    JSON.stringify({
      success: true,
      key: pathkey,
      value: row.stored,
      metadata: row.metadata,
    }),
    { status: 200, headers: corsheaders },
  )
}

async function handletenantread(request, env, namespace) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 })
  }
  const url = new URL(request.url)
  const pathkey = publicpathkey(url.pathname)
  if (!pathkey) {
    return handletenantindex(request, env, namespace)
  }
  if (!validatepathkey(pathkey)) {
    return new Response('not found', { status: 404 })
  }
  const row = await readpair(env, namespace, pathkey)
  if (row) {
    const { stored, metadata } = row
    const kind = resolvepairkind(pathkey, stored, metadata)
    if (kind === 'text') {
      return tenantscrollresponse(request, env, namespace, pathkey, {
        markdown: stored,
        notfound: false,
        status: 200,
      })
    }
    let location
    if (kind === 'peer') {
      location = `${joinorigin(env)}/join/#${stored}`
    } else if (kind === 'bytes') {
      location = `${bytesorigin(env)}/${stored}`
    } else {
      return new Response('not found', { status: 404 })
    }
    return new Response(null, {
      status: 302,
      headers: { Location: location },
    })
  }
  if (namespace === ZNS_DOCS_NAMESPACE) {
    return tenantscrollresponse(request, env, namespace, pathkey, {
      markdown: '',
      notfound: true,
      status: 404,
    })
  }
  return new Response('not found', { status: 404 })
}

export {
  buildznsapexlanding,
  buildznstenantindexhtml,
  buildznstenantscrollhtml,
  buildznsvgastylesheet,
  buildznsvgapage,
  sorttenantkeys,
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const rawhost = url.hostname
    const hostname = rawhost.toLowerCase()
    if (rawhost !== hostname) {
      const namespace = parsenamespace(hostname, env)
      if (namespace && validatenamespace(namespace)) {
        url.hostname = hostname
        return Response.redirect(url.toString(), 301)
      }
    }
    const apex = apexhost(env)

    if (hostname === apex) {
      const { pathname } = url
      if (request.method === 'POST') {
        switch (pathname) {
          case '/api/login':
            return handlelogin(request, env)
          case '/api/code':
            return handlecode(request, env)
          case '/api/set':
            return handleset(request, env)
          case '/api/list':
            return handlelist(request, env)
          case '/api/read':
            return handleread(request, env)
          case '/api/delete':
            return handledelete(request, env)
          default:
            break
        }
      }
      if (pathname === '/') {
        const landing = handleapexlanding(request, env)
        if (landing) {
          return landing
        }
      }
      return new Response('not found', { status: 404, headers: corsheaders })
    }

    const namespace = parsenamespace(hostname, env)
    if (namespace && validatenamespace(namespace)) {
      return handletenantread(request, env, namespace)
    }

    return new Response('not found', { status: 404 })
  },
}
