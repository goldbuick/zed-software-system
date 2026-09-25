/** Horizontal 16:9 letterbox + vertical 9:16 crop with drag offset. */

export type MS_COMPOSITOR = {
  hcanvas: HTMLCanvasElement
  vcanvas: HTMLCanvasElement
  cropoffsetx: number
  draw: (source: CanvasImageSource, sw: number, sh: number) => void
  readhrgba: () => ImageData
}

const H_W = 1920
const H_H = 1080
const V_W = 1080
const V_H = 1920

export function createcompositor(
  hcanvas: HTMLCanvasElement,
  vcanvas: HTMLCanvasElement,
): MS_COMPOSITOR {
  hcanvas.width = H_W
  hcanvas.height = H_H
  vcanvas.width = V_W
  vcanvas.height = V_H
  let cropoffsetx = 0.5
  const hctxraw = hcanvas.getContext('2d', { willReadFrequently: true })
  const vctxraw = vcanvas.getContext('2d', { willReadFrequently: true })
  if (!hctxraw || !vctxraw) {
    throw new Error('canvas 2d unavailable')
  }
  const hctx = hctxraw
  const vctx = vctxraw

  function draw(source: CanvasImageSource, sw: number, sh: number) {
    hctx.fillStyle = '#000'
    hctx.fillRect(0, 0, H_W, H_H)
    const scale = Math.min(H_W / sw, H_H / sh)
    const dw = sw * scale
    const dh = sh * scale
    const dx = (H_W - dw) / 2
    const dy = (H_H - dh) / 2
    hctx.drawImage(source, dx, dy, dw, dh)

    const cropw = H_H * (9 / 16)
    const maxx = Math.max(0, H_W - cropw)
    const sx = Math.min(maxx, Math.max(0, cropoffsetx * maxx))
    vctx.fillStyle = '#000'
    vctx.fillRect(0, 0, V_W, V_H)
    vctx.drawImage(hcanvas, sx, 0, cropw, H_H, 0, 0, V_W, V_H)
  }

  return {
    hcanvas,
    vcanvas,
    get cropoffsetx() {
      return cropoffsetx
    },
    set cropoffsetx(value: number) {
      cropoffsetx = Math.min(1, Math.max(0, value))
    },
    draw,
    readhrgba: () => hctx.getImageData(0, 0, H_W, H_H),
  }
}

/** Crop frame width in H canvas pixels. */
export function verticalcropwidth(): number {
  return H_H * (9 / 16)
}

export function hcanvaswidth(): number {
  return H_W
}

export function hcanvasheight(): number {
  return H_H
}
