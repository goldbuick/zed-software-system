/**
 * Board-to-PNG capture.
 * Uses useGadgetClient to get the current board and renders it to a PNG image.
 */
import { layersreadcontrol } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { useMedia } from 'zss/gadget/media'
import { ispresent } from 'zss/mapping/types'

import { rasterizelayerstorgba } from './rasterize'

function sanitizefilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'board'
}

export function capturecurrentboardtopng() {
  const { charsetdata, palettedata } = useMedia.getState()
  const { board, layers = [] } = useGadgetClient.getState().gadget

  if (!ispresent(charsetdata) || !ispresent(palettedata)) {
    throw new Error('charsetdata or palettedata not loaded')
  }

  const { width, height } = layersreadcontrol(layers)
  if (width === 0 || height === 0) {
    throw new Error('No tile layers to capture')
  }

  const charsetcanvas = charsetdata.image as HTMLCanvasElement
  const charsetctx = charsetcanvas.getContext('2d')
  if (!charsetctx) {
    throw new Error('Could not get charset canvas context')
  }

  const charsetimagedata = charsetctx.getImageData(
    0,
    0,
    charsetcanvas.width,
    charsetcanvas.height,
  )
  const charsetbits = new Uint8Array(charsetimagedata.data.length / 4)
  for (let i = 0; i < charsetbits.length; i++) {
    charsetbits[i] = charsetimagedata.data[i * 4]
  }
  const charset = {
    width: charsetcanvas.width,
    height: charsetcanvas.height,
    size: charsetbits.length,
    bits: charsetbits,
  }

  const {
    width: canvaswidth,
    height: canvasheight,
    rgba,
  } = rasterizelayerstorgba(layers, charset, palettedata)

  const canvas = document.createElement('canvas')
  canvas.width = canvaswidth
  canvas.height = canvasheight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas 2d context')
  }

  const outimagedata = new ImageData(
    new Uint8ClampedArray(rgba),
    canvaswidth,
    canvasheight,
  )
  ctx.putImageData(outimagedata, 0, 0)
  const dataurl = canvas.toDataURL('image/png')
  const filename = `${sanitizefilename(board)}.png`
  const a = document.createElement('a')
  a.href = dataurl
  a.download = filename
  a.click()
}
