/**
 * ZNS: email + OTP login, namespace claim, long-lived token, KV pairs.
 * API reference: ops/infra/README.md#zns-net-zns-workerjs
 */

import { ZNS_VGA_FONT_DATA_URI } from './generated/zns-vga-font.js'
import { buildznsdotbkgcss } from './zns-dotbkg.js'
import {
  pngbytestobase64,
  reademailcardfontbytes,
  renderemailcardpngwasm,
} from './zns-email-card-png-wasm.js'
import { buildznsemailcardsvg } from './zns-email-card-svg.js'
import { buildznscodeemailhtml, buildznscodemeta } from './zns-email-card.js'
import {
  measuredrawnwidth,
  scrollsourceisrawzss,
  scrollsourceisscrollcodepage,
  textformatlinehtml,
  zederrorlinehtml,
  zedopenitznslinkrowhtml,
  zedscrollhtml,
  zedtapehtml,
  zedtaperowshtml,
  zedzsshtml,
  znsrowhtml,
  zsssectionlines,
} from './zns-zedhtml.js'

const ZNS_PEER_KEY = 'peer'
const ZNS_DOCS_NAMESPACE = 'docs'
const ZNS_APEX_DEFAULT = 'at.zed.cafe'
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

const ZNS_KIND_ORDER = ['peer', 'bytes', 'text']

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

