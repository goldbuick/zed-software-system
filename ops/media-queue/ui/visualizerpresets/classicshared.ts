import { MQ_CANVAS_HEIGHT, MQ_CANVAS_WIDTH } from '../tvcanvas'

export const CLASSIC_BG = '#0a0a12'
export const CLASSIC_GREEN = '#00ff41'
export const CLASSIC_CYAN = '#00e5ff'
export const CLASSIC_MAGENTA = '#ff00aa'
/** Cover art alpha when drawn on top of a full-opacity viz. */
export const CLASSIC_ARTWORK_OVERLAY_ALPHA = 0.67
export const CLASSIC_BAR_COUNT = 48

/** Cover-fit artwork as a semi-transparent overlay (viz stays opaque underneath). */
export function drawartwork(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (iw <= 0 || ih <= 0) {
    return
  }
  const scale = Math.max(MQ_CANVAS_WIDTH / iw, MQ_CANVAS_HEIGHT / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (MQ_CANVAS_WIDTH - dw) / 2
  const dy = (MQ_CANVAS_HEIGHT - dh) / 2
  ctx.save()
  ctx.globalCompositeOperation = 'hard-light'
  ctx.globalAlpha = CLASSIC_ARTWORK_OVERLAY_ALPHA
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()
}

export function drawscanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255,255,255,0.02)'
  for (let y = 0; y < MQ_CANVAS_HEIGHT; y += 3) {
    ctx.fillRect(0, y, MQ_CANVAS_WIDTH, 1)
  }
}

export function drawmirroredbars(
  ctx: CanvasRenderingContext2D,
  analysernode: AnalyserNode,
  freqdata: Uint8Array<ArrayBuffer>,
  peaks: number[],
  decay: number[],
  layout: { top: number; bottom: number },
) {
  analysernode.getByteFrequencyData(freqdata)
  const barcount = CLASSIC_BAR_COUNT
  const step = Math.floor(freqdata.length / barcount)
  const top = layout.top
  const bottom = layout.bottom
  const maxh = bottom - top
  const center = MQ_CANVAS_WIDTH / 2
  const barw = Math.max(3, Math.floor((center - 24) / barcount) - 1)

  for (let i = 0; i < barcount; i += 1) {
    let sum = 0
    const start = i * step
    for (let j = 0; j < step; j += 1) {
      sum += freqdata[start + j] || 0
    }
    const avg = sum / step / 255
    const h = Math.max(2, Math.floor(avg * maxh))
    if (h > peaks[i]) {
      peaks[i] = h
      decay[i] = 1
    } else {
      decay[i] = Math.max(0, decay[i] - 0.04)
      peaks[i] = Math.max(h, peaks[i] - 2 * decay[i])
    }

    const leftx = center - 16 - (i + 1) * (barw + 1)
    const rightx = center + 16 + i * (barw + 1)
    ctx.fillStyle = CLASSIC_GREEN
    ctx.fillRect(leftx, bottom - h, barw, h)
    ctx.fillStyle = CLASSIC_CYAN
    ctx.fillRect(rightx, bottom - h, barw, h)
    if (peaks[i] > h + 2) {
      ctx.fillStyle = CLASSIC_MAGENTA
      ctx.fillRect(leftx, bottom - peaks[i], barw, 2)
      ctx.fillRect(rightx, bottom - peaks[i], barw, 2)
    }
  }
}

export function drawscopeline(
  ctx: CanvasRenderingContext2D,
  analysernode: AnalyserNode,
  timedata: Uint8Array<ArrayBuffer>,
  layout: { top: number; height: number; lineWidth: number },
) {
  analysernode.getByteTimeDomainData(timedata)
  const top = layout.top
  const height = layout.height
  const mid = top + height / 2
  ctx.strokeStyle = CLASSIC_GREEN
  ctx.lineWidth = layout.lineWidth
  ctx.beginPath()
  for (let i = 0; i < timedata.length; i += 1) {
    const x = (i / (timedata.length - 1)) * (MQ_CANVAS_WIDTH - 24) + 12
    const v = (timedata[i] - 128) / 128
    const y = mid + v * (height * 0.42)
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
  ctx.strokeStyle = CLASSIC_CYAN
  ctx.globalAlpha = 0.35
  ctx.stroke()
  ctx.globalAlpha = 1
}
