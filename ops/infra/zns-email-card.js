/**
 * Login email card colors — same scaled ZZT palette as tenant pages (zns-palette.js).
 * Do not define a separate unscaled palette here.
 */
import {
  fghex,
  resolvebgindex,
  resolvefgindex,
} from './zns-palette.js'

/** Mirrors net-zns-worker ZNS_VGA_HTML tape tokens. */
export function buildznsemailpalette() {
  return {
    black: fghex(resolvefgindex('black')),
    dkblue: fghex(resolvebgindex('ondkblue')),
    ltgray: fghex(resolvefgindex('ltgray')),
    blue: fghex(resolvefgindex('blue')),
    green: fghex(resolvefgindex('green')),
    cyan: fghex(resolvefgindex('cyan')),
    yellow: fghex(resolvefgindex('yellow')),
    white: fghex(resolvefgindex('white')),
    purple: fghex(resolvefgindex('purple')),
  }
}

/** @deprecated use buildznsemailpalette() — kept for preview imports */
export const ZSS_PALETTE = buildznsemailpalette()

/** CP437 light box drawing — same as net-zns-worker ZNS_CP437 / at.zed.cafe frame. */
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

const OPENIT_ARROW = '\u25ba'

export const ZNS_EMAIL_INNER_WIDTH = 40
export const ZNS_EMAIL_FONT_SIZE = 14
export const ZNS_EMAIL_LINE_HEIGHT = 14
export const ZNS_EMAIL_PAD = 16
export const ZNS_EMAIL_CARD_WIDTH = 520

export function padterminalline(text, width) {
  const s = String(text ?? '')
  if (s.length >= width) {
    return s.slice(0, width)
  }
  return s + ' '.repeat(width - s.length)
}

export function padterminalcenter(text, width) {
  const s = String(text ?? '')
  if (s.length >= width) {
    return s.slice(0, width)
  }
  const left = Math.floor((width - s.length) / 2)
  return ' '.repeat(left) + s + ' '.repeat(width - s.length - left)
}