function isapexhost(hostname, env) {
  return hostname === apexhost(env)
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

const ZNS_VGA_FONT = "'IBM EGA 8x14', ui-monospace, 'Courier New', monospace"

/** Native IBM EGA 8×14 cell (int10h webfont em = 14px line height). */
const ZNS_CELL_W = 8
const ZNS_CELL_H = 14
const ZNS_FONT_SIZE = 14
/** 2× display cells (in-app parity) on wide viewports. Narrow screens use native 8×14 (14px). */
const ZNS_DISPLAY_SCALE = 2
const ZNS_NARROW_MAX_PX = 640
const ZNS_DISPLAY_FONT_SIZE = ZNS_FONT_SIZE * ZNS_DISPLAY_SCALE
const ZNS_DISPLAY_LINE_HEIGHT = ZNS_CELL_H * ZNS_DISPLAY_SCALE
const ZNS_DISPLAY_CELL_W = ZNS_CELL_W * ZNS_DISPLAY_SCALE
const ZNS_DISPLAY_CELL_H = ZNS_CELL_H * ZNS_DISPLAY_SCALE

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
  const w = measuredrawnwidth(s)
  if (w >= width) {
    return s.slice(0, width)
  }
  return s + ' '.repeat(width - w)
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

function znsframebordertape(kind, decorinner) {
  const span = decorinner + 2
  const h = ZNS_CP437.H.repeat(span)
  const chars =
    kind === 'top'
      ? `${ZNS_CP437.TL}${h}${ZNS_CP437.TR}`
      : kind === 'bottom'
        ? `${ZNS_CP437.BL}${h}${ZNS_CP437.BR}`
        : `${ZNS_CP437.TLR}${h}${ZNS_CP437.TRR}`
  return `$cyan${chars}`
}

function znsframeheadertape(decorinner, left, right, rightcolor = 'yellow') {
  const gap = Math.max(1, decorinner - left.length - right.length)
  const pad = ' '.repeat(gap)
  return `$ltgray${ZNS_CP437.V} $cyan${left}${pad}$${rightcolor}${right} $ltgray${ZNS_CP437.V}`
}

function znsframebodytape(decorinner, tape) {
  const padded = padterminalline(tape, decorinner)
  return `$ltgray${ZNS_CP437.V} ${padded} $ltgray${ZNS_CP437.V}`
}

function znsframepathtape(decorinner, host, key) {
  const inner = `$ltgray${host}$white / $yellow${key}`
  return znsframebodytape(decorinner, inner)
}

function znsframepathlinkrowhtml(decorinner, host, key, hosthref) {
  const pathtape = `$ltgray${host}$white / $yellow${key}`
  const pad = Math.max(0, decorinner - measuredrawnwidth(pathtape))
  const barleft = textformatlinehtml(`$ltgray${ZNS_CP437.V} `)
  const hostlinked = `<a class="zns-link" href="${escapehtml(hosthref)}">${textformatlinehtml(`$ltgray${host}`)}</a>`
  const sep = textformatlinehtml('$white / ')
  const keypart = textformatlinehtml(`$yellow${key}`)
  const barright = textformatlinehtml(
    ` ${' '.repeat(pad)}$ltgray${ZNS_CP437.V}`,
  )
  return znsrowhtml(`${barleft}${hostlinked}${sep}${keypart}${barright}`, '', {
    raw: true,
  })
}

/** Colored CP437 frame as strict-grid zns-tape rows (replaces flat zns-art header). */
function znsframehtml({
  decorinner,
  left,
  right,
  rightcolor = 'yellow',
  rows = [],
}) {
  const parts = [
    zedtaperowshtml(znsframebordertape('top', decorinner)),
    zedtaperowshtml(znsframeheadertape(decorinner, left, right, rightcolor)),
    zedtaperowshtml(znsframebordertape('rule', decorinner)),
  ]
  for (const row of rows) {
    if (row.host != null && row.key != null) {
      if (row.hosthref) {
        parts.push(
          znsframepathlinkrowhtml(decorinner, row.host, row.key, row.hosthref),
        )
      } else {
        parts.push(
          zedtaperowshtml(znsframepathtape(decorinner, row.host, row.key)),
        )
      }
      continue
    }
    if (typeof row === 'string') {
      parts.push(zedtaperowshtml(znsframebodytape(decorinner, `$white${row}`)))
      continue
    }
    const color = row.color ?? 'white'
    parts.push(
      zedtaperowshtml(znsframebodytape(decorinner, `$${color}${row.text}`)),
    )
  }
  parts.push(zedtaperowshtml(znsframebordertape('bottom', decorinner)))
  return `<div class="zns-tape zns-frame">${parts.join('')}</div>`
}

function znscmdbox(command) {
  const pad = 2
  const inner = command.length + pad * 2
  const top = `${ZNS_CP437.TL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.TR}`
  const mid =
    `${ZNS_CP437.V}` +
    ' '.repeat(pad) +
    command +
    ' '.repeat(pad) +
    `${ZNS_CP437.V}`
  const bottom = `${ZNS_CP437.BL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.BR}`
  return [top, mid, bottom].join('\n')
}

function znsartpre(text, extra = '') {
  const extrahtml = extra ? ` ${extra.trim()}` : ''
  return `<pre class="zns-vga zns-art${extrahtml}">${escapehtml(text)}</pre>`
}

/** Parity: zss/gadget/display/anim.ts — interval × 2 seconds per blink cycle. */
const ZNS_BLINK_CYCLE_S = (120 / 136) * 2

function buildznsvgastylesheet(bg) {
  const v = ZNS_VGA_HTML
  return `@font-face {
  font-family: 'IBM EGA 8x14';
  src: url('${ZNS_VGA_FONT_DATA_URI}') format('woff'),
       url('/fonts/IBMEGA8x14.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
html, body { min-height: 100%; }
body.zns-page {
  margin: 0;
  padding: 16px;
  --zns-dot-w: ${ZNS_CELL_W * ZNS_DISPLAY_SCALE}px;
  --zns-dot-h: ${ZNS_CELL_H * ZNS_DISPLAY_SCALE}px;
  color: ${v.text};
  box-sizing: border-box;
  font-family: ${ZNS_VGA_FONT};
  font-size: ${ZNS_FONT_SIZE}px;
  line-height: ${ZNS_CELL_H}px;
}
body.zns-page,
body.zns-page * {
  font-family: ${ZNS_VGA_FONT};
}
.zns-vga-root {
  --zns-fs: ${ZNS_DISPLAY_FONT_SIZE}px;
  --zns-lh: ${ZNS_DISPLAY_LINE_HEIGHT}px;
  font-size: var(--zns-fs);
  line-height: var(--zns-lh);
  width: max-content;
  max-width: none;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
}
@media screen and (max-width: ${ZNS_NARROW_MAX_PX}px) {
  body.zns-page {
    padding: 8px;
    --zns-dot-w: ${ZNS_CELL_W}px;
    --zns-dot-h: ${ZNS_CELL_H}px;
  }
  .zns-vga-root {
    --zns-fs: ${ZNS_FONT_SIZE}px;
    --zns-lh: ${ZNS_CELL_H}px;
  }
}
.zns-vga {
  margin: 0;
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
  line-height: inherit;
  letter-spacing: 0;
  font-weight: normal;
  font-style: normal;
  font-kerning: none;
  font-variant-ligatures: none;
  font-feature-settings: "kern" 0, "liga" 0, "calt" 0;
  font-synthesis: none;
  text-rendering: auto;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: none;
  font-smooth: never;
}
.zns-line {
  margin: 0;
  padding: 0;
  height: var(--zns-lh);
  min-height: var(--zns-lh);
  line-height: var(--zns-lh);
  display: block;
  overflow: visible;
  box-sizing: content-box;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  tab-size: 8;
  border: 0;
  background: transparent;
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
  color: inherit;
}
.zns-line span,
.zns-line a,
.zns-line button {
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
  line-height: var(--zns-lh);
  vertical-align: top;
  padding: 0;
  margin: 0;
}
.zns-tape-span {
  display: inline;
  vertical-align: top;
  padding: 0;
  margin: 0;
}
.zns-cell {
  display: inline-block;
  width: 1ch;
  height: var(--zns-lh);
  line-height: var(--zns-lh);
  vertical-align: top;
  overflow: hidden;
  padding: 0;
  margin: 0;
  box-sizing: content-box;
}
@keyframes zns-blink-fg {
  0%, 50% { color: var(--zns-fg); }
  50.01%, 100% { color: var(--zns-bg); }
}
.zns-tape-span.zns-blink,
.zns-cell.zns-blink {
  animation: zns-blink-fg ${ZNS_BLINK_CYCLE_S}s step-end infinite;
}
.zns-link {
  display: inline;
  vertical-align: top;
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
  line-height: var(--zns-lh);
  letter-spacing: 0;
  color: inherit;
  text-decoration: none;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
}
.zns-link:hover { text-decoration: underline; }
.zns-art {
  color: ${v.frame};
  margin: 0;
  padding: 0;
  white-space: pre;
  line-height: var(--zns-lh);
  font-size: inherit;
  font-family: ${ZNS_VGA_FONT};
  width: fit-content;
  max-width: 100%;
}
.zns-art.zns-cmdbox {
  color: ${v.command};
  background: ${v.cmdbg};
}
.zns-tape {
  margin: 0;
}
.zns-frame {
  margin-bottom: var(--zns-lh);
}
.zns-brand { color: ${v.brand}; }
.zns-text { color: ${v.text}; }
.zns-muted { color: ${v.muted}; }
.zns-hint { color: ${v.hint}; }
.zns-err { color: #ff5555; }
.zns-copy {
  display: inline;
  vertical-align: top;
  font-family: ${ZNS_VGA_FONT};
  font-size: inherit;
  line-height: var(--zns-lh);
  letter-spacing: 0;
  color: ${v.link};
  text-decoration: none;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.zns-copy:hover { text-decoration: underline; }
.zns-vga-scroll {
  margin-top: var(--zns-lh);
}
${buildznsdotbkgcss()}`
}

function znslink(href, label) {
  return `<a class="zns-link" href="${escapehtml(href)}">${escapehtml(label)}</a>`
}

function buildznsvgapage({ title, bodyhtml, scrollbody }) {
  const v = ZNS_VGA_HTML
  const titlehtml = escapehtml(title)
  const scroll = scrollbody
    ? `<div class="zns-vga-scroll">${scrollbody}</div>`
    : ''
  const copyscript = `<script>
document.body.addEventListener('click',function(e){
  var btn=e.target.closest('.zns-copy');
  if(!btn)return;
  var t=btn.getAttribute('data-copy')||'';
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}
});
</script>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<title>${titlehtml}</title>
<style>
${buildznsvgastylesheet(v.bg)}
</style>
</head>
<body class="zns-page">
<div class="zns-vga-root">
${bodyhtml}
${scroll}
</div>
${copyscript}
</body>
</html>`
}

async function buildznscodeemail({ code, email, namespace, joinorigin }) {
  const meta = buildznscodemeta({ code, email, namespace, joinorigin })
  const fontbytes = reademailcardfontbytes()
  const svg = buildznsemailcardsvg(
    {
      namespace: meta.namespace,
      command: meta.command,
      deeplink: meta.deeplink,
    },
    ZNS_VGA_FONT_DATA_URI,
  )
  const pngbytes = await renderemailcardpngwasm(svg, fontbytes)
  const pngb64 = pngbytestobase64(pngbytes)
  const html = buildznscodeemailhtml({
    subject: meta.subject,
    preheader: meta.preheader,
    deeplink: meta.deeplink,
    command: meta.command,
  })
  return { subject: meta.subject, html, text: meta.text, pngb64 }
}

function buildznsapexlanding({ joinorigin, tenantsuffix }) {
  const command = '#zns <email> <namespace>'
  const title = 'ZNS — zed.cafe namespace service'
  const tagline = 'Namespace publishing for zed.cafe'
  const exampleurl = `https://docs.${tenantsuffix}/algoscroll`
  const publishhint = `Publish to https://you.${tenantsuffix}/key`
  const cmdbox = znscmdbox(command)
  const decorinner = Math.max(
    36,
    tagline.length,
    publishhint.length,
    exampleurl.length,
    'zed.cafe'.length + 'ZNS'.length + 1,
  )
  const framehtml = znsframehtml({
    decorinner,
    left: 'zed.cafe',
    right: 'ZNS',
    rows: [{ text: tagline, color: 'green' }],
  })
  const tapeaftercmd = [
    '',
    `!openit inline ${joinorigin};> Open zed.cafe`,
    '',
    `$yellow${publishhint}`,
    '',
    '$whiteExample:',
    `!openit inline ${exampleurl};${exampleurl}`,
    '',
  ].join('\n')
  const frame = [
    znsframetop(decorinner),
    znsheaderrow(decorinner, 'zed.cafe', 'ZNS'),
    znsframerule(decorinner),
    znsframerow(tagline, decorinner),
    znsframebottom(decorinner),
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
  ].join('\n')
  const bodyhtml = `<article class="zns-vga">
${framehtml}
<div class="zns-tape">
${zedtaperowshtml('$whiteLog in from the terminal:')}
${znsrowhtml('', '', { raw: true })}
${znsartpre(cmdbox, 'zns-cmdbox')}
${zedtaperowshtml(tapeaftercmd, { tenantbase: '/' })}
</div>
</article>`

  const html = buildznsvgapage({ title, bodyhtml })
  return { title, frame, html }
}

function buildznstenantscrollhtml({
  namespace,
  key,
  markdown,
  zss,
  scrollcodepage,
  notfound,
  tenantsuffix: suffix,
}) {
  const tenantsfx = suffix ?? ZNS_TENANT_SUFFIX_DEFAULT
  const host = `${namespace}.${tenantsfx}`
  const pathlabel = `${host} / ${key}`
  const pagetitle = notfound ? `Not found — ${key}` : `${key} — ${host}`
  const decorinner = Math.max(
    32,
    pathlabel.length,
    'zed.cafe'.length + namespace.length + 1,
  )
  const framehtml = znsframehtml({
    decorinner,
    left: 'zed.cafe',
    right: namespace,
    rows: [{ host, key, hosthref: `https://${host}/` }],
  })
  const bodyhtml = `<article class="zns-vga">
${framehtml}
</article>`
  const content = notfound
    ? zederrorlinehtml('doc not found', key)
    : scrollcodepage
      ? zedscrollhtml(markdown, { tenantbase: '/' })
      : zss
        ? zedzsshtml(markdown, { tenantbase: '/' })
        : zedtapehtml(markdown, { tenantbase: '/' })
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
  const framehtml = znsframehtml({
    decorinner,
    left: 'zed.cafe',
    right: namespace,
    rows: [{ text: host, color: 'white' }],
  })
  const bykind = new Map(ZNS_KIND_ORDER.map((kind) => [kind, []]))
  for (const entry of entries) {
    const bucket = bykind.get(entry.kind)
    if (bucket) {
      bucket.push(entry)
    }
  }
  let listhtml = ''
  let rows = ''
  for (const kind of ZNS_KIND_ORDER) {
    const group = bykind.get(kind) ?? []
    rows += zedtaperowshtml(zsssectionlines(kind).join('\n'))
    if (!group.length) {
      rows += zedtaperowshtml('$dkpurple $gray(none)')
      continue
    }
    for (const entry of group) {
      rows += zedopenitznslinkrowhtml(entry.key, entry.key, {
        tenantbase: '/',
        newtab: kind === 'bytes' || kind === 'peer',
      })
    }
  }
  listhtml = `<div class="zns-tape">${rows}</div>`
  const bodyhtml = `<article class="zns-vga">
${framehtml}
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
  const { subject, html, text, pngb64 } = await buildznscodeemail({
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
      from: 'zed.cafe <login@at.zed.cafe>',
      to: email,
      subject,
      html,
      text,
      attachments: [
        {
          filename: 'zns-login.png',
          content: pngb64,
          content_id: 'zns-card',
        },
      ],
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
    zss: opts.zss,
    scrollcodepage: opts.scrollcodepage,
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
        scrollcodepage: scrollsourceisscrollcodepage(stored),
        zss: scrollsourceisrawzss(stored),
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
  buildznscodeemail,
  buildznstenantindexhtml,
  buildznstenantscrollhtml,
  buildznsvgastylesheet,
  buildznsvgapage,
  padterminalline,
  sorttenantkeys,
  znsframehtml,
  ZNS_CELL_H,
  ZNS_CELL_W,
  ZNS_DISPLAY_CELL_H,
  ZNS_DISPLAY_CELL_W,
  ZNS_DISPLAY_SCALE,
  ZNS_FONT_SIZE,
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if ((request.method === 'GET' || request.method === 'HEAD') && env.ASSETS) {
      const asset = await env.ASSETS.fetch(request)
      if (asset.status !== 404) {
        return asset
      }
    }
    const rawhost = url.hostname
    const hostname = rawhost.toLowerCase()
    if (rawhost !== hostname) {
      const namespace = parsenamespace(hostname, env)
      if (namespace && validatenamespace(namespace)) {
        url.hostname = hostname
        return Response.redirect(url.toString(), 301)
      }
    }
    if (isapexhost(hostname, env)) {
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
