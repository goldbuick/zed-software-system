/** Ops-style status labels burned into the compositor HUD (ASCII only). */

export type MQ_HUD_STATE = {
  phase: string
  detail: string
  secondary: string
}

const FONT = '16px "IBM EGA 8x14", ui-monospace, "Courier New", monospace'
const GREEN = '#55ff55'
const CYAN = '#55ffff'
const YELLOW = '#ffff55'
const RED = '#ff5555'
const WHITE = '#ffffff'
const BAR_BG = 'rgba(0, 0, 0, 0.72)'

const EMPTY_HUD: MQ_HUD_STATE = {
  phase: '',
  detail: '',
  secondary: '',
}

let hudstate: MQ_HUD_STATE = { ...EMPTY_HUD }

export function readhudstate(): MQ_HUD_STATE {
  return hudstate
}

export function sethudstate(
  phase: string,
  detail?: string,
  secondary?: string,
) {
  hudstate = {
    phase: String(phase || ''),
    detail: String(detail || ''),
    secondary: String(secondary || ''),
  }
}

export function clearhudsecondary() {
  hudstate = {
    phase: hudstate.phase,
    detail: hudstate.detail,
    secondary: '',
  }
}

/** Map helper phase strings to short workstatus-like labels. */
export function hudphaselabel(phase: string, detail?: string): string {
  const status = String(phase || '')
  if (status === 'downloading') {
    return 'media fetch'
  }
  if (status === 'extracting') {
    return 'media extract'
  }
  if (status === 'download-progress') {
    const parts = String(detail || '').split('|')
    const pct = Number(parts[0])
    if (Number.isFinite(pct)) {
      return pct >= 99 ? 'media process' : 'media ' + Math.round(pct) + '%'
    }
    return 'media fetch'
  }
  if (status === 'transcoding') {
    const pct = Number(detail)
    if (Number.isFinite(pct) && pct > 0) {
      return 'media process ' + Math.round(pct) + '%'
    }
    return 'media process'
  }
  if (status === 'buffering') {
    return 'media buffer'
  }
  if (status === 'playing') {
    return 'media playing'
  }
  if (status === 'error') {
    return 'media error'
  }
  if (status === 'waiting' || status === 'waiting-for-url') {
    return 'media waiting'
  }
  if (status === 'ready') {
    return 'media ready'
  }
  if (status === 'connected') {
    return 'media connected'
  }
  if (status === 'starting') {
    return 'media starting'
  }
  if (status === 'disconnected') {
    return 'media disconnected'
  }
  if (status === 'idle') {
    return 'media idle'
  }
  if (!status) {
    return ''
  }
  return 'media ' + status
}

function labelcolor(phase: string): string {
  if (phase === 'error') {
    return RED
  }
  if (phase === 'playing') {
    return GREEN
  }
  if (
    phase === 'downloading' ||
    phase === 'extracting' ||
    phase === 'transcoding' ||
    phase === 'buffering' ||
    phase === 'download-progress'
  ) {
    return YELLOW
  }
  return CYAN
}

function truncate(text: string, maxlen: number) {
  const s = String(text || '')
  if (s.length <= maxlen) {
    return s
  }
  return s.slice(0, Math.max(0, maxlen - 3)) + '...'
}

export function drawhud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state?: MQ_HUD_STATE,
) {
  const current = state || hudstate
  const phase = current.phase
  const label = hudphaselabel(phase, current.detail)
  if (!label && !current.detail && !current.secondary) {
    return
  }

  const pad = 10
  const lineh = 20
  const lines: { text: string; color: string }[] = []
  if (label) {
    lines.push({ text: label, color: labelcolor(phase) })
  }
  if (current.detail) {
    let detail = current.detail
    if (phase === 'download-progress') {
      const parts = detail.split('|')
      const pct = Number(parts[0])
      const eta = parts[1] ? String(parts[1]).trim() : ''
      if (Number.isFinite(pct)) {
        detail = Math.round(pct) + '%' + (eta ? ' eta ' + eta : '')
      }
    } else if (phase === 'transcoding' && Number.isFinite(Number(detail))) {
      detail = Math.round(Number(detail)) + '%'
    }
    lines.push({ text: truncate(detail, 56), color: WHITE })
  }
  if (current.secondary) {
    lines.push({ text: truncate(current.secondary, 56), color: GREEN })
  }
  if (!lines.length) {
    return
  }

  const barh = pad * 2 + lines.length * lineh
  const bary = height - barh
  ctx.fillStyle = BAR_BG
  ctx.fillRect(0, bary, width, barh)
  ctx.font = FONT
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillStyle = lines[i].color
    ctx.fillText(lines[i].text, pad, bary + pad + i * lineh)
  }
}