export function wrapterminallines(text, width) {
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

function znsemaildecorinner({ namespace, command }) {
  const tagline = `Finish login to ${namespace}`
  const cmdinner = command.length + 4
  return Math.max(
    36,
    tagline.length,
    'Log in from the terminal:'.length,
    cmdinner,
    'zed.cafe'.length + 'ZNS'.length + 1,
  )
}

function znsemailcmdboxlines(command) {
  const pad = 2
  const inner = command.length + pad * 2
  return {
    top: `${ZNS_CP437.TL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.TR}`,
    mid:
      `${ZNS_CP437.V}` +
      ' '.repeat(pad) +
      command +
      ' '.repeat(pad) +
      `${ZNS_CP437.V}`,
    bottom: `${ZNS_CP437.BL}${ZNS_CP437.H.repeat(inner)}${ZNS_CP437.BR}`,
  }
}

function cyancrule(text, p) {
  return [{ text, fill: p.cyan }]
}

function blankline(p) {
  return [{ text: ' ', fill: p.ltgray }]
}

function whiteline(text, p) {
  return [{ text, fill: p.white }]
}

function greenline(text, p) {
  return [{ text, fill: p.green }]
}

function znsemailframerow(content, decorinner, p, color = p.ltgray) {
  return [
    { text: `${ZNS_CP437.V} `, fill: p.ltgray },
    { text: padterminalline(content, decorinner), fill: color },
    { text: ` ${ZNS_CP437.V}`, fill: p.ltgray },
  ]
}

function znsemailheaderrow(decorinner, p) {
  const gap = Math.max(1, decorinner - 'zed.cafe'.length - 'ZNS'.length)
  return [
    { text: `${ZNS_CP437.V} `, fill: p.ltgray },
    { text: 'zed.cafe', fill: p.cyan },
    { text: ' '.repeat(gap), fill: p.ltgray },
    { text: 'ZNS', fill: p.yellow },
    { text: ` ${ZNS_CP437.V}`, fill: p.ltgray },
  ]
}

function znsemailopenitrow(label, p) {
  return [
    { text: `${OPENIT_ARROW} `, fill: p.purple },
    { text: 'OPENIT ', fill: p.yellow },
    { text: label, fill: p.white },
  ]
}

function znsemailopenitdeeplink(deeplink, width, p) {
  const prefixlen = OPENIT_ARROW.length + 1 + 'OPENIT '.length
  const lines = wrapterminallines(deeplink, Math.max(8, width - prefixlen))
  const rows = [
    [
      { text: `${OPENIT_ARROW} `, fill: p.purple },
      { text: 'OPENIT ', fill: p.yellow },
      { text: lines[0].trimEnd(), fill: p.white },
    ],
  ]
  const indent = ' '.repeat(prefixlen)
  for (let i = 1; i < lines.length; i++) {
    rows.push(whiteline(`${indent}${lines[i].trimEnd()}`, p))
  }
  return rows
}

/** Colored line segments for SVG / PNG rasterization (at.zed.cafe apex layout). */
export function buildznsemailcardsegments({ namespace, command, deeplink }) {
  const p = buildznsemailpalette()
  const decorinner = znsemaildecorinner({ namespace, command })
  const tagline = `Finish login to ${namespace}`
  const cmdbox = znsemailcmdboxlines(command)
  const openitlabel = '> Open zed.cafe'
  return [
    cyancrule(
      `${ZNS_CP437.TL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TR}`,
      p,
    ),
    znsemailheaderrow(decorinner, p),
    cyancrule(
      `${ZNS_CP437.TLR}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TRR}`,
      p,
    ),
    znsemailframerow(tagline, decorinner, p, p.green),
    cyancrule(
      `${ZNS_CP437.BL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.BR}`,
      p,
    ),
    blankline(p),
    whiteline('Log in from the terminal:', p),
    blankline(p),
    greenline(cmdbox.top, p),
    [{ text: cmdbox.mid, fill: p.green, background: p.black }],
    greenline(cmdbox.bottom, p),
    blankline(p),
    znsemailopenitrow(openitlabel, p),
    blankline(p),
    ...znsemailopenitdeeplink(deeplink, decorinner + 4, p),
  ]
}

export function buildznsterminalframe({ namespace, command, deeplink }) {
  const decorinner = znsemaildecorinner({ namespace, command })
  const tagline = `Finish login to ${namespace}`
  const cmdbox = znsemailcmdboxlines(command)
  const gap = Math.max(1, decorinner - 'zed.cafe'.length - 'ZNS'.length)
  const frame = [
    `${ZNS_CP437.TL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TR}`,
    `${ZNS_CP437.V} zed.cafe${' '.repeat(gap)}ZNS ${ZNS_CP437.V}`,
    `${ZNS_CP437.TLR}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.TRR}`,
    `${ZNS_CP437.V} ${padterminalline(tagline, decorinner)} ${ZNS_CP437.V}`,
    `${ZNS_CP437.BL}${ZNS_CP437.H.repeat(decorinner + 2)}${ZNS_CP437.BR}`,
    '',
    'Log in from the terminal:',
    '',
    cmdbox.top,
    cmdbox.mid,
    cmdbox.bottom,
    '',
    `${OPENIT_ARROW} OPENIT > Open zed.cafe`,
    '',
    `${OPENIT_ARROW} OPENIT ${deeplink}`,
    '',
  ].join('\n')
  return frame
}

export function buildznscodemeta({ code, email, namespace, joinorigin }) {
  const command = `#zns ${code}`
  const subject = `${code} — finish login to ${namespace} on zed.cafe`
  const preheader = `Paste ${command} into the terminal or tap Open in zed.cafe`
  const query = new URLSearchParams({
    'zns-code': code,
    'zns-email': email,
    'zns-namespace': namespace,
  })
  const deeplink = `${joinorigin}/?${query.toString()}`
  const frame = buildznsterminalframe({ namespace, command, deeplink })
  const text = `${subject}\n\n${command}\n\nPaste into the zed.cafe terminal, or open:\n${deeplink}\n\n${frame}\n`
  return { command, subject, preheader, deeplink, text, namespace, code }
}

export function escapehtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildznscodeemailhtml({ subject, preheader, deeplink, command }) {
  const p = buildznsemailpalette()
  const subjecthtml = escapehtml(subject)
  const preheaderhtml = escapehtml(preheader)
  const link = escapehtml(deeplink)
  const cmd = escapehtml(command)
  const alt = escapehtml(`Open zed.cafe — paste ${command}`)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subjecthtml}</title>
</head>
<body style="margin:0;padding:24px 16px;background:#f4f4f4;color:#222;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheaderhtml}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;">
<tr><td align="center" style="padding:0 0 16px 0;">
<a href="${link}" style="text-decoration:none;display:inline-block;">
<img src="cid:zns-card" width="${ZNS_EMAIL_CARD_WIDTH}" alt="${alt}" style="display:block;border:0;max-width:100%;height:auto;background:${p.dkblue};">
</a>
</td></tr>
<tr><td align="center" style="padding:0 0 12px 0;">
<a href="${link}" style="display:inline-block;background:${p.dkblue};color:${p.white};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:4px;">Open in zed.cafe</a>
</td></tr>
<tr><td align="center" style="padding:0;font-family:Courier New,Courier,monospace;font-size:13px;color:#444;">
Or paste in terminal: ${cmd}
</td></tr>
</table>
</body>
</html>`
}
