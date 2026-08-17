import { drawhud, readhudstate } from './statushud'

export type MQ_COMPOSITOR_MODE = 'placard' | 'video' | 'audio'

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360
const CAPTURE_FPS = 30
const BG = '#0a0a12'

let canvasel: HTMLCanvasElement | null = null
let canvascapture: MediaStream | null = null
let outstream: MediaStream | null = null
let animframe: number | null = null
let mode: MQ_COMPOSITOR_MODE = 'placard'
let videosource: HTMLVideoElement | null = null
let visualizersource: HTMLCanvasElement | null = null
let active = false

function ensurecanvas(): HTMLCanvasElement {
  if (canvasel) {
    return canvasel
  }
  canvasel = document.createElement('canvas')
  canvasel.width = CANVAS_WIDTH
  canvasel.height = CANVAS_HEIGHT
  canvasel.style.position = 'fixed'
  canvasel.style.left = '0'
  canvasel.style.top = '0'
  canvasel.style.width = '320px'
  canvasel.style.height = '180px'
  canvasel.style.opacity = '0'
  canvasel.style.pointerEvents = 'none'
  canvasel.style.zIndex = '-1'
  document.body.appendChild(canvasel)
  return canvasel
}

function drawcontain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
) {
  if (sw <= 0 || sh <= 0) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    return
  }
  const scale = Math.min(CANVAS_WIDTH / sw, CANVAS_HEIGHT / sh)
  const dw = sw * scale
  const dh = sh * scale
  const dx = (CANVAS_WIDTH - dw) / 2
  const dy = (CANVAS_HEIGHT - dh) / 2
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  ctx.drawImage(source, dx, dy, dw, dh)
}

function drawframe() {
  if (!active || !canvasel) {
    return
  }
  const ctx = canvasel.getContext('2d')
  if (!ctx) {
    return
  }
  if (mode === 'video' && videosource) {
    const vw = videosource.videoWidth || 0
    const vh = videosource.videoHeight || 0
    drawcontain(ctx, videosource, vw, vh)
  } else if (mode === 'audio' && visualizersource) {
    ctx.drawImage(visualizersource, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  } else {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }
  drawhud(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, readhudstate())
  animframe = window.requestAnimationFrame(drawframe)
}

function startloop() {
  if (active) {
    return
  }
  active = true
  drawframe()
}

function stoploop() {
  active = false
  if (animframe) {
    window.cancelAnimationFrame(animframe)
    animframe = null
  }
}

function clearaudiotracks() {
  if (!outstream) {
    return
  }
  const tracks = outstream.getAudioTracks()
  for (let i = 0; i < tracks.length; i += 1) {
    outstream.removeTrack(tracks[i])
  }
}

export function ensurecompositor(): MediaStream {
  const canvas = ensurecanvas()
  if (!canvascapture) {
    canvascapture = canvas.captureStream(CAPTURE_FPS)
  }
  if (!outstream) {
    outstream = new MediaStream()
    const videotracks = canvascapture.getVideoTracks()
    for (let i = 0; i < videotracks.length; i += 1) {
      outstream.addTrack(videotracks[i])
    }
  }
  startloop()
  return outstream
}

export function getcompositorstream(): MediaStream | null {
  return outstream
}

export function setcompositormode(next: MQ_COMPOSITOR_MODE) {
  mode = next
  ensurecompositor()
}

export function setvideosource(el: HTMLVideoElement | null) {
  videosource = el
  if (el) {
    mode = 'video'
    visualizersource = null
  } else if (mode === 'video') {
    mode = 'placard'
  }
  ensurecompositor()
}

export function setvisualizersource(canvas: HTMLCanvasElement | null) {
  visualizersource = canvas
  if (canvas) {
    mode = 'audio'
    videosource = null
  } else if (mode === 'audio') {
    mode = 'placard'
  }
  ensurecompositor()
}

export function setcompositoraudio(stream: MediaStream | null) {
  ensurecompositor()
  clearaudiotracks()
  if (!stream || !outstream) {
    return
  }
  const tracks = stream.getAudioTracks()
  for (let i = 0; i < tracks.length; i += 1) {
    outstream.addTrack(tracks[i])
  }
}

export function clearcompositorplayback() {
  videosource = null
  visualizersource = null
  mode = 'placard'
  clearaudiotracks()
  ensurecompositor()
}

export function stopcompositor() {
  stoploop()
  clearaudiotracks()
  videosource = null
  visualizersource = null
  mode = 'placard'
  if (canvascapture) {
    const tracks = canvascapture.getTracks()
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].stop()
    }
    canvascapture = null
  }
  if (outstream) {
    const tracks = outstream.getTracks()
    for (let i = 0; i < tracks.length; i += 1) {
      try {
        outstream.removeTrack(tracks[i])
      } catch (_) {}
    }
    outstream = null
  }
  if (canvasel) {
    canvasel.remove()
    canvasel = null
  }
}
