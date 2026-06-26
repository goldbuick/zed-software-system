import { RUNTIME } from 'zss/config'
import { loadcharsetfrombytes, loadpalettefrombytes } from 'zss/feature/bytes'
import { CHARSET } from 'zss/feature/charset'
import { PALETTE } from 'zss/feature/palette'
import type { BITMAP } from 'zss/gadget/data/bitmap'
import type { PALETTE_RGB } from 'zss/gadget/data/palette'
import { convertpalettetocolors } from 'zss/gadget/data/palette'
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
import { COLOR } from 'zss/words/types'

export type RASTERIZE_RESULT = {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

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
      if (tx >= layer.width || ty >= layer.height) {
        continue
      }
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
        if (s.pid) {
          continue
        }
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

function rasterizeglyph(
  out: Uint8ClampedArray,
  canvaswidth: number,
  tx: number,
  ty: number,
  charidx: number,
  coloridx: number,
  bgidx: number,
  charset: BITMAP,
  palettedata: PALETTE_RGB[],
  cellw: number,
  cellh: number,
) {
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
      const srci = srcx + srcy * charset.width
      const gray = charset.bits[srci] ?? 0

      const outx = tx * cellw + px
      const outy = ty * cellh + py
      const outi = (outx + outy * canvaswidth) * 4

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

export function rasterizelayerstorgba(
  layers: LAYER[],
  charset: BITMAP,
  palettedata: PALETTE_RGB[],
): RASTERIZE_RESULT {
  const { width, height } = layersreadcontrol(layers)
  if (width === 0 || height === 0) {
    throw new Error('No tile layers to rasterize')
  }

  const tiles = compositetiles(layers, width, height)
  const sprites = collectsprites(layers)

  const cellw = RUNTIME.DRAW_CHAR_WIDTH()
  const cellh = RUNTIME.DRAW_CHAR_HEIGHT()
  const canvaswidth = width * cellw
  const canvasheight = height * cellh

  const out = new Uint8ClampedArray(canvaswidth * canvasheight * 4)

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
      rasterizeglyph(
        out,
        canvaswidth,
        tx,
        ty,
        tiles.char[i] ?? 1,
        tiles.color[i] ?? 0,
        tiles.bg[i] ?? 0,
        charset,
        palettedata,
        cellw,
        cellh,
      )
    }
  }

  for (let si = 0; si < sprites.length; si++) {
    const s = sprites[si]
    const tx = Math.floor(s.x)
    const ty = Math.floor(s.y)
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) {
      continue
    }
    rasterizeglyph(
      out,
      canvaswidth,
      tx,
      ty,
      s.char,
      s.color,
      s.bg,
      charset,
      palettedata,
      cellw,
      cellh,
    )
  }

  return { width: canvaswidth, height: canvasheight, rgba: out }
}

let defaultcharset: BITMAP | undefined
let defaultpalette: PALETTE_RGB[] | undefined

export function defaultcapturemedia(): {
  charset: BITMAP
  palette: PALETTE_RGB[]
} {
  if (!defaultcharset) {
    const loaded = loadcharsetfrombytes(CHARSET)
    if (!loaded) {
      throw new Error('failed to load default charset')
    }
    defaultcharset = loaded
  }
  if (!defaultpalette) {
    const loaded = loadpalettefrombytes(PALETTE)
    if (!loaded) {
      throw new Error('failed to load default palette')
    }
    defaultpalette = convertpalettetocolors(loaded)
  }
  return { charset: defaultcharset, palette: defaultpalette }
}
