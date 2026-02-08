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
  type LAYER_SPRITES,
  type LAYER_TILES,
  LAYER_TYPE,
  layersreadcontrol,
} from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { useMedia } from '../hooks'

function istileslayer(l: LAYER): l is LAYER_TILES {
  return l.type === LAYER_TYPE.TILES
}

function isspriteslayer(l: LAYER): l is LAYER_SPRITES {
  return l.type === LAYER_TYPE.SPRITES
}

function mapcoloridx(color: number): number {
  const clear = COLOR.ONCLEAR as number
  if (color <= clear) {
    return color
  }
  return color - clear
}

function compositetiles(layers: LAYER[], width: number, height: number) {
  const size = width * height
  const char: number[] = new Array(size).fill(0)
  const color: number[] = new Array(size).fill(0)
  const bg: number[] = new Array(size).fill(COLOR.ONCLEAR as number)

  const all = [...layers].filter(istileslayer).reverse()
  for (let i = 0; i < size; i++) {
    const tx = i % width
    const ty = Math.floor(i / width)
    for (let li = 0; li < all.length; li++) {
      const layer = all[li]
      if (tx >= layer.width || ty >= layer.height) continue
      const ci = tx + ty * layer.width
      const chr = layer.char[ci] ?? 0
      const fgidx = mapcoloridx(layer.color[ci] ?? 0)
      const bgidx = mapcoloridx(layer.bg[ci] ?? 0)
      if (chr !== 0 || bgidx !== 0) {
        char[i] = chr
        color[i] = fgidx
        bg[i] = bgidx
        break
      }
    }
  }
  return { char, color, bg }
}

function collectsprites(layers: LAYER[]) {
  const sprites: {
    x: number
    y: number
    char: number
    color: number
    bg: number
  }[] = []
  for (const layer of layers) {
    if (isspriteslayer(layer)) {
      for (const s of layer.sprites) {
        if (s.pid) continue
        sprites.push({
          x: s.x,
          y: s.y,
          char: s.char,
          color: mapcoloridx(s.color),
          bg: mapcoloridx(s.bg),
        })
      }
    }
  }
  return sprites
}

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

  const tiles = compositetiles(layers, width, height)
  const sprites = collectsprites(layers)

  const cellw = RUNTIME.DRAW_CHAR_WIDTH()
  const cellh = RUNTIME.DRAW_CHAR_HEIGHT()

  const canvas = document.createElement('canvas')
  canvas.width = width * cellw
  canvas.height = height * cellh

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas 2d context')
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
  const charsetpixels = charsetimagedata.data

  const outimagedata = ctx.createImageData(canvas.width, canvas.height)
  const out = outimagedata.data

  // Fill with default bg (black) so ONCLEAR cells have a solid background
  const defaultbg = palettedata[0]
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.round(defaultbg.r * 255)
    out[i + 1] = Math.round(defaultbg.g * 255)
    out[i + 2] = Math.round(defaultbg.b * 255)
    out[i + 3] = 255
  }

  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const i = tx + ty * width
      const charidx = tiles.char[i] ?? 1
      const coloridx = tiles.color[i] ?? 0
      const bgidx = tiles.bg[i] ?? 0

      const charcol = charidx % CHARS_PER_ROW
      const charrow = Math.floor(charidx / CHARS_PER_ROW)
      const srcx0 = charcol * CHAR_WIDTH
      const srcy0 = charrow * CHAR_HEIGHT

      const fgcolor = palettedata[coloridx]
      const bgcolor = palettedata[bgidx]

      for (let py = 0; py < cellh; py++) {
        for (let px = 0; px < cellw; px++) {
          const srcx = srcx0 + Math.floor(px / RUNTIME.DRAW_CHAR_SCALE)
          const srcy = srcy0 + Math.floor(py / RUNTIME.DRAW_CHAR_SCALE)
          const srci = (srcx + srcy * charsetcanvas.width) * 4
          const gray = charsetpixels[srci]

          const outx = tx * cellw + px
          const outy = ty * cellh + py
          const outi = (outx + outy * canvas.width) * 4

          if (gray === 0) {
            if (bgcolor) {
              out[outi] = Math.round(bgcolor.r * 255)
              out[outi + 1] = Math.round(bgcolor.g * 255)
              out[outi + 2] = Math.round(bgcolor.b * 255)
            }
          } else {
            out[outi] = Math.round(fgcolor.r * 255)
            out[outi + 1] = Math.round(fgcolor.g * 255)
            out[outi + 2] = Math.round(fgcolor.b * 255)
          }
          out[outi + 3] = 255
        }
      }
    }
  }

  for (const s of sprites) {
    const tx = Math.floor(s.x)
    const ty = Math.floor(s.y)
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue

    const charcol = s.char % CHARS_PER_ROW
    const charrow = Math.floor(s.char / CHARS_PER_ROW)
    const srcx0 = charcol * CHAR_WIDTH
    const srcy0 = charrow * CHAR_HEIGHT

    const fgcolor = palettedata[s.color]
    const bgcolor = palettedata[s.bg]

    for (let py = 0; py < cellh; py++) {
      for (let px = 0; px < cellw; px++) {
        const srcx = srcx0 + Math.floor(px / RUNTIME.DRAW_CHAR_SCALE)
        const srcy = srcy0 + Math.floor(py / RUNTIME.DRAW_CHAR_SCALE)
        const srci = (srcx + srcy * charsetcanvas.width) * 4
        const gray = charsetpixels[srci]

        const outx = tx * cellw + px
        const outy = ty * cellh + py
        const outi = (outx + outy * canvas.width) * 4

        if (gray === 0) {
          if (bgcolor) {
            out[outi] = Math.round(bgcolor.r * 255)
            out[outi + 1] = Math.round(bgcolor.g * 255)
            out[outi + 2] = Math.round(bgcolor.b * 255)
          }
        } else {
          out[outi] = Math.round(fgcolor.r * 255)
          out[outi + 1] = Math.round(fgcolor.g * 255)
          out[outi + 2] = Math.round(fgcolor.b * 255)
        }
        out[outi + 3] = 255
      }
    }
  }

  ctx.putImageData(outimagedata, 0, 0)
  const dataurl = canvas.toDataURL('image/png')
  const filename = `${sanitizefilename(board)}.png`
  const a = document.createElement('a')
  a.href = dataurl
  a.download = filename
  a.click()
}
