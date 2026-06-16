/** zss/feature/palette.ts — ZZT 16-color palette (hex used in login email) */
export const ZSS_PALETTE = {
  black: '#000000',
  dkblue: '#00002a',
  ltgray: '#2a2a2a',
  blue: '#15153f',
  green: '#153f15',
  cyan: '#153f3f',
  yellow: '#3f3f15',
  white: '#3f3f3f',
}

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

export function buildznsterminalframe({ namespace, command, deeplink }) {
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

/** Colored line segments for SVG / PNG rasterization. */
export function buildznsemailcardsegments({ namespace, command, deeplink }) {
  const p = ZSS_PALETTE
  const w = ZNS_EMAIL_INNER_WIDTH
  const inner = w - 2
  const gray = (text) => [{ text, fill: p.ltgray }]
  const white = (text) => [{ text, fill: p.white }]
  const linklines = wrapterminallines(deeplink, w)
  return [
    gray(`╔${'═'.repeat(w + 2)}╗`),
    [
      { text: '║ ', fill: p.ltgray },
      { text: 'zed.cafe', fill: p.blue },
      { text: `${' '.repeat(19 - 'zed.cafe'.length)}${padterminalline('ZNS LOGIN', w - 19)} ║`, fill: p.ltgray },
    ],
    gray(`╠${'═'.repeat(w + 2)}╣`),
    gray(`║ ${padterminalline('', w)} ║`),
    [
      { text: '║ ', fill: p.ltgray },
      { text: padterminalline(`Finish login to ${namespace}`, w), fill: p.white },
      { text: ' ║', fill: p.ltgray },
    ],
    gray(`║ ${padterminalline('', w)} ║`),
    [{ text: '║ ', fill: p.ltgray }, { text: padterminalline('Copy into the zed.cafe terminal:', w), fill: p.white }, { text: ' ║', fill: p.ltgray }],
    gray(`║ ${padterminalline('', w)} ║`),
    gray(`║  ┌${'─'.repeat(inner)}┐  ║`),
    [{ text: '║  │', fill: p.ltgray }, { text: padterminalcenter(command, inner), fill: p.green, background: p.black }, { text: '│  ║', fill: p.ltgray }],
    gray(`║  └${'─'.repeat(inner)}┘  ║`),
    gray(`║ ${padterminalline('', w)} ║`),
    [{ text: '║  ', fill: p.ltgray }, { text: '> Open in zed.cafe', fill: p.cyan }, { text: padterminalline('', w - 18), fill: p.ltgray }, { text: '║', fill: p.ltgray }],
    gray(`║ ${padterminalline('', w)} ║`),
    ...linklines.map((line) => [
      { text: '║ ', fill: p.ltgray },
      { text: line.trimEnd(), fill: p.cyan },
      { text: padterminalline('', w - line.trimEnd().length), fill: p.ltgray },
      { text: '║', fill: p.ltgray },
    ]),
    gray(`║ ${padterminalline('', w)} ║`),
    [{ text: '║ ', fill: p.ltgray }, { text: padterminalline('Open on any device — phone, tablet, or', w), fill: p.yellow }, { text: ' ║', fill: p.ltgray }],
    [{ text: '║ ', fill: p.ltgray }, { text: padterminalline('desktop. Or copy the command above.', w), fill: p.yellow }, { text: ' ║', fill: p.ltgray }],
    gray(`╚${'═'.repeat(w + 2)}╝`),
  ]
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
  const p = ZSS_PALETTE
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
<a href="${link}" style="display:inline-block;background:${p.cyan};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:4px;">Open in zed.cafe</a>
</td></tr>
<tr><td align="center" style="padding:0;font-family:Courier New,Courier,monospace;font-size:13px;color:#444;">
Or paste in terminal: ${cmd}
</td></tr>
</table>
</body>
</html>`
}
