/** Ops-style status labels burned into the compositor HUD (ASCII only). */

export type MQ_HUD_STATE = {
  phase: string
  detail: string
  secondary: string
  metalines: string[]
}

// Sizes are integer multiples of the IBM EGA 8x14 cell (14px tall, 8px wide).
const FONT = '28px "IBM EGA 8x14", ui-monospace, "Courier New", monospace'
const FONT_VIZ = '20px "IBM EGA 8x14", ui-monospace, "Courier New", monospace'
const FONT_STATUS =
  '24px "IBM EGA 8x14", ui-monospace, "Courier New", monospace'
const PURPLE = '#ff00aa'
const YELLOW = '#ffff55'
const RED = '#ff5555'
const BAR_BG = 'rgba(0, 0, 0, 0.32)'
const PROGRESS_TRACK = 'rgba(0, 0, 0, 0.82)'
const PROGRESS_FILL = '#ff00aa'
const PROGRESS_HEIGHT = 8
const STATUS_BAR_H = 28

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
  return PURPLE
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
  const fillw = Math.floor(width * progress)
  if (fillw > 0) {
    ctx.fillStyle = PROGRESS_FILL
    ctx.fillRect(0, bary, fillw, PROGRESS_HEIGHT)
  }
}

const MARQUEE_PAD_Y = 8
const MARQUEE_LINE_H = 28
const MARQUEE_VIZ_LINE_H = 20
const MARQUEE_GAP_PX = 64
const MARQUEE_SPEED_PX = 48
const OUTLINE_DIRS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

function drawmarqueeline(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  width: number,
  color: string,
  font: string,
  lineh: number,
) {
  const trimmed = String(text || '').trim()
  if (!trimmed) {
    return
  }
  const rowy = Math.floor(y)
  ctx.font = font
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.imageSmoothingEnabled = false
  // Snap scroll to glyph cells so the bitmap font stays on its pixel grid.
  const cellw = Math.max(1, Math.round(ctx.measureText('M').width))
  const textw = Math.max(cellw, Math.ceil(ctx.measureText(trimmed).width))
  const gap = Math.max(cellw, Math.round(MARQUEE_GAP_PX / cellw) * cellw)
  const vieww = Math.max(1, Math.floor(width))
  const cycle = textw + gap
  const raw = Math.floor((performance.now() / 1000) * MARQUEE_SPEED_PX)
  const offset = Math.floor(raw / cellw) * cellw
  const x0 = -((offset % cycle) + cycle) % cycle
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, rowy, vieww, lineh)
  ctx.clip()
  // Black outline puts glyph edges in luma so WebRTC chroma subsample stays crisp.
  for (let x = x0; x < vieww; x += cycle) {
    const xi = Math.floor(x)
    ctx.fillStyle = '#000000'
    for (let i = 0; i < OUTLINE_DIRS.length; i += 1) {
      const d = OUTLINE_DIRS[i]
      ctx.fillText(trimmed, xi + d[0], rowy + d[1])
    }
    ctx.fillStyle = color
    ctx.fillText(trimmed, xi, rowy)
  }
  ctx.restore()
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
  const metalines = Array.isArray(current.metalines) ? current.metalines : []
  const meta = String(metalines[0] || '').trim()
  const viz = String(vizlabel || '').trim()
  let barh = 0
  if (meta) {
    barh += MARQUEE_LINE_H
  }
  if (viz) {
    barh += MARQUEE_VIZ_LINE_H
  }
  if (barh > 0) {
    barh += MARQUEE_PAD_Y * 2
    ctx.fillStyle = BAR_BG
    ctx.fillRect(0, 0, width, barh)
    let y = MARQUEE_PAD_Y
    if (meta) {
      drawmarqueeline(ctx, meta, y, width, PURPLE, FONT, MARQUEE_LINE_H)
      y += MARQUEE_LINE_H
    }
    if (viz) {
      drawmarqueeline(ctx, viz, y, width, PURPLE, FONT_VIZ, MARQUEE_VIZ_LINE_H)
    }
  }
  if (label) {
    const bary = Math.floor(height - STATUS_BAR_H)
    ctx.fillStyle = BAR_BG
    ctx.fillRect(0, bary, width, STATUS_BAR_H)
    ctx.font = FONT_STATUS
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.imageSmoothingEnabled = false
    const labely = Math.floor(bary + STATUS_BAR_H * 0.5)
    ctx.fillStyle = '#000000'
    for (let i = 0; i < OUTLINE_DIRS.length; i += 1) {
      const d = OUTLINE_DIRS[i]
      ctx.fillText(label, 4 + d[0], labely + d[1])
    }
    ctx.fillStyle = labelcolor(phase)
    ctx.fillText(label, 4, labely)
  }
  if (typeof progress === 'number') {
    drawplaybackprogress(ctx, width, height, progress)
  }
}
