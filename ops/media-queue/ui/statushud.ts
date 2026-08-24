/** Ops-style status labels burned into the compositor HUD (ASCII only). */

export type MQ_HUD_STATE = {
  phase: string
  detail: string
  secondary: string
  metalines: string[]
}

const FONT = '16px "IBM EGA 8x14", ui-monospace, "Courier New", monospace'
const CYAN = '#55ffff'
const YELLOW = '#ffff55'
const RED = '#ff5555'
const BAR_BG = 'rgba(0, 0, 0, 0.72)'
const PROGRESS_TRACK = 'rgba(0, 0, 0, 0.82)'
const PROGRESS_FILL = '#ff00aa'
const PROGRESS_EDGE = '#55ffff'
const PROGRESS_HEIGHT = 8

const EMPTY_HUD: MQ_HUD_STATE = {
  phase: '',
  detail: '',
  secondary: '',
  metalines: [],
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
    metalines: hudstate.metalines,
  }
}

export function sethudmetalines(lines: string[]) {
  const next: string[] = []
  if (Array.isArray(lines)) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = String(lines[i] || '').trim()
      if (line) {
        next.push(line)
      }
    }
  }
  hudstate = {
    phase: hudstate.phase,
    detail: hudstate.detail,
    secondary: hudstate.secondary,
    metalines: next,
  }
}

export function clearhudmetalines() {
  sethudmetalines([])
}

export function clearhudsecondary() {
  hudstate = {
    phase: hudstate.phase,
    detail: hudstate.detail,
    secondary: '',
    metalines: hudstate.metalines,
  }
}

/** Map helper phase strings to short workstatus-like labels. */
export function hudphaselabel(phase: string, detail?: string): string {
  const status = String(phase || '')
  if (status === 'downloading') {
    return 'media fetch'
  }
  if (status === 'extracting') {
    const parts = String(detail || '').split('|')
    const elapsed = parts[0] ? parts[0].trim() : ''
    const step = parts[1] ? parts[1].trim() : ''
    if (elapsed && step) {
      return 'media extract ' + elapsed + ' ' + step
    }
    if (elapsed) {
      return 'media extract ' + elapsed
    }
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
  if (status === 'buffering' || status === 'playing') {
    // A/V is on the TV -- progress bar covers playback; hide phase chrome.
    return ''
  }
  if (status === 'error') {
    return 'media error'
  }
  if (status === 'waiting' || status === 'waiting-for-url') {
    return 'media waiting'
  }
  if (status === 'queue-probe') {
    return 'media request'
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
  if (
    phase === 'downloading' ||
    phase === 'extracting' ||
    phase === 'transcoding' ||
    phase === 'buffering' ||
    phase === 'download-progress' ||
    phase === 'queue-probe'
  ) {
    return YELLOW
  }
  return CYAN
}

/** 0..1 playback fraction, or -1 when unknown / not playing. */
export function readmediaprogress(media: HTMLMediaElement | null): number {
  if (!media) {
    return -1
  }
  const duration = media.duration
  const current = media.currentTime
  if (!Number.isFinite(duration) || duration <= 0) {
    return -1
  }
  if (!Number.isFinite(current) || current < 0) {
    return 0
  }
  return Math.max(0, Math.min(1, current / duration))
}

export function drawplaybackprogress(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  if (!(progress >= 0)) {
    return
  }
  const bary = height - PROGRESS_HEIGHT
  ctx.fillStyle = PROGRESS_TRACK
  ctx.fillRect(0, bary, width, PROGRESS_HEIGHT)
  ctx.fillStyle = PROGRESS_EDGE
  ctx.fillRect(0, bary, width, 1)
  const fillw = Math.floor(width * progress)
  if (fillw > 0) {
    ctx.fillStyle = PROGRESS_FILL
    ctx.fillRect(0, bary + 1, fillw, PROGRESS_HEIGHT - 1)
  }
}

/** Overlay: phase label (prep) and/or thin playback progress at the bottom. */
export function drawhud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state?: MQ_HUD_STATE,
  progress?: number,
  vizlabel?: string,
) {
  const current = state || hudstate
  const phase = current.phase
  const label = hudphaselabel(phase, current.detail)
  const pad = 10
  const lineh = 20
  const metalines = Array.isArray(current.metalines) ? current.metalines : []
  const viz = String(vizlabel || '').trim()
  const toplines: string[] = []
  for (let i = 0; i < metalines.length; i += 1) {
    const line = String(metalines[i] || '').trim()
    if (line) {
      toplines.push(line)
    }
  }
  if (viz) {
    toplines.push('viz ' + viz)
  }
  if (toplines.length) {
    const barh = pad * 2 + lineh * toplines.length
    ctx.fillStyle = BAR_BG
    ctx.fillRect(0, 0, width, barh)
    ctx.font = FONT
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = CYAN
    for (let i = 0; i < toplines.length; i += 1) {
      ctx.fillText(toplines[i], pad, pad + i * lineh)
    }
  }
  if (label) {
    const barh = pad * 2 + lineh
    const bary = height - barh
    ctx.fillStyle = BAR_BG
    ctx.fillRect(0, bary, width, barh)
    ctx.font = FONT
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = labelcolor(phase)
    ctx.fillText(label, pad, bary + pad)
  }
  if (typeof progress === 'number') {
    drawplaybackprogress(ctx, width, height, progress)
  }
}
