import {
  ZNS_EMAIL_CARD_WIDTH,
  ZNS_EMAIL_FONT_SIZE,
  ZNS_EMAIL_LINE_HEIGHT,
  ZNS_EMAIL_PAD,
  buildznsemailpalette,
  buildznsemailcardsegments,
} from './zns-email-card.js'
import { ZNS_DOT_BG, buildznsdotbkgemailpattern } from './zns-dotbkg.js'

const ZNS_CELL_W = 8

function escapetext(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function segmentwidth(segment) {
  return [...segment.text].length
}

function renderline(parts, y, fontfamily) {
  let x = ZNS_EMAIL_PAD
  const shapes = []
  const tspans = []
  for (const part of parts) {
    const w = segmentwidth(part) * ZNS_CELL_W
    if (part.background) {
      shapes.push(
        `<rect x="${x}" y="${y - ZNS_EMAIL_LINE_HEIGHT + 2}" width="${w}" height="${ZNS_EMAIL_LINE_HEIGHT}" fill="${part.background}"/>`,
      )
    }
    tspans.push(
      `<tspan x="${x}" fill="${part.fill}">${escapetext(part.text)}</tspan>`,
    )
    x += w
  }
  const textel = `<text y="${y}" font-family="${fontfamily}" font-size="${ZNS_EMAIL_FONT_SIZE}px" xml:space="preserve">${tspans.join('')}</text>`
  return `${shapes.join('')}${textel}`
}

export function buildznsemailcardsvg({ namespace, command, deeplink }, fontdatauri) {
  const segments = buildznsemailcardsegments({ namespace, command, deeplink })
  const linecount = segments.length
  const height =
    ZNS_EMAIL_PAD * 2 + linecount * ZNS_EMAIL_LINE_HEIGHT + ZNS_EMAIL_PAD
  const fontface = fontdatauri
    ? `@font-face{font-family:'IBM EGA 8x14';src:url('${fontdatauri}') format('woff');font-weight:normal;font-style:normal;}`
    : ''
  const fontfamily = fontdatauri ? 'IBM EGA 8x14' : 'Courier New'
  const pattern = buildznsdotbkgemailpattern()
  let y = ZNS_EMAIL_PAD + ZNS_EMAIL_LINE_HEIGHT
  const lines = []
  for (const parts of segments) {
    lines.push(renderline(parts, y, fontfamily))
    y += ZNS_EMAIL_LINE_HEIGHT
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ZNS_EMAIL_CARD_WIDTH}" height="${height}" viewBox="0 0 ${ZNS_EMAIL_CARD_WIDTH} ${height}">
<style>${fontface}</style>
<defs>${pattern}</defs>
<rect width="100%" height="100%" fill="${ZNS_DOT_BG}"/>
<rect width="100%" height="100%" fill="url(#zns-dot-pattern)"/>
${lines.join('\n')}
</svg>`
}

export function buildznsemailcardpreviewhtml(meta, fontdatauri) {
  const svg = buildznsemailcardsvg(
    {
      namespace: meta.namespace,
      command: meta.command,
      deeplink: meta.deeplink,
    },
    fontdatauri,
  )
  const link = meta.deeplink.replace(/"/g, '&quot;')
  const p = buildznsemailpalette()
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${meta.subject}</title>
<style>body{margin:0;padding:24px;background:#f4f4f4;font-family:Arial,sans-serif}</style>
</head><body>
<h1 style="font-size:14px;font-weight:normal;color:#666">${meta.subject}</h1>
<p style="font-size:12px;color:#888">Card preview (PNG uses same SVG). Tap targets below mirror production email HTML.</p>
<a href="${link}" style="display:inline-block;text-decoration:none">
${svg}
</a>
<p style="margin-top:16px"><a href="${link}" style="display:inline-block;background:${p.dkblue};color:${p.white};padding:12px 24px;text-decoration:none;font-weight:bold">Open in zed.cafe</a></p>
<p style="font-family:monospace;font-size:13px">Or paste: ${meta.command}</p>
</body></html>`
}
