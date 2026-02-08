/**
 * Board-to-PNG capture.
 * Uses useGadgetClient to get the current board and renders it to a PNG image.
 */
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import {
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  type LAYER,
  type LAYER_TILES,
  LAYER_TYPE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { useMedia } from '../hooks'

function isTilesLayer(l: LAYER): l is LAYER_TILES {
  return l.type === LAYER_TYPE.TILES
}

function compositeTiles(
  under: LAYER[],
  layers: LAYER[],
  over: LAYER[],
  width: number,
  height: number,
) {
  const size = width * height
  const char: number[] = new Array(size).fill(0)
  const color: number[] = new Array(size).fill(0)
  const bg: number[] = new Array(size).fill(COLOR.ONCLEAR as number)

  const all = [...under, ...layers, ...over].filter(isTilesLayer).reverse()
  for (let i = 0; i < size; i++) {
    const tx = i % width
    const ty = Math.floor(i / width)
    for (let li = 0; li < all.length; li++) {
      const layer = all[li]
      if (tx >= layer.width || ty >= layer.height) continue
      const ci = tx + ty * layer.width
      const c = layer.char[ci] ?? 0
      const co = layer.color[ci] ?? 0
      const b = layer.bg[ci] ?? (COLOR.ONCLEAR as number)
      if (c !== 0 || b < (COLOR.ONCLEAR as number)) {
        char[i] = c
        color[i] = co
        bg[i] = b
        break
      }
    }
  }
  return { char, color, bg }
}

export function capturecurrentboardtopng(): string {
  const { charsetdata, palettedata } = useMedia.getState()
  const {
    under = [],
    layers = [],
    over = [],
  } = useGadgetClient.getState().gadget

  if (!ispresent(charsetdata) || !ispresent(palettedata)) {
    throw new Error('charsetdata or palettedata not loaded')
  }

  const { width, height } = layersreadcontrol([...under, ...layers, ...over])
  if (width === 0 || height === 0) {
    throw new Error('No tile layers to capture')
  }

  const { char, color, bg } = compositeTiles(under, layers, over, width, height)

  const cellW = RUNTIME.DRAW_CHAR_WIDTH()
  const cellH = RUNTIME.DRAW_CHAR_HEIGHT()
  const canvas = document.createElement('canvas')
  canvas.width = width * cellW
  canvas.height = height * cellH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas 2d context')

  const charsetCanvas = charsetdata.image as HTMLCanvasElement
  const charsetCtx = charsetCanvas.getContext('2d')
  if (!charsetCtx) throw new Error('Could not get charset canvas context')
  const charsetImageData = charsetCtx.getImageData(
    0,
    0,
    charsetCanvas.width,
    charsetCanvas.height,
  )
  const charsetData = charsetImageData.data

  const outImageData = ctx.createImageData(canvas.width, canvas.height)
  const out = outImageData.data

  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const i = tx + ty * width
      const charIdx = char[i] ?? 0
      const colorIdx = color[i] ?? 0
      const bgIdx = bg[i] ?? (COLOR.ONCLEAR as number)

      const charCol = charIdx % CHARS_PER_ROW
      const charRow = Math.floor(charIdx / CHARS_PER_ROW)
      const srcX0 = charCol * CHAR_WIDTH
      const srcY0 = charRow * CHAR_HEIGHT

      const fgIdx = colorIdx > 31 ? (colorIdx - 33) % 16 : colorIdx % 16
      const bgPalIdx = bgIdx < (COLOR.ONCLEAR as number) ? bgIdx - 16 : -1
      const fg = palettedata[fgIdx]
      const bgColor = bgPalIdx >= 0 ? palettedata[bgPalIdx] : null

      for (let py = 0; py < cellH; py++) {
        for (let px = 0; px < cellW; px++) {
          const srcX = srcX0 + Math.floor(px / RUNTIME.DRAW_CHAR_SCALE)
          const srcY = srcY0 + Math.floor(py / RUNTIME.DRAW_CHAR_SCALE)
          const srcI = (srcX + srcY * charsetCanvas.width) * 4
          const gray = charsetData[srcI]

          const outX = tx * cellW + px
          const outY = ty * cellH + py
          const outI = (outX + outY * canvas.width) * 4

          if (gray === 0) {
            if (bgColor) {
              out[outI] = Math.round(bgColor.r * 255)
              out[outI + 1] = Math.round(bgColor.g * 255)
              out[outI + 2] = Math.round(bgColor.b * 255)
            }
            out[outI + 3] = bgColor ? 255 : 0
          } else {
            out[outI] = Math.round(fg.r * 255)
            out[outI + 1] = Math.round(fg.g * 255)
            out[outI + 2] = Math.round(fg.b * 255)
            out[outI + 3] = 255
          }
        }
      }
    }
  }

  ctx.putImageData(outImageData, 0, 0)
  return canvas.toDataURL('image/png')
}
